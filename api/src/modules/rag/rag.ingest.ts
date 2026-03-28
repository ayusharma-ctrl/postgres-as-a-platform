import { logger } from "../../app";
import { RagDocument, RagChunk } from "./rag.model";
import { extractTextFromFile, chunkText } from "./rag.utils";
import { embedBatch } from "./rag.embeddings";
import { insertEmbedding } from "../vector/vector.service";
import { RagIngestPayload } from "./rag.types";
import { sequelize } from "../../db";

const BATCH_SIZE = 20;   // embed 20 chunks per API call
const BATCH_DELAY_MS = 1200; // ~1.2 s between batches

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function resetDocumentChunks(docId: string): Promise<void> {
    await sequelize.query(
        `
        DELETE FROM embeddings e
        USING rag_chunks rc
        WHERE e.entity_type = 'rag'
            AND e.entity_id = rc.id::text
            AND rc.doc_id = :docId
        `,
        { replacements: { docId } }
    );

    await RagChunk.destroy({ where: { doc_id: docId } });
}

export async function ingestDocument(payload: RagIngestPayload): Promise<void> {
    const { docId, bufferBase64 } = payload;

    const doc = await RagDocument.findByPk(docId);
    if (!doc) throw new Error(`RagDocument not found: ${docId}`);

    // Guard: skip if already done (idempotency for retried jobs)
    if (doc.status === "done") {
        logger.info({ docId }, "RAG: document already ingested, skipping");
        return;
    }

    if (doc.status === "processing") {
        logger.info({ docId }, "RAG: document already processing, skipping duplicate job");
        return;
    }

    await resetDocumentChunks(docId);
    await doc.update({ status: "processing", total_chunks: 0, error_message: null });

    try {
        const buffer = Buffer.from(bufferBase64, "base64");
        const text = await extractTextFromFile(buffer, doc.mime_type);
        const chunks = chunkText(text);

        logger.info({ docId, totalChunks: chunks.length }, "RAG: chunking complete");

        // Batch loop: embed + store

        for (let start = 0; start < chunks.length; start += BATCH_SIZE) {

            const batchChunks = chunks.slice(start, start + BATCH_SIZE);

            // Single API call embeds the entire batch
            const embeddings = await embedBatch(batchChunks);

            for (let i = 0; i < batchChunks.length; i++) {

                const chunkIndex = start + i;
                const content = batchChunks[i]!;
                const embedding = embeddings[i]!;

                // Store chunk metadata in rag_chunks
                const ragChunk = await RagChunk.create({
                    doc_id: docId,
                    chunk_index: chunkIndex,
                    content,
                });

                // Store vector in existing embeddings table
                await insertEmbedding(
                    "rag",         // entity_type - scopes vector search to RAG only
                    ragChunk.id,   // entity_id   - links back to rag_chunks row
                    content,
                    embedding,
                );
            }

            logger.info(
                { docId, progress: `${Math.min(start + BATCH_SIZE, chunks.length)}/${chunks.length}` },
                "RAG: batch embedded"
            );

            // Rate-limit guard between batches (except after last batch)
            if (start + BATCH_SIZE < chunks.length) {
                await sleep(BATCH_DELAY_MS);
            }
        }

        await doc.update({ status: "done", total_chunks: chunks.length });

        logger.info({ docId, totalChunks: chunks.length }, "RAG: ingestion complete");
    } catch (err) {
        await doc.update({
            status: "failed",
            error_message: String(err),
        });
        throw err; // re-throw so queue marks job as failed/retry
    }
}
