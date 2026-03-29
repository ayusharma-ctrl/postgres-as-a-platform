/* Chunk produced during extraction */
export interface DocumentChunk {
    content: string;
    chunkIndex: number;
    pageNumber?: number;
}

/* Metadata stored alongside each chunk */
export interface RagChunkMeta {
    docId: string;
    fileName: string;
    chunkIndex: number;
    pageNumber?: number | null;
}

/* Single result from hybrid search */
export interface HybridSearchResult {
    chunkId: string;
    content: string;
    score: number;
    matchedBy: "vector" | "fulltext" | "hybrid";
    meta: RagChunkMeta;
}

/* Final answer returned to client */
export interface RAGQueryResult {
    answer: string;
    sources: Array<{
        fileName: string;
        chunkIndex: number;
        excerpt: string;
    }>;
}

/* Queue job payload */
export interface RagIngestPayload {
    docId: string;
    bufferBase64: string; // file buffer encoded as base64 to survive queue serialization
}
