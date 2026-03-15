This repo was extended to implement a minimal Event Booking System with role-based access and background jobs.

What was built
- New DB schema with `users`, `events`, and `bookings` tables.
- Sequelize models for users, events, and bookings with relationships and indexes.
- Auth flow that issues a JWT and expects `Authorization: Bearer <jwt>`.
- Auth middleware that requires `x-api-key` plus `Authorization: Bearer <jwt>`, rejects inactive users, and enforces roles.
- Event APIs.
- Booking APIs.
- Background tasks using the existing queue module.
- Pubsub notification on job creation to wake the worker.
- Seeder data for organizer, customers, event, and a confirmed booking.
- Docker now runs seeds right after migrations on container start.
- Config values for Event Booking:
  - `API_KEY`
  - `PAGE_SIZE_DEFAULT`
  - `PAGE_SIZE_MAX`

API summary
- `POST /api/v1/cactro/auth/signup` creates a user.
- `POST /api/v1/cactro/auth/signin` returns a JWT for the `Authorization: Bearer <jwt>` header.
- `GET /api/v1/cactro/events` shows published, not-ended events for customers and own events for organizers (keyset pagination).
- `POST /api/v1/cactro/events` creates an event (organizer only).
- `PATCH /api/v1/cactro/events/:id` updates an event and triggers notifications (organizer only).
- `POST /api/v1/cactro/events/:id/bookings` books tickets, enqueues confirmation email (customer only).
- `GET /api/v1/cactro/bookings` lists customer bookings (customer only, keyset pagination).

Behavior details
- Booking enforces ticket availability using a transaction and row lock.
- Booking fails for events that are not `published` or already ended.
- Event updates notify all customers with `confirmed` bookings.
- Background tasks log "Sending email" via the queue worker.

Sample curls
```bash
# Signup organizer
curl -X POST http://localhost:8000/api/v1/cactro/auth/signup \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d '{"name":"Org One","email":"org1@example.com","role":"organizer"}'

# Signin organizer (copy token from response)
curl -X POST http://localhost:8000/api/v1/cactro/auth/signin \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d '{"email":"org1@example.com"}'

# Create event (organizer)
curl -X POST http://localhost:8000/api/v1/cactro/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"title":"Demo Event","description":"Quick demo","starts_at":"2026-06-01T10:00:00Z","ends_at":"2026-06-01T12:00:00Z","total_tickets":50}'

# List events
curl http://localhost:8000/api/v1/cactro/events \
  -H "x-api-key: dev-key" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# List events with keyset pagination
curl "http://localhost:8000/api/v1/cactro/events?limit=10&cursor=2026-06-01T10:00:00Z&cursor_id=<EVENT_ID>" \
  -H "x-api-key: dev-key" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Book tickets (customer)
curl -X POST http://localhost:8000/api/v1/cactro/events/<EVENT_ID>/bookings \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"quantity":2}'

# Update event (organizer)
curl -X PATCH http://localhost:8000/api/v1/cactro/events/<EVENT_ID> \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"status":"published","ends_at":"2026-06-01T13:00:00Z"}'

# List bookings with keyset pagination (customer)
curl "http://localhost:8000/api/v1/cactro/bookings?limit=10&cursor=2026-06-01T10:00:00Z&cursor_id=<BOOKING_ID>" \
  -H "x-api-key: dev-key" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
