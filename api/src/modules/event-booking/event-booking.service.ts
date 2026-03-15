import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { env } from "../../config";
import { sequelize } from "../../db";
import { enqueueJob } from "../queue/queue.service";
import { publishEvent } from "../pubsub/pubsub.service";
import { Booking, Event, User } from "./event-booking.model";
import { UserRole } from "./event-booking.types";
import { EventBookingError } from "./event-booking.errors";

export async function enqueueEmail(to: string, subject: string, body: string) {
  await enqueueJob("email", { to, subject, body });

  await publishEvent("job_created", {
    jobId: randomUUID(),
    data: {
      type: "email",
      to,
      subject
    }
  });
}

export async function createUser(params: {
  name: string;
  email: string;
  role: UserRole;
}) {
  const existing = await User.findOne({ where: { email: params.email } });
  if (existing) {
    throw new EventBookingError("EMAIL_EXISTS");
  }

  return User.create({
    name: params.name,
    email: params.email,
    role: params.role,
    is_active: true
  });
}

export async function signIn(email: string) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new EventBookingError("USER_NOT_FOUND");
  }

  if (!user.is_active) {
    throw new EventBookingError("USER_INACTIVE");
  }

  const token = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: "7d"
  });

  return { token, user };
}

export async function listEventsForUser(params: {
  userId: string;
  role: UserRole;
  limit: number;
  cursorDate?: Date | null;
  cursorId?: string | null;
}) {
  const order: any = [
    ["starts_at", "ASC"],
    ["id", "ASC"]
  ];
  const { cursorDate, cursorId } = params;

  if (params.role === "organizer") {
    const where: any = { organizer_id: params.userId };
    if (cursorDate) {
      if (cursorId) {
        where[Op.or] = [
          { starts_at: { [Op.gt]: cursorDate } },
          { starts_at: cursorDate, id: { [Op.gt]: cursorId } }
        ];
      } else {
        where.starts_at = { [Op.gt]: cursorDate };
      }
    }

    const events = await Event.findAll({
      where,
      order,
      limit: params.limit
    });

    const last = events[events.length - 1];
    return {
      events,
      next_cursor: last ? last.starts_at.toISOString() : null,
      next_cursor_id: last ? last.id : null
    };
  }

  const where: any = {
    status: "published",
    ends_at: { [Op.gt]: new Date() }
  };
  if (cursorDate) {
    if (cursorId) {
      where[Op.or] = [
        { starts_at: { [Op.gt]: cursorDate } },
        { starts_at: cursorDate, id: { [Op.gt]: cursorId } }
      ];
    } else {
      where.starts_at = { [Op.gt]: cursorDate };
    }
  }

  const events = await Event.findAll({
    where,
    order,
    limit: params.limit
  });

  const last = events[events.length - 1];
  return {
    events,
    next_cursor: last ? last.starts_at.toISOString() : null,
    next_cursor_id: last ? last.id : null
  };
}

export async function createEvent(params: {
  organizerId: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  totalTickets: number;
}) {
  return Event.create({
    organizer_id: params.organizerId,
    title: params.title,
    description: params.description,
    starts_at: params.startsAt,
    ends_at: params.endsAt,
    status: "published",
    total_tickets: params.totalTickets,
    available_tickets: params.totalTickets
  });
}

export async function updateEvent(params: {
  eventId: string;
  organizerId: string;
  title?: string;
  description?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  status?: "draft" | "published" | "cancelled";
}) {
  const event = await Event.findOne({
    where: { id: params.eventId, organizer_id: params.organizerId }
  });

  if (!event) return null;

  if (params.title !== undefined) event.title = params.title;
  if (params.description !== undefined) event.description = params.description;
  if (params.startsAt !== undefined) event.starts_at = params.startsAt;
  if (params.endsAt !== undefined) event.ends_at = params.endsAt;
  if (params.status !== undefined) event.status = params.status;

  await event.save();

  await notifyEventUpdate(event);

  return event;
}

