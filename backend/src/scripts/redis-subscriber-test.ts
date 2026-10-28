import "dotenv/config";
import { createClient } from "redis";

const REDIS_URL =
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const CHANNEL = "collabspace:outbox-events";

const subscriber = createClient({
  url: REDIS_URL,
});

subscriber.on("error", (error) => {
  console.error("[Redis Subscriber] Error:", error);
});

async function startSubscriber(): Promise<void> {
  try {
    await subscriber.connect();

    console.log("[Redis Subscriber] Connected to Redis.");
    console.log(`[Redis Subscriber] Listening on: ${CHANNEL}`);
    console.log("[Redis Subscriber] Waiting for events...\n");

    await subscriber.subscribe(CHANNEL, (message) => {
      console.log("\n========== REDIS EVENT RECEIVED ==========");
      
      try {
        const event = JSON.parse(message);
        console.log(JSON.stringify(event, null, 2));
      } catch {
        console.log(message);
      }

      console.log("==========================================\n");
    });
  } catch (error) {
    console.error("[Redis Subscriber] Failed to start:", error);

    if (subscriber.isOpen) {
      await subscriber.close();
    }

    process.exitCode = 1;
  }
}

async function stopSubscriber(): Promise<void> {
  if (subscriber.isOpen) {
    await subscriber.close();
  }

  console.log("[Redis Subscriber] Disconnected.");
}

process.once("SIGINT", () => {
  void stopSubscriber();
});

process.once("SIGTERM", () => {
  void stopSubscriber();
});

void startSubscriber();