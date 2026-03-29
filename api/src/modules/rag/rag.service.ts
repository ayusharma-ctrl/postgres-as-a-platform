import { QueryTypes } from "sequelize";
import { sequelize } from "../../db";
import { embedText } from "./rag.embeddings";
import { llm } from "./rag.embeddings";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { hashBuffer, truncateContext } from "./rag.utils";
import { HybridSearchResult, RAGQueryResult } from "./rag.types";
import { RagDocument } from "./rag.model";
import { HttpError } from "../../utils/httpError";
import { enqueueJob } from "../queue/queue.service";
import { logger } from "../../app";
import { toSafeErrorMessage } from "../../utils/safeError";

const MAX_CONTEXT_CHUNKS = 5;   // send max 5 chunks to LLM
const MAX_CHUNK_CHARS = 600; // hard cap per chunk → prevents context stuffing

export const uploadDoc = async (file: Express.Multer.File) => {
    try {
        const fileHash = hashBuffer(file.buffer);

        const existingDoc = await RagDocument.findOne({
            where: { file_hash: fileHash }
        });

        if (existingDoc) {
            if (existingDoc.status !== "failed") {
                throw new HttpError(`Document already exist (status: ${existingDoc.status})`, 409);
            }

            await existingDoc.update({
                file_name: file.originalname,
                mime_type: file.mimetype,
                status: "pending",
                total_chunks: 0,
                error_message: null
            });

            await enqueueJob("rag_ingest", {
                docId: existingDoc.id,
                bufferBase64: file.buffer.toString("base64"),
            });

            logger.info({ docId: existingDoc.id, file: file.originalname }, "RAG: retry queued for failed document");

            return {
                docId: existingDoc.id,
                status: "queued",
                message: "Previous failed upload found. Re-ingestion queued."
            };
        }

        const doc = await RagDocument.create({
            file_name: file.originalname,
            mime_type: file.mimetype,
            file_hash: fileHash,
            status: "pending",
        });

        // add job for background workers
        await enqueueJob("rag_ingest", {
            docId: doc.id,
            bufferBase64: file.buffer.toString("base64"),
        });

        logger.info({ docId: doc.id, file: file.originalname }, "RAG: queued for ingestion");

        return {
            docId: doc.id,
            status: "queued",
            message: "Document accepted. Embedding in background."
        }
    } catch (err) {
        throw err;
    }
}

export const getDoc = async (docId: string) => {
    try {
        const doc = await RagDocument.findByPk(docId);
        if (!doc) throw new HttpError("Document not found", 404);

        return {
            docId: doc.id,
            fileName: doc.file_name,
            status: doc.status,
            totalChunks: doc.total_chunks,
            uploadedAt: doc.created_at,
            error: doc.error_message ?? undefined
        }
    } catch (err) {
        throw err;
    }
}

// VECTOR SEARCH - pgvector cosine similarity
async function vectorSearchChunks(embedding: number[], limit: number): Promise<HybridSearchResult[]> {

    const vectorLiteral = `[${embedding.join(",")}]`;

    const rows = await sequelize.query<any>(`
        WITH candidates AS (
            SELECT
                e.entity_id,
                e.content,
                (e.embedding <=> :embedding::vector) AS distance
            FROM embeddings e
            WHERE e.entity_type = 'rag'
            ORDER BY e.embedding <=> :embedding::vector
            LIMIT :limit
        )
        SELECT
            c.entity_id AS "chunkId",
            c.content,
            1 - c.distance AS score,
            rc.doc_id AS "docId",
            rc.chunk_index AS "chunkIndex",
            rc.page_number AS "pageNumber",
            rd.file_name AS "fileName"
        FROM candidates c
        JOIN rag_chunks rc ON rc.id::text = c.entity_id
        JOIN rag_documents rd ON rd.id = rc.doc_id
        ORDER BY c.distance
        LIMIT :limit
    `, {
        replacements: { embedding: vectorLiteral, limit },
        type: QueryTypes.SELECT
    });

    return rows.map(r => ({
        chunkId: r.chunkId,
        content: r.content,
        score: parseFloat(r.score),
        matchedBy: "vector" as const,
        meta: {
            docId: r.docId,
            fileName: r.fileName,
            chunkIndex: r.chunkIndex,
            pageNumber: r.pageNumber
        }
    }));
}

