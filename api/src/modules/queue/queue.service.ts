import { logger } from "../../app";
import { sequelize } from "../../db";
import { Job } from "./queue.model";
import {
  JobType,
  JobPayloadMap,
  JobRow
} from "./queue.types";
import { QueryTypes } from "sequelize";
import { toSafeErrorMessage } from "../../utils/safeError";

/* ------------------ ENQUEUE ------------------ */
export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayloadMap[T]
) {
  await Job.create({
    type,
    payload
  });
}

/* 
  DEQUEUE

  Purpose: Select a row (oldest pending first, FIFO, that's how queue works), lock it, update it, return the job to worker (full updated row)
  If no job found, return null. 
  This is Atomic: no two workers can grab the same job
  Where to focus?
  FOR UPDATE SKIP LOCKED - lock the selected row, skip row if already locked by another worker/transaction
*/
export async function fetchNextJob(): Promise<JobRow | null> {
  const rows = await sequelize.query<JobRow>(
    `
    WITH next_job AS (
      UPDATE jobs
      SET status='processing',
          locked_at=now(),
          attempts = attempts + 1
      WHERE id = (
        SELECT id
        FROM jobs
        WHERE status='pending'
          AND run_at <= now()
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    )
    SELECT * FROM next_job
    `,
    {
      type: QueryTypes.SELECT
    }
  );

  return rows[0] ?? null;
}

/* ------------------ Mark a job - SUCCESS ------------------ */
export async function markSuccess(id: string) {
  await Job.destroy({ where: { id } });
}

/* ------------------ Mark a job - FAILURE ------------------ */
export async function markFailure(
  job: JobRow,
  error: unknown
) {
  const retry = job.attempts < job.max_attempts;

  if (retry) {
    logger.info(`Job Id: ${job.id} is failed, will retry`);
  } else {
    logger.info(`Job Id: ${job.id} is dead`);
  }

  await Job.update(
    {
      status: retry ? "pending" : "dead", // based on retry attempts
      last_error: toSafeErrorMessage(error, 1000),
      run_at: new Date(Date.now() + 10_000)
    },
    {
      where: { id: job.id }
    }
  );
}
