import { Module } from "../types";
import { vectorRouter } from "./vector.routes";
import "./vector.model";

export const vectorModule: Module = {
    routes(app) {
        app.use("/api/v1/vector", vectorRouter);
    }
};
