# PubSub Module

This module handles lightweight event signaling using PostgreSQL `LISTEN/NOTIFY`.

## What It Handles

- Publishes JSON payload events to channels
- Listens to channels and triggers local handlers
- Decouples producers (API routes) from consumers (workers)

## API Endpoint

- `POST /api/v1/pubsub/job-created`

## Active Channels

- `job_created`
- `cache_invalidated`

## Current Behavior

- On `job_created`, queue worker is nudged to fetch jobs immediately.
- Polling still exists as fallback, so system works even if notification is missed.

## Why This Design

- Faster reaction than pure polling.
- Keeps architecture simple with no extra broker dependency.
