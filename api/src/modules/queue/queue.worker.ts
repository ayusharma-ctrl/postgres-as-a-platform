import { logger } from "../../app";
import { ingestDocument } from "../rag/rag.ingest";
import { toSafeErrorMessage } from "../../utils/safeError";
import {
  fetchNextJob,
  markFailure,
  markSuccess
} from "./queue.service";
import { JobPayloadMap, JobType } from "./queue.types";

type HandlerMap = {
  [K in JobType]: (payload: JobPayloadMap[K]) => Promise<void>;
};

// here we can define as many as handlers/jobs for which we craete queue
const handlers: HandlerMap = {
  email: async (payload) => {
    logger.info({ payload: payload.to }, "Sending email");
    // we can throw error here to simulate job failed, retry logic
    // throw new Error('Method to send mails is not complete');
  },
  rag_ingest: async (payload) => {
    try {
      await ingestDocument(payload);
    } catch (err) {
      logger.error(
        { docId: payload.docId, error: toSafeErrorMessage(err) },
        "RAG ingestion error"
      );
      throw err;
    }
  },
};

// thi smethod will start the worker in background
export async function startQueueWorker() {
  logger.info("Queue worker started");

  // replace 200 ms with 60000 (1-minute) as we added pub-sub to reduce db poll, still using interval as fallback
  setInterval(async () => {
    notifyQueueWorker();
  }, 60 * 1000);
}

export async function notifyQueueWorker() {
  const job = await fetchNextJob();
  if (!job) return;

  try {
    const handler = handlers[job.type];

    if (!handler) throw new Error("Unknown job type");

    await handler(job.payload as any);

    await markSuccess(job.id); // if task is done, update job status
    logger.info(`Job Id: ${job.id} is success`);
  } catch (err) {
    await markFailure(job, err);
  }
}
