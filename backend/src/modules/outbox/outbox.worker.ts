import {
  claimOutboxEvents,
  markOutboxEventFailed,
  markOutboxEventProcessed,
  type OutboxEvent,
} from "./outbox.repository.js";

const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 10;

let workerTimer: ReturnType<typeof setTimeout> | undefined;
let isRunning = false;
let isStopping = false;

/**
 * Temporary dispatcher.
 *
 * For now, we log each event to verify the outbox workflow.
 * Later, we will publish these events through Redis so that
 * WebSocket connections can deliver real-time updates.
 */
async function dispatchOutboxEvent(event: OutboxEvent): Promise<void> {
  switch (event.eventType) {
    case "task.assigned":
    case "task.status_changed":
    case "task.commented": {
      console.log("[Outbox] Event dispatched:", {
        eventId: event.id,
        eventType: event.eventType,
        payload: event.payload,
      });

      return;
    }

    default: {
      throw new Error(
        `Unsupported outbox event type: ${event.eventType}`,
      );
    }
  }
}

/**
 * Processes one claimed event.
 */
async function processOutboxEvent(
  event: OutboxEvent,
): Promise<void> {
  try {
    await dispatchOutboxEvent(event);
    await markOutboxEventProcessed(event.id);

    console.log("[Outbox] Event processed:", event.id);
  } catch (error) {
    console.error(
      "[Outbox] Event processing failed:",
      event.id,
      error,
    );

    try {
      await markOutboxEventFailed(
        event.id,
        event.attempts,
        error,
      );
    } catch (markFailedError) {
      console.error(
        "[Outbox] Could not record event failure:",
        event.id,
        markFailedError,
      );
    }
  }
}

/**
 * Claims and processes one batch.
 */
async function processOutboxBatch(): Promise<void> {
  const events = await claimOutboxEvents(BATCH_SIZE);

  if (events.length === 0) {
    return;
  }

  console.log(`[Outbox] Claimed ${events.length} event(s).`);

  // Process sequentially to keep this initial worker simple.
  for (const event of events) {
    await processOutboxEvent(event);
  }
}

/**
 * Polls for new events.
 *
 * The next poll is scheduled only after the current batch finishes,
 * preventing overlapping polling cycles in this worker instance.
 */
async function pollOutbox(): Promise<void> {
  if (isStopping) {
    return;
  }

  if (isRunning) {
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

/**
 * Starts the worker.
 */
export function startOutboxWorker(): void {
  if (workerTimer || isRunning) {
    console.log("[Outbox] Worker is already running.");
    return;
  }

  isStopping = false;

  console.log("[Outbox] Worker started.");

  void pollOutbox();
}

/**
 * Stops future polling and waits for the current batch to finish.
 */
export async function stopOutboxWorker(): Promise<void> {
  isStopping = true;

  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = undefined;
  }

  while (isRunning) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
  }

  console.log("[Outbox] Worker stopped.");
}