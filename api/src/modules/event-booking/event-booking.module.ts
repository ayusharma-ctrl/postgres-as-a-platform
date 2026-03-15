import { Module } from "../types";
import { env } from "../../config";
import { eventBookingRouter } from "./event-booking.routes";
import "./event-booking.model";

export const eventBookingModule: Module = {
  routes(app) {
    app.locals.pageSizeDefault = Number(env.PAGE_SIZE_DEFAULT);
    app.locals.pageSizeMax = Number(env.PAGE_SIZE_MAX);
    app.use("/api/v1/cactro", eventBookingRouter);
  }
};