export async function bookTickets(params: {
  eventId: string;
  customerId: string;
  quantity: number;
}) {
  const { eventId, customerId, quantity } = params;

  const result = await sequelize.transaction(async (transaction) => {
    const event = await Event.findOne({
      where: { id: eventId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!event) {
      throw new EventBookingError("EVENT_NOT_FOUND");
    }

    if (event.status !== "published") {
      throw new EventBookingError("EVENT_NOT_PUBLISHED");
    }

    if (new Date(event.ends_at).getTime() <= Date.now()) {
      throw new EventBookingError("EVENT_ENDED");
    }

    if (event.available_tickets < quantity) {
      throw new EventBookingError("INSUFFICIENT_TICKETS");
    }

    event.available_tickets -= quantity;
    await event.save({ transaction });

    const booking = await Booking.create(
      {
        event_id: event.id,
        customer_id: customerId,
        quantity,
        status: "pending"
      },
      { transaction }
    );

    return { event, booking };
  });

  const customer = await User.findByPk(customerId);
  if (customer) {
    await enqueueEmail(
      customer.email,
      `Booking received: ${result.event.title}`,
      `We received your booking for ${quantity} ticket(s) for "${result.event.title}".`
    );
  }

  return result;
}

export async function listBookingsForCustomer(params: {
  customerId: string;
  limit: number;
  cursorDate?: Date | null;
  cursorId?: string | null;
}) {
  const where: any = { customer_id: params.customerId };
  if (params.cursorDate) {
    if (params.cursorId) {
      where[Op.or] = [
        { created_at: { [Op.lt]: params.cursorDate } },
        { created_at: params.cursorDate, id: { [Op.lt]: params.cursorId } }
      ];
    } else {
      where.created_at = { [Op.lt]: params.cursorDate };
    }
  }

  const bookings = await Booking.findAll({
    where,
    include: [{ model: Event, as: "event" }],
    order: [
      ["created_at", "DESC"],
      ["id", "DESC"]
    ],
    limit: params.limit
  });

  const last = bookings[bookings.length - 1];
  return {
    bookings,
    next_cursor: last ? last.created_at.toISOString() : null,
    next_cursor_id: last ? last.id : null
  };
}

export async function confirmBookingByCustomer(params: {
  bookingId: string;
  customerId: string;
}) {
  const booking = await Booking.findOne({
    where: { id: params.bookingId, customer_id: params.customerId },
    include: [{ model: Event, as: "event" }]
  });

  if (!booking) {
    throw new EventBookingError("BOOKING_NOT_FOUND");
  }

  if (booking.status === "cancelled") {
    throw new EventBookingError("BOOKING_CANCELLED");
  }

  if (booking.status === "confirmed") {
    throw new EventBookingError("BOOKING_ALREADY_CONFIRMED");
  }

  booking.status = "confirmed";
  await booking.save();

  const event = (booking as any).event as Event | undefined;
  const customer = await User.findByPk(params.customerId);
  if (event && customer) {
    await enqueueEmail(
      customer.email,
      `Booking confirmed: ${event.title}`,
      `Your booking for "${event.title}" is confirmed.`
    );
  }

  return booking;
}

export async function confirmBookingByOrganizer(params: {
  bookingId: string;
  organizerId: string;
}) {
  const booking = await Booking.findOne({
    where: { id: params.bookingId },
    include: [
      { model: Event, as: "event" },
      { model: User, as: "customer" }
    ]
  });

  if (!booking) {
    throw new EventBookingError("BOOKING_NOT_FOUND");
  }

  const event = (booking as any).event as Event | undefined;
  if (!event || event.organizer_id !== params.organizerId) {
    throw new EventBookingError("FORBIDDEN");
  }

  if (booking.status === "cancelled") {
    throw new EventBookingError("BOOKING_CANCELLED");
  }

  if (booking.status === "confirmed") {
    throw new EventBookingError("BOOKING_ALREADY_CONFIRMED");
  }

  booking.status = "confirmed";
  await booking.save();

  const customer = (booking as any).customer as User | undefined;
  if (customer) {
    await enqueueEmail(
      customer.email,
      `Booking confirmed: ${event.title}`,
      `Your booking for "${event.title}" is confirmed.`
    );
  }

  return booking;
}

export async function notifyEventUpdate(event: Event) {
  const bookings = await Booking.findAll({
    where: { event_id: event.id, status: "confirmed" },
    include: [{ model: User, as: "customer" }]
  });

  for (const booking of bookings) {
    const customer = (booking as any).customer as User | undefined;
    if (!customer) continue;

    await enqueueEmail(
      customer.email,
      `Event updated: ${event.title}`,
      `The event "${event.title}" has been updated.`
    );
  }
}
