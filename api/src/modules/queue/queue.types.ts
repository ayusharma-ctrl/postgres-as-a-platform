export type JobStatus =
  | "pending"
  | "processing"
  | "dead";

export interface EmailJobPayload {
  to: string;
  subject?: string;
  body?: string;
}
export interface RAGInjestJobPayload {
  docId: string;
  bufferBase64: string;
}

export type JobPayloadMap = {
  email: EmailJobPayload;
  rag_ingest: RAGInjestJobPayload,
};

export type JobType = keyof JobPayloadMap;

export interface JobRow {
  id: string;
  type: JobType;
  payload: unknown;

  status: JobStatus;
  attempts: number;
  max_attempts: number;

  run_at: Date;
  locked_at: Date | null;
  last_error: string | null;

  created_at: Date;
  updated_at: Date;
}
