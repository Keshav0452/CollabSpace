import {
  claimOutboxEvents,
  markOutboxEventFailed,
  markOutboxEventProcessed,
  type OutboxEvent,
} from "./outbox.repository.js";
import { publishOutboxEvent } from "./outbox.publisher.js";

const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 10;

let workerTimer: ReturnType<typeof setTimeout> | undefined;
let isRunning = false;
let isStopping = false;

async function dispatchOutboxEvent(event: OutboxEvent): Promise<void> {
  switch (event.eventType) {
    case "task.assigned":
    case "task.status_changed":
    case "task.commented": {
      await publishOutboxEvent(event);
      return;
    }

    default:
      throw new Error(`Unsupported outbox event type: ${event.eventType}`);
  }
}

async function processOutboxEvent(event: OutboxEvent): Promise<void> {
  try {
    await dispatchOutboxEvent(event);
    await markOutboxEventProcessed(event.id);

    console.log("[Outbox] Event processed:", event.id);
  } catch (error) {
    console.error("[Outbox] Event processing failed:", event.id, error);

    try {
      await markOutboxEventFailed(event.id, event.attempts, error);
    } catch (markFailedError) {
      console.error(
        "[Outbox] Could not record event failure:",
        event.id,
        markFailedError,
      );
    }
  }
}

async function processOutboxBatch(): Promise<void> {
  const events = await claimOutboxEvents(BATCH_SIZE);

  if (events.length === 0) {
    return;
  }

  console.log(`[Outbox] Claimed ${events.length} event(s).`);

  for (const event of events) {
    await processOutboxEvent(event);
  }
}

async function pollOutbox(): Promise<void> {
  if (isStopping || isRunning) {
    return;
  }

  isRunning = true;

  try {
    await processOutboxBatch();
  } catch (error) {
    console.error("[Outbox] Worker polling failed:", error);
  } finally {
    isRunning = false;

    if (!isStopping) {
      workerTimer = setTimeout(() => {
        void pollOutbox();
      }, POLL_INTERVAL_MS);
    }
  }
}

export function startOutboxWorker(): void {
  if (workerTimer || isRunning) {
    console.log("[Outbox] Worker is already running.");
    return;
  }

  isStopping = false;

  console.log("[Outbox] Worker started.");

  void pollOutbox();
}

export async function stopOutboxWorker(): Promise<void> {
  isStopping = true;

  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = undefined;
  }

  while (isRunning) {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }

  console.log("[Outbox] Worker stopped.");
}