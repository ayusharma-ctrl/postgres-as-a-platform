import { Request, Response } from "express";
import { logger } from "../../app"
import { getDoc, queryRAG, uploadDoc } from "./rag.service";
import { HttpError } from "../../utils/httpError";
import { toSafeErrorMessage } from "../../utils/safeError";

function respondWithError(res: Response, err: unknown, fallbackMessage: string) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: fallbackMessage });
}

const handleDocUpload = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "File required (PDF or DOCX only)" });
        }

        const response = await uploadDoc(req.file);

        return res.status(202).json({
            success: true,
            data: response,
        });
    } catch (err) {
        logger.error({ error: toSafeErrorMessage(err) }, "RAG upload error");
        return respondWithError(res, err, "Upload failed");
    }
}

const fetchDoc = async (req: Request, res: Response) => {
    try {
        const { docId } = req.params;

        if (!docId || typeof docId !== 'string') {
            return res.status(400).json({ success: false, error: "Doc Id is required" });
        }

        const response = await getDoc(docId);

        return res.status(200).json({
            success: true,
            data: response,
        });
    } catch (err) {
        logger.error({ error: toSafeErrorMessage(err) }, "RAG fetch doc error");
        return respondWithError(res, err, "Failed to fetch document");
    }
}

const handleQuery = async (req: Request, res: Response) => {
    try {
        const { question } = req.body;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({ success: false, error: "valid question string is required" });
        }

        const response = await queryRAG(question.trim());

        return res.status(200).json({
            success: true,
            data: response,
        });
    } catch (err) {
        logger.error({ error: toSafeErrorMessage(err) }, "RAG query error");
        return respondWithError(res, err, "Query failed");
    }
}

export { handleDocUpload, fetchDoc, handleQuery }
