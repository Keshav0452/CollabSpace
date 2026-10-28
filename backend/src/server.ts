import app from "./app.js";
import { pool } from "./config/database.js";
import {
  connectRedis,
  disconnectRedis,
} from "./config/redis.js";
import {
  startOutboxWorker,
  stopOutboxWorker,
} from "./modules/outbox/outbox.worker.js";
import {
  closeWebSocketGateway,
  initializeWebSocketGateway,
} from "./modules/realtime/websocket.gateway.js";
import {
  startRealtimeSubscriber,
  stopRealtimeSubscriber,
} from "./modules/realtime/realtime.subscriber.js";

const PORT = Number(process.env.PORT ?? 3000);
const SHUTDOWN_TIMEOUT_MS = 10_000;

let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    // 1. Verify PostgreSQL.
    await pool.query("SELECT 1");
    console.log("Database connection successful.");

    // 2. Connect the main Redis client.
    await connectRedis();
    console.log("Redis connection successful.");

    // 3. Start the HTTP server.
    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error);
      process.exitCode = 1;
      void shutdown(server);
    });

    // 4. Attach the WebSocket Gateway.
    initializeWebSocketGateway(server);

    // 5. Subscribe to Redis events.
    await startRealtimeSubscriber();

    // 6. Start processing PostgreSQL Outbox events.
    startOutboxWorker();

    // 7. Register graceful shutdown handlers.
    process.once("SIGINT", () => {
      console.log("\nReceived SIGINT.");
      void shutdown(server);
    });

    process.once("SIGTERM", () => {
      console.log("\nReceived SIGTERM.");
      void shutdown(server);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exitCode = 1;

    try {
      await stopOutboxWorker();
    } catch (shutdownError) {
      console.error("Failed to stop the Outbox Worker:", shutdownError);
    }

    try {
      await stopRealtimeSubscriber();
    } catch (shutdownError) {
      console.error("Failed to stop the Redis subscriber:", shutdownError);
    }

    try {
      await closeWebSocketGateway();
    } catch (shutdownError) {
      console.error("Failed to close the WebSocket Gateway:", shutdownError);
    }

    try {
      await disconnectRedis();
    } catch (shutdownError) {
      console.error("Failed to close the main Redis connection:", shutdownError);
    }

    try {
      await pool.end();
    } catch (shutdownError) {
      console.error("Failed to close the database pool:", shutdownError);
    }
  }
}

async function shutdown(
  server: ReturnType<typeof app.listen>,
): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log("Starting graceful shutdown...");

  const timeout = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  timeout.unref();

  try {
    const httpServerClosed = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    await stopOutboxWorker();
    await stopRealtimeSubscriber();
    await closeWebSocketGateway();

    await httpServerClosed;

    await disconnectRedis();
    await pool.end();

    console.log("Graceful shutdown completed.");
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}

void startServer();