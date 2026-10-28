import type { Server } from "node:http";
import {
  WebSocket,
  WebSocketServer,
  type RawData,
} from "ws";
import { verifyAccessToken } from "../../utils/token.js";

interface ConnectedClient {
  socket: WebSocket;
  userId: string | null;
  isAlive: boolean;
  authenticationTimer: ReturnType<typeof setTimeout>;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const AUTHENTICATION_TIMEOUT_MS = 5_000;
const MAX_MESSAGE_SIZE = 16 * 1024;

const clients = new Map<WebSocket, ConnectedClient>();

let webSocketServer: WebSocketServer | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

export function initializeWebSocketGateway(
  httpServer: Server,
): void {
  if (webSocketServer) {
    throw new Error("WebSocket Gateway is already initialized.");
  }

  webSocketServer = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    maxPayload: MAX_MESSAGE_SIZE,
  });

  webSocketServer.on("connection", (socket) => {
    const authenticationTimer = setTimeout(() => {
      const client = clients.get(socket);

      if (client && client.userId === null) {
        socket.close(1008, "Authentication required");
      }
    }, AUTHENTICATION_TIMEOUT_MS);

    const client: ConnectedClient = {
      socket,
      userId: null,
      isAlive: true,
      authenticationTimer,
    };

    clients.set(socket, client);

    console.log("[WebSocket] New connection awaiting authentication.");

    socket.on("pong", () => {
      client.isAlive = true;
    });

    socket.on("message", (data: RawData) => {
      void handleClientMessage(client, data);
    });

    socket.on("close", () => {
      clearTimeout(client.authenticationTimer);
      clients.delete(socket);

      console.log("[WebSocket] Connection closed.");
    });

    socket.on("error", (error) => {
      console.error("[WebSocket] Client connection error:", error);
    });
  });

  webSocketServer.on("error", (error) => {
    console.error("[WebSocket] Server error:", error);
  });

  heartbeatTimer = setInterval(() => {
    for (const client of clients.values()) {
      if (client.socket.readyState !== WebSocket.OPEN) {
        continue;
      }

      if (!client.isAlive) {
        client.socket.terminate();
        continue;
      }

      client.isAlive = false;
      client.socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  heartbeatTimer.unref();

  console.log("[WebSocket] Gateway initialized on path /ws.");
}

async function handleClientMessage(
  client: ConnectedClient,
  data: RawData,
): Promise<void> {
  const { socket } = client;

  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  let message: unknown;

  try {
    message = JSON.parse(data.toString());
  } catch {
    socket.close(1008, "Invalid JSON message");
    return;
  }

  if (
    typeof message !== "object" ||
    message === null ||
    !("type" in message) ||
    typeof message.type !== "string"
  ) {
    socket.close(1008, "Invalid message format");
    return;
  }

  if (client.userId === null) {
    if (
      message.type !== "auth" ||
      !("accessToken" in message) ||
      typeof message.accessToken !== "string" ||
      message.accessToken.length === 0
    ) {
      socket.close(1008, "Authentication required");
      return;
    }

    try {
      const { userId } = await verifyAccessToken(message.accessToken);

      // The connection might have closed while token verification was running.
      if (
        socket.readyState !== WebSocket.OPEN ||
        clients.get(socket) !== client
      ) {
        return;
      }

      client.userId = userId;
      clearTimeout(client.authenticationTimer);

      socket.send(
        JSON.stringify({
          type: "auth.success",
          userId,
        }),
      );

      console.log("[WebSocket] Client authenticated:", userId);
    } catch {
      socket.close(1008, "Invalid or expired access token");
    }

    return;
  }

  // Until we implement specific client commands, accept no other messages.
  socket.send(
    JSON.stringify({
      type: "error",
      message: "Unsupported message type",
    }),
  );
}

export function broadcastWebSocketMessage(
  message: Record<string, unknown>,
): void {
  if (!webSocketServer) {
    throw new Error("WebSocket Gateway has not been initialized.");
  }

  const serializedMessage = JSON.stringify(message);

  for (const client of clients.values()) {
    // Never send application events to unauthenticated connections.
    if (
      client.userId === null ||
      client.socket.readyState !== WebSocket.OPEN
    ) {
      continue;
    }

    client.socket.send(serializedMessage, (error) => {
      if (error) {
        console.error(
          "[WebSocket] Failed to send broadcast message:",
          error,
        );
      }
    });
  }
}

export function sendWebSocketMessageToUser(
  userId: string,
  message: Record<string, unknown>,
): void {
  if (!webSocketServer) {
    throw new Error("WebSocket Gateway has not been initialized.");
  }

  const serializedMessage = JSON.stringify(message);

  for (const client of clients.values()) {
    // Deliver only to authenticated connections belonging to this user.
    if (
      client.userId !== userId ||
      client.socket.readyState !== WebSocket.OPEN
    ) {
      continue;
    }

    client.socket.send(serializedMessage, (error) => {
      if (error) {
        console.error(
          "[WebSocket] Failed to send message to user:",
          userId,
          error,
        );
      }
    });
  }
}

export async function closeWebSocketGateway(): Promise<void> {
  if (!webSocketServer) {
    return;
  }

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }

  const serverToClose = webSocketServer;
  webSocketServer = undefined;

  for (const client of clients.values()) {
    clearTimeout(client.authenticationTimer);
    client.socket.close(1001, "Server shutting down");
  }

  clients.clear();

  await new Promise<void>((resolve, reject) => {
    serverToClose.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  console.log("[WebSocket] Gateway closed.");
}