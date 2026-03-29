import { Router } from "express";
import { fetchDoc, handleDocUpload, handleQuery } from "./rag.controller";

const ragRouter = Router();

ragRouter.post("/upload", handleDocUpload);
ragRouter.get("/docs/:docId", fetchDoc);
ragRouter.post("/query", handleQuery);

export default ragRouter;