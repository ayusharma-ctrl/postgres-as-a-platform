import { Router } from "express";
import {
    seedSearchDocuments,
    searchDocuments
} from "./search.service";
import { SearchMode } from "./search.types";

const searchRouter = Router();

function parseIntParam(value: unknown, fallback: number): number {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatParam(value: unknown, fallback: number): number {
    const parsed = Number.parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMode(value: unknown): SearchMode | null {
    const raw = String(value ?? "auto").trim().toLowerCase();

    if (raw === "auto" || raw === "fulltext" || raw === "fuzzy") {
        return raw;
    }

    return null;
}

searchRouter.post("/documents/seed", async (req, res) => {
    const count = Math.max(
        1,
        Math.min(
            parseIntParam(req.body?.count ?? req.query.count, 100),
            10_000
        )
    );

    const inserted = await seedSearchDocuments(count);

    res.status(201).json({
        success: true,
        inserted
    });
});

searchRouter.get("/documents", async (req, res) => {
    const query = String(req.query.q ?? "").trim();
    const limit = parseIntParam(req.query.limit, 20);
    const threshold = parseFloatParam(req.query.threshold, 0.25);
    const minFullTextResults = parseIntParam(req.query.minFullTextResults, 10);
    const mode = parseMode(req.query.mode);

    if (!query) {
        res.status(400).json({
            success: false,
            message: "query param q is required"
        });
        return;
    }

    if (!mode) {
        res.status(400).json({
            success: false,
            message: "mode must be one of auto, fulltext, fuzzy"
        });
        return;
    }

    const response = await searchDocuments(query, {
        mode,
        limit,
        threshold,
        minFullTextResults
    });

    res.status(200).json({
        success: true,
        mode: response.mode,
        total: response.total,
        results: response.results
    });
});

export { searchRouter };
