import "dotenv/config";
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (error) => {
  console.error("Redis client error:", error);
});

redisClient.on("connect", () => {
  console.log("Connecting to Redis...");
});

redisClient.on("ready", () => {
  console.log("Redis connection is ready.");
});

redisClient.on("reconnecting", () => {
  console.log("Reconnecting to Redis...");
});

export async function connectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    return;
  }

  await redisClient.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    return;
  }

  await redisClient.close();
}