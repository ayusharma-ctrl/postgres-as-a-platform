# Cache Module

This module provides DB-backed caching and materialized-view based job stats reads.

## What It Handles

- Key/value cache with TTL (`cache` table)
- `getOrSet` helper for read-through caching
- Expired-key cleanup worker
- Periodic refresh of `job_stats_mv` materialized view

## API Endpoints

- `GET /api/v1/cache/test`
- `POST /api/v1/cache/test`
- `GET /api/v1/cache/job-stats`

## Worker Loops

- Cache cleanup runs every 30 seconds.
- Materialized view refresh runs every 1 hour.

## Why This Design

- Keeps cache and operational metrics inside PostgreSQL for low operational overhead.
- Good fit for small to medium workloads and learning projects.