/*
    FULL-TEXT SEARCH - PostgreSQL tsvector
    Uses GIN index on rag_chunks.content
*/
async function ftsSearchChunks(query: string, limit: number): Promise<HybridSearchResult[]> {

    const rows = await sequelize.query<any>(`
        WITH q AS (
            SELECT websearch_to_tsquery('english', :query) AS tsq
        )
        SELECT
            rc.id AS "chunkId",
            rc.content,
            ts_rank_cd(to_tsvector('english', rc.content), q.tsq) AS score,
            rc.doc_id AS "docId",
            rc.chunk_index AS "chunkIndex",
            rc.page_number AS "pageNumber",
            rd.file_name AS "fileName"
        FROM rag_chunks rc CROSS JOIN q
        JOIN rag_documents rd ON rd.id = rc.doc_id
        WHERE to_tsvector('english', rc.content) @@ q.tsq
        ORDER BY score DESC
        LIMIT :limit
    `, {
        replacements: { query, limit },
        type: QueryTypes.SELECT
    });

    return rows.map(r => ({
        chunkId: r.chunkId,
        content: r.content,
        score: parseFloat(r.score),
        matchedBy: "fulltext" as const,
        meta: {
            docId: r.docId,
            fileName: r.fileName,
            chunkIndex: r.chunkIndex,
            pageNumber: r.pageNumber
        }
    }));
}

/* 
    RECIPROCAL RANK FUSION (RRF)
    Merges two ranked lists into one.
    Formula:  score(d) = Σ 1 / (k + rank(d))
    k = 60 is the standard constant (Cormack 2009)
    A chunk appearing in BOTH lists gets boosted.
*/
function mergeRRF(
    vectorResults: HybridSearchResult[],
    ftsResults: HybridSearchResult[],
    topN: number
): HybridSearchResult[] {

    const k = 60;
    const map = new Map<string, HybridSearchResult>();

    vectorResults.forEach((r, i) => {
        const rrf = 1 / (k + i + 1);
        map.set(r.chunkId, { ...r, score: rrf, matchedBy: "vector" });
    });

    ftsResults.forEach((r, i) => {
        const rrf = 1 / (k + i + 1);
        const existing = map.get(r.chunkId);
        if (existing) {
            existing.score += rrf;         // double-matched → higher score
            existing.matchedBy = "hybrid";
        } else {
            map.set(r.chunkId, { ...r, score: rrf, matchedBy: "fulltext" });
        }
    });

    return Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, topN);
}

export async function queryRAG(question: string): Promise<RAGQueryResult> {
    try {
        // 1. Embed query
        const queryEmbedding = await embedText(question);

        // 2. Run hybrid search in parallel
        const [vectorResults, ftsResults] = await Promise.all([
            vectorSearchChunks(queryEmbedding, 10),
            ftsSearchChunks(question, 10)
        ]);

        // 3. RRF rerank → top N chunks
        const topChunks = mergeRRF(vectorResults, ftsResults, MAX_CONTEXT_CHUNKS);

        if (topChunks.length === 0) {
            return {
                answer: "No relevant content found in the uploaded documents.",
                sources: []
            };
        }

        // 4. Build context - SECURITY: hard-cap each chunk before LLM 
        const context = topChunks
            .map((c, i) => `[${i + 1}] ${truncateContext(c.content, MAX_CHUNK_CHARS)}`)
            .join("\n\n");

        // 5. Call LLM - grounded prompt, no hallucination
        const messages = [
            new SystemMessage(
                "You are a precise document assistant. " +
                "Answer ONLY using the numbered context snippets below. " +
                "Cite which snippet(s) you used like [1] or [2]. " +
                "If the answer cannot be found in the context, respond with: " +
                "'Not found in the provided documents.' " +
                "Do NOT add information from outside the context."
            ),
            new HumanMessage(
                `Context:\n\n${context}\n\nQuestion: ${question}`
            )
        ];

        const response = await llm.invoke(messages);

        return {
            answer: String(response.content),
            sources: topChunks.map(c => ({
                fileName: c.meta.fileName,
                chunkIndex: c.meta.chunkIndex,
                excerpt: truncateContext(c.content, 150)
            }))
        };
    } catch (e) {
        logger.error({ error: toSafeErrorMessage(e) }, "RAG query service failed");
        throw new HttpError("Failed to query documents", 500);
    }
}
