import { Router } from "express";
import { apiKeyOnly, authMiddleware, requireRole } from "../../middleware/auth";
import {
  bookTickets,
  confirmBookingByCustomer,
  confirmBookingByOrganizer,
  createEvent,
  createUser,
  listBookingsForCustomer,
  listEventsForUser,
  signIn,
  updateEvent
} from "./event-booking.service";
import { isEventBookingError } from "./event-booking.errors";

export const eventBookingRouter = Router();

function parseDate(value: unknown): Date | null {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseLimit(value: unknown, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseCursorPair(req: any) {
  const cursor = req.query?.cursor;
  const cursorId = req.query?.cursor_id;
  const date = cursor ? parseDate(cursor) : null;
  const id = cursorId ? String(cursorId) : null;
  return { date, id };
}

function paginationConfig(req: any) {
  const fallback = Number(req.app?.locals?.pageSizeDefault ?? 20);
  const max = Number(req.app?.locals?.pageSizeMax ?? 100);
  return { fallback, max };
}

function handleServiceError(res: any, err: unknown, fallbackMessage: string) {
  if (isEventBookingError(err)) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }
  res.status(500).json({ success: false, message: fallbackMessage });
}

// signup
eventBookingRouter.post("/auth/signup", apiKeyOnly, async (req, res) => {
  const { name, email, role } = req.body ?? {};

  if (!name || !email || !role) {
    res.status(400).json({ success: false, message: "name, email, role required" });
    return;
  }

  if (role !== "organizer" && role !== "customer") {
    res.status(400).json({ success: false, message: "invalid role" });
    return;
  }

  try {
    const user = await createUser({ name, email, role });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      }
    });
  } catch (err) {
    handleServiceError(res, err, "failed to create user");
  }
});

// signin
eventBookingRouter.post("/auth/signin", apiKeyOnly, async (req, res) => {
  const { email } = req.body ?? {};

  if (!email) {
    res.status(400).json({ success: false, message: "email required" });
    return;
  }

  try {
    const { token } = await signIn(email);
    res.json({ success: true, token });
  } catch (err) {
    handleServiceError(res, err, "signin failed");
  }
});

// fetch events
eventBookingRouter.get("/events", authMiddleware, async (req: any, res) => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ success: false, message: "unauthorized" });
    return;
  }

  const { fallback, max } = paginationConfig(req);
  const limit = parseLimit(req.query?.limit, fallback, max);
  const { date: cursorDate, id: cursorId } = parseCursorPair(req);

  const result = await listEventsForUser({
    userId: user.id,
    role: user.role,
    limit,
    cursorDate,
    cursorId
  });

  res.json({ success: true, ...result });
});

// create event
eventBookingRouter.post(
  "/events",
  authMiddleware,
  requireRole("organizer"),
  async (req: any, res) => {
    const { title, description, starts_at, ends_at, total_tickets } = req.body ?? {};

    if (!title || !starts_at || !ends_at || !total_tickets) {
      res.status(400).json({ success: false, message: "missing fields" });
      return;
    }

    const startsAt = parseDate(starts_at);
    const endsAt = parseDate(ends_at);

    if (!startsAt || !endsAt) {
      res.status(400).json({ success: false, message: "invalid dates" });
      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      res.status(400).json({ success: false, message: "ends_at must be after starts_at" });
      return;
    }

    const tickets = Number(total_tickets);
    if (!Number.isFinite(tickets) || tickets <= 0) {
      res.status(400).json({ success: false, message: "total_tickets must be > 0" });
      return;
    }

    const event = await createEvent({
      organizerId: req.user.id,
      title,
      description: description ?? null,
      startsAt,
      endsAt,
      totalTickets: tickets
    });

    res.status(201).json({ success: true, event });
  }
);

// update event
eventBookingRouter.patch(
  "/events/:id",
  authMiddleware,
  requireRole("organizer"),
  async (req: any, res) => {
    const { title, description, starts_at, ends_at, status } = req.body ?? {};

    let startsAt: Date | undefined;
    let endsAt: Date | undefined;

    if (starts_at !== undefined) {
      const parsed = parseDate(starts_at);
      if (!parsed) {
        res.status(400).json({ success: false, message: "invalid starts_at" });
        return;
      }
      startsAt = parsed;
    }

    if (ends_at !== undefined) {
      const parsed = parseDate(ends_at);
      if (!parsed) {
        res.status(400).json({ success: false, message: "invalid ends_at" });
        return;
      }
      endsAt = parsed;
    }

    if (status !== undefined) {
      if (status !== "draft" && status !== "published" && status !== "cancelled") {
        res.status(400).json({ success: false, message: "invalid status" });
        return;
      }
    }

    const event = await updateEvent({
      eventId: req.params.id,
      organizerId: req.user.id,
      title,
      description,
      startsAt,
      endsAt,
      status
    });

    if (!event) {
      res.status(404).json({ success: false, message: "event not found" });
      return;
    }

    res.json({ success: true, event });
  }
);

// create booking
eventBookingRouter.post(
  "/events/:id/bookings",
  authMiddleware,
  requireRole("customer"),
  async (req: any, res) => {
    const quantity = Number(req.body?.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ success: false, message: "quantity must be > 0" });
      return;
    }

    try {
      const { booking } = await bookTickets({
        eventId: req.params.id,
        customerId: req.user.id,
        quantity
      });

      res.status(201).json({
        success: true,
        booking,
        confirm_url: `/api/v1/bookings/${booking.id}/confirm`
      });
    } catch (err) {
      handleServiceError(res, err, "booking failed");
    }
  }
);

// fetch bookings - user specific
eventBookingRouter.get(
  "/bookings",
  authMiddleware,
  requireRole("customer"),
  async (req: any, res) => {
    const { fallback, max } = paginationConfig(req);
    const limit = parseLimit(req.query?.limit, fallback, max);
    const { date: cursorDate, id: cursorId } = parseCursorPair(req);

    const result = await listBookingsForCustomer({
      customerId: req.user.id,
      limit,
      cursorDate,
      cursorId
    });

    res.json({ success: true, ...result });
  }
);

// api to confirm booking (customer)
eventBookingRouter.get(
  "/bookings/:id/confirm",
  authMiddleware,
  requireRole("customer"),
  async (req: any, res) => {
    try {
      const booking = await confirmBookingByCustomer({
        bookingId: req.params.id,
        customerId: req.user.id
      });
      res.json({ success: true, booking });
    } catch (err) {
      handleServiceError(res, err, "confirm failed");
    }
  }
);

// api to confirm booking (organizer)
eventBookingRouter.patch(
  "/bookings/:id/confirm",
  authMiddleware,
  requireRole("organizer"),
  async (req: any, res) => {
    try {
      const booking = await confirmBookingByOrganizer({
        bookingId: req.params.id,
        organizerId: req.user.id
      });
      res.json({ success: true, booking });
    } catch (err) {
      handleServiceError(res, err, "confirm failed");
    }
  }
);
