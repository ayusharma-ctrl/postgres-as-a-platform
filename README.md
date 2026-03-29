# postgres-as-a-platform

A modular Node.js + TypeScript backend using PostgreSQL as the primary system of record.
The project demonstrates practical backend patterns: queueing, caching, pub/sub, search, vector search, RAG, and more...

## What This Project Does

- Runs an HTTP API with independently mounted modules.
- Uses PostgreSQL for relational data, queue state, cache state, full-text search, and vector search.
- Supports RAG over uploaded PDF/DOCX files.
- Runs background workers for queue processing and cache maintenance.

## Stack

- Node.js, TypeScript, Express
- PostgreSQL 17 + pgvector
- Sequelize
- LangChain + Gemini (embeddings + answer generation)

## High-Level Request Flow

1. `server.ts` boots DB, modules, routes, and workers.
2. Routes are mounted from `api/src/modules/index.ts`.
3. Module services use PostgreSQL directly (via Sequelize ORM + raw SQL where needed).
4. Queue and cache workers run in background loops.

## Project Structure

- `api/src/server.ts`: app bootstrap
- `api/src/modules/`: feature modules
- `api/src/db/migrations/`: schema evolution
- `api/src/routes/health.ts`: health endpoint
- `docker-compose.yml`: local stack (Postgres, migrate job, API)

## Module Docs

- `api/src/modules/rag/RAG_README.md`
- `api/src/modules/queue/QUEUE_README.md`
- `api/src/modules/pubsub/PUBSUB_README.md`
- `api/src/modules/cache/CACHE_README.md`
- `api/src/modules/rate-limit/RATE_LIMIT_README.md`
- `api/src/modules/search/SEARCH_README.md`
- `api/src/modules/vector/VECTOR_README.md`

## Local Run (Docker)

1. Ensure `api/.env` is configured.
2. Run: `docker compose up --build`
3. API default: `http://localhost:8000`
4. Health check: `GET /health`

## Notes

- Queue module is event-assisted (`pg_notify`) with DB polling as fallback.
- RAG ingestion is asynchronous: upload returns quickly, processing happens in worker.
- This repo intentionally keeps modules decoupled so each concept is easy to learn and extend.
- Will add more to it.
