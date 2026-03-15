export type UserRole = "organizer" | "customer";

export type EventStatus = "draft" | "published" | "cancelled";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface AuthUser {
  id: string;
  role: UserRole;
}
