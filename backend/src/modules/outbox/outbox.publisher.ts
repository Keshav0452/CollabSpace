import { redisClient } from "../../config/redis.js";
import type { OutboxEvent } from "./outbox.repository.js";

export const OUTBOX_REDIS_CHANNEL = "collabspace:outbox-events";

export interface PublishedOutboxEvent {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  publishedAt: string;
}

export async function publishOutboxEvent(
  event: OutboxEvent,
): Promise<void> {
  if (!redisClient.isReady) {
    throw new Error("Cannot publish event: Redis is not ready.");
  }

  const message: PublishedOutboxEvent = {
    eventId: event.id,
    eventType: event.eventType,
    payload: event.payload,
    publishedAt: new Date().toISOString(),
  };

  const messageJson = JSON.stringify(message);

  await redisClient.publish(OUTBOX_REDIS_CHANNEL, messageJson);

  console.log("[Redis] Outbox event published:", {
    eventId: event.id,
    eventType: event.eventType,
    channel: OUTBOX_REDIS_CHANNEL,
  });
}