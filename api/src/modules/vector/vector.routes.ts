import { Router } from "express";
import {
    insertEmbedding,
    searchSimilar
} from "./vector.service";
import { EmbeddingVector } from "./vector.types";

export const vectorRouter = Router();

vectorRouter.post("/insert", async (req, res) => {
        const { entityType, entityId, content, embedding } = req.body;
        await insertEmbedding(entityType, entityId, content, embedding as EmbeddingVector);
        res.json({ inserted: true });
    }
);

vectorRouter.post("/search", async (req, res) => {
        const { embedding } = req.body;
        const results = await searchSimilar(embedding as EmbeddingVector);
        res.json(results);
    }
);
