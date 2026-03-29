# Queue Module

This module provides DB-backed background jobs.

## What It Handles

- Enqueue jobs into `jobs` table
- Worker fetches and processes jobs
- Retry/dead-letter behavior based on attempts
- Event publish on job creation (via Pub/Sub)

## API Endpoint

- `POST /api/v1/queue/jobs/email`

## Core Flow

1. API inserts a job row (`pending`).
2. `job_created` event is published.
3. Worker picks next pending job atomically (`FOR UPDATE SKIP LOCKED`).
4. On success, job is deleted.
5. On failure, it is re-scheduled or marked `dead`.

## Current Job Types

- `email` (demo handler)
- `rag_ingest` (used by RAG module)

## Why This Design

- PostgreSQL keeps queue state transactional and simple.
- `SKIP LOCKED` allows safe concurrency without duplicate pickup.
