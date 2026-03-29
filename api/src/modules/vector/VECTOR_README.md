# Vector Module

This module exposes basic vector insert/search APIs over pgvector.

## What It Handles

- Insert embedding rows into shared `embeddings` table
- Run similarity search using cosine distance (`<=>`)

## API Endpoints

- `POST /api/v1/vector/insert`
- `POST /api/v1/vector/search`

## Data Model

- `entity_type`: namespace (example: `rag`)
- `entity_id`: source record id
- `content`: raw text
- `embedding`: vector value (`vector(1536)`)

## Notes

- This is a low-level module; RAG uses it internally.
- Endpoint payloads are trusted as-is, so validation can be added if exposing publicly.
