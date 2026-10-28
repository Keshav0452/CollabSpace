
import app from "./app.js";
import { pool } from "./config/database.js";
import {
  startOutboxWorker,
  stopOutboxWorker,
} from "./modules/outbox/outbox.worker.js";

const PORT = Number(process.env.PORT ?? 3000);
const SHUTDOWN_TIMEOUT_MS = 10_000;

let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    // Verify the database connection before starting the server.
    await pool.query("SELECT 1");

    console.log("Database connection successful.");

    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);

      startOutboxWorker();
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error);
      process.exitCode = 1;
      void shutdown(server);
    });

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

    try {
      await pool.end();
    } catch (shutdownError) {
      console.error("Failed to close the database pool:", shutdownError);
    }

    process.exitCode = 1;
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

  // Allow the process to exit naturally if shutdown finishes.
  timeout.unref();

  try {
    // Stop accepting new HTTP connections.
    const httpServerClosed = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Stop future polling and wait for the current worker batch.
    await stopOutboxWorker();

    // Wait for HTTP connections to finish closing.
    await httpServerClosed;

    // Close PostgreSQL connections last.
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
