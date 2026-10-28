import "dotenv/config";
import { createClient } from "redis";
import { sendWebSocketMessageToUser } from "./websocket.gateway.js";
import { OUTBOX_REDIS_CHANNEL } from "../outbox/outbox.publisher.js";
import { findWorkspaceMember } from "../workspaces/workspace.repository.js";

const redisSubscriber = createClient({
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
});

const ALLOWED_EVENT_TYPES = new Set([
  "task.assigned",
  "task.status_changed",
  "task.commented",
]);

let isConnecting = false;

redisSubscriber.on("error", (error) => {
  console.error("[Realtime] Redis subscriber error:", error);
});

redisSubscriber.on("reconnecting", () => {
  console.log("[Realtime] Redis subscriber reconnecting...");
});

interface RealtimeOutboxEvent {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  publishedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseRealtimeEvent(message: string): RealtimeOutboxEvent | null {
  try {
    const parsed: unknown = JSON.parse(message);

    if (!isRecord(parsed)) {
      return null;
    }

    if (
      typeof parsed.eventId !== "string" ||
      parsed.eventId.length === 0 ||
      typeof parsed.eventType !== "string" ||
      !ALLOWED_EVENT_TYPES.has(parsed.eventType) ||
      !isRecord(parsed.payload)
    ) {
      return null;
    }

    if (
      typeof parsed.payload.recipientId !== "string" ||
      parsed.payload.recipientId.length === 0 ||
      typeof parsed.payload.workspaceId !== "string" ||
      parsed.payload.workspaceId.length === 0
    ) {
      return null;
    }

    return {
      eventId: parsed.eventId,
      eventType: parsed.eventType,
      payload: parsed.payload,
      ...(typeof parsed.publishedAt === "string"
        ? { publishedAt: parsed.publishedAt }
        : {}),
    };
  } catch {
    return null;
  }
}

async function handleRedisMessage(message: string): Promise<void> {
  const event = parseRealtimeEvent(message);

  if (!event) {
    console.error("[Realtime] Ignoring invalid or unsupported event.");
    return;
  }

  const recipientId = event.payload.recipientId as string;
  const workspaceId = event.payload.workspaceId as string;

  try {
    // Do not deliver workspace events to users who are no longer members.
    const membership = await findWorkspaceMember(
      workspaceId,
      recipientId,
    );

    if (!membership) {
      console.log(
        "[Realtime] Skipping event: recipient is no longer a workspace member.",
        {
          eventId: event.eventId,
          recipientId,
          workspaceId,
        },
      );
      return;
    }

    // Send only to WebSocket connections authenticated as this recipient.
    sendWebSocketMessageToUser(recipientId, {
      type: "outbox.event",
      event,
    });

    console.log("[Realtime] Event delivered to intended recipient:", {
      eventId: event.eventId,
      eventType: event.eventType,
      recipientId,
      workspaceId,
    });
  } catch (error) {
    console.error(
      "[Realtime] Failed to process event:",
      event.eventId,
      error,
    );
  }
}

export async function startRealtimeSubscriber(): Promise<void> {
  if (redisSubscriber.isOpen || isConnecting) {
    return;
  }

  isConnecting = true;

  try {
    await redisSubscriber.connect();

    await redisSubscriber.subscribe(
      OUTBOX_REDIS_CHANNEL,
      (message) => {
        void handleRedisMessage(message);
      },
    );

    console.log(
      `[Realtime] Subscribed to Redis channel: ${OUTBOX_REDIS_CHANNEL}`,
    );
  } catch (error) {
    if (redisSubscriber.isOpen) {
      await redisSubscriber.close();
    }

    throw error;
  } finally {
    isConnecting = false;
  }
}

export async function stopRealtimeSubscriber(): Promise<void> {
  if (!redisSubscriber.isOpen) {
    return;
  }

  await redisSubscriber.close();

  console.log("[Realtime] Redis subscriber stopped.");
}
