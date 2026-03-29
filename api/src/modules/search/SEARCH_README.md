# Search Module

This module provides structured document search with full-text and typo-tolerant modes.

## What It Handles

- Seed synthetic `search_documents` data
- Search in three modes: `fulltext`, `fuzzy`, `auto`
- Auto mode: full-text first, fuzzy fallback if results are low

## API Endpoints

- `POST /api/v1/search/documents/seed`
- `GET /api/v1/search/documents`

## Search Modes

- `fulltext`: PostgreSQL `tsvector/tsquery` ranking
- `fuzzy`: `pg_trgm` similarity ranking
- `auto`: combines both using practical fallback logic

## Key Query Params

- `q` (required)
- `mode` (`auto|fulltext|fuzzy`)
- `limit`
- `threshold` (fuzzy sensitivity)
- `minFullTextResults` (auto-mode fallback trigger)

## Why This Design

- Full-text gives strong precision for clean queries.
- Fuzzy search handles typos and near matches.
- Auto mode balances precision and recall for real-world input.
