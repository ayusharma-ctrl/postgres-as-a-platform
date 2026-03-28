import express from "express";
import pino from "pino";
import { healthRouter } from "./routes/health";
import { upload } from "./utils/middleware";

export const logger = pino();

export function createApp() {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(upload.single("file"));
    app.use(healthRouter);

    return app;
}
