# Rate Limit Module

This module provides request throttling with a fixed-window algorithm.

## What It Handles

- Counts requests by key (currently `req.ip`)
- Uses atomic upsert logic in PostgreSQL
- Returns `429` when limit is crossed

## API Endpoint

- `GET /api/v1/rate-limit/test` (example-protected route)

## Current Policy in Example

- `5` requests per `60` seconds

## Response Behavior

- Adds `X-RateLimit-Remaining` header
- On limit breach:
  - HTTP `429`
  - `{ "error": "Too many requests" }`

## Why This Design

- Simple and concurrency-safe with one SQL statement.
- Easy to migrate to sliding-window/token-bucket later if needed.
