import { pool } from "../../config/database.js";

export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "processed" | "failed";
  attempts: number;
  availableAt: Date;
  createdAt: Date;
  processedAt: Date | null;
  lastError: string | null;
}

interface OutboxEventRow {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "processed" | "failed";
  attempts: number;
  availableAt: Date;
  createdAt: Date;
  processedAt: Date | null;
  lastError: string | null;
}

const MAX_ATTEMPTS = 5;
const LEASE_DURATION_SECONDS = 60;

/**
 * Claims a batch of available events.
 *
 * FOR UPDATE SKIP LOCKED allows multiple workers to claim events
 * concurrently without claiming the same row at the same time.
 *
 * The lease allows another worker to recover an event if the
 * original worker crashes while processing it.
 *
 * Before claiming events, we also mark expired processing events
 * as failed if they have already exhausted their retry attempts.
 */
export async function claimOutboxEvents(
  batchSize = 10,
): Promise<OutboxEvent[]> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("batchSize must be an integer between 1 and 100");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Recover events whose workers crashed after the final attempt.
    await client.query(
      `UPDATE public.outbox_events
       SET
         status = 'failed',
         last_error = COALESCE(
           last_error,
           'Maximum processing attempts reached and processing lease expired'
         )
       WHERE status = 'processing'
         AND available_at <= NOW()
         AND attempts >= $1`,
      [MAX_ATTEMPTS],
    );

    // Claim pending events and expired processing events that
    // still have attempts remaining.
    const result = await client.query<OutboxEventRow>(
      `WITH events_to_claim AS (
         SELECT id
         FROM public.outbox_events
         WHERE status IN ('pending', 'processing')
           AND available_at <= NOW()
           AND attempts < $2
         ORDER BY available_at ASC, created_at ASC, id ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE public.outbox_events AS events
       SET
         status = 'processing',
         attempts = events.attempts + 1,
         available_at = NOW() + ($3 * INTERVAL '1 second')
       FROM events_to_claim
       WHERE events.id = events_to_claim.id
       RETURNING
         events.id,
         events.event_type AS "eventType",
         events.payload,
         events.status,
         events.attempts,
         events.available_at AS "availableAt",
         events.created_at AS "createdAt",
         events.processed_at AS "processedAt",
         events.last_error AS "lastError"`,
      [batchSize, MAX_ATTEMPTS, LEASE_DURATION_SECONDS],
    );

    await client.query("COMMIT");

    return result.rows;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error if rollback also fails.
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Marks an event as successfully processed.
 */
export async function markOutboxEventProcessed(
  eventId: string,
): Promise<void> {
  const result = await pool.query(
    `UPDATE public.outbox_events
     SET
       status = 'processed',
       processed_at = NOW(),
       last_error = NULL
     WHERE id = $1
       AND status = 'processing'`,
    [eventId],
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `Could not mark outbox event ${eventId} as processed`,
    );
  }
}

/**
 * Records a processing failure.
 *
 * Failed events are retried with exponential backoff.
 * Events that reach the maximum attempt count become permanently failed
 * and can later be inspected or manually reprocessed.
 */
export async function markOutboxEventFailed(
  eventId: string,
  attempts: number,
  error: unknown,
): Promise<void> {
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  const truncatedError = errorMessage.slice(0, 4000);

  if (attempts >= MAX_ATTEMPTS) {
    const result = await pool.query(
      `UPDATE public.outbox_events
       SET
         status = 'failed',
         processed_at = NULL,
         last_error = $2
       WHERE id = $1
         AND status = 'processing'`,
      [eventId, truncatedError],
    );

    if (result.rowCount !== 1) {
      throw new Error(
        `Could not mark outbox event ${eventId} as failed`,
      );
    }

    return;
  }

  const retryDelaySeconds = Math.min(
    5 * 2 ** Math.max(attempts - 1, 0),
    300,
  );

  const result = await pool.query(
    `UPDATE public.outbox_events
     SET
       status = 'pending',
       processed_at = NULL,
       available_at = NOW() + ($2 * INTERVAL '1 second'),
       last_error = $3
     WHERE id = $1
       AND status = 'processing'`,
    [eventId, retryDelaySeconds, truncatedError],
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `Could not schedule retry for outbox event ${eventId}`,
    );
  }
}