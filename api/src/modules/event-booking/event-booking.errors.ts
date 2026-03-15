export type EventBookingErrorCode =
  | "EMAIL_EXISTS"
  | "USER_NOT_FOUND"
  | "USER_INACTIVE"
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_PUBLISHED"
  | "EVENT_ENDED"
  | "INSUFFICIENT_TICKETS"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_CANCELLED"
  | "BOOKING_ALREADY_CONFIRMED"
  | "FORBIDDEN";

type ErrorMeta = {
  status: number;
  message: string;
};

export const EVENT_BOOKING_ERRORS: Record<EventBookingErrorCode, ErrorMeta> = {
  EMAIL_EXISTS: { status: 409, message: "email already exists" },
  USER_NOT_FOUND: { status: 401, message: "invalid credentials" },
  USER_INACTIVE: { status: 403, message: "user is inactive" },
  EVENT_NOT_FOUND: { status: 404, message: "event not found" },
  EVENT_NOT_PUBLISHED: { status: 400, message: "event not published" },
  EVENT_ENDED: { status: 400, message: "event ended" },
  INSUFFICIENT_TICKETS: { status: 400, message: "insufficient tickets" },
  BOOKING_NOT_FOUND: { status: 404, message: "booking not found" },
  BOOKING_CANCELLED: { status: 400, message: "booking cancelled" },
  BOOKING_ALREADY_CONFIRMED: { status: 400, message: "booking already confirmed" },
  FORBIDDEN: { status: 403, message: "forbidden" }
};

export class EventBookingError extends Error {
  code: EventBookingErrorCode;
  status: number;

  constructor(code: EventBookingErrorCode) {
    const meta = EVENT_BOOKING_ERRORS[code];
    super(meta.message);
    this.code = code;
    this.status = meta.status;
  }
}

export function isEventBookingError(
  err: unknown
): err is EventBookingError {
  return err instanceof EventBookingError;
}
