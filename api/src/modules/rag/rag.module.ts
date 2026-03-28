import { Module } from "../types";
import "./rag.model";
import ragRouter from "./rag.routes";

export const ragModule: Module = {
    routes(app) {
        app.use("/api/v1/rag", ragRouter);
    }
};