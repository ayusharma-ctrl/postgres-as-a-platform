# RAG Module

This module adds document-based Q&A on top of your own files.

## What is RAG?

Retrieval-Augmented Generation (RAG) grounds an LLM's answer in
your own documents instead of its training data. The model only
"sees" what you retrieve - it cannot hallucinate facts that aren't
in your files.

## What It Handles

- Upload PDF/DOCX files
- Extract and chunk text
- Generate embeddings
- Store chunks + vectors in PostgreSQL
- Retrieve context for a question and call LLM for grounded answer

## API Endpoints

- `POST /api/v1/rag/upload`
- `GET /api/v1/rag/docs/:docId`
- `POST /api/v1/rag/query`

## Upload Flow (Async)

1. Hash file bytes (`SHA-256`) for deduplication.
2. Create/lookup `rag_documents` row.
3. Queue `rag_ingest` job and return `202`.
4. Worker extracts text, chunks it, embeds in batches, and stores:
   - metadata in `rag_chunks`
   - vectors in shared `embeddings` table (`entity_type = 'rag'`)

## Retry Behavior

- If same file hash already exists with `status = failed`, upload does not return `409`.
- Instead, it resets document state and re-queues ingestion.
- Existing partial chunks/embeddings for that document are cleared before retry processing.

## Query Flow

1. Embed question (`RETRIEVAL_QUERY`).
2. Run in parallel:
   - vector search on `embeddings` (cosine distance)
   - full-text search on `rag_chunks`
3. Merge both lists using RRF.
4. Take top chunks, build prompt context, invoke LLM, return answer + sources.

## Important Relevance Note

- Selection is rank-based; there is no hard minimum similarity threshold.
- So short/single-word queries can still return top-ranked chunks even if lexical match is weak.

## Main Tables

- `rag_documents`: upload lifecycle (`pending/processing/done/failed`)
- `rag_chunks`: chunked document text
- `embeddings`: shared vector store (`vector(1536)`)

## Operational Notes

- PDF parser may emit warnings for unsupported form/link fields. These are usually non-fatal.
- To reduce parser logs, set `PDF2JSON_DISABLE_LOGS=1` in environment.

## API Response

### Upload Response

```json
{
  "success": true,
  "data": {
    "docId": "8b9d9d8a-14db-4e95-b44b-185760df84a8",
    "status": "queued",
    "message": "Previous failed upload found. Re-ingestion queued."
  }
}
```

### Query Request / Response

```json
// Request Body
{ "question": "Has Ayush ever worked at Zipteams?" }

// Response
{
    "success": true,
    "data": {
        "answer": "Yes, Ayush worked as an SDE 1 (Full Stack Engineer) at Zipteams from Sept 2023 - Apr 2025 [2].",
        "sources": [
            {
                "fileName": "Resume - Ayush Sharma.pdf",
                "chunkIndex": 4,
                "excerpt": "ineers and contributing \nto system design reviews. SDE 1 (Full Stack Engineer)\n | \nSept 2023 - Apr 2025\n \nZipteams\n | \nRemote\n \n●    Integrated video …"
            },
            ...
        ]
    }
}
```

## Additional Notes

- **Context cap**: max 5 chunks sent to LLM
- **Chunk truncation**: each chunk capped at 600 chars
- **Chunk batches**: chunks are embedded in batches of 20 per API call to LLM
- **Embeddings delay**: 1.2 s delay between batches to stay within Gemini RPM limits

### How RRF Works

Two independent searches run in parallel:

- **Vector search**: finds semantically similar chunks (great for paraphrase)
- **FTS search**: finds exact keyword matches (great for names, IDs, terms)

Reciprocal Rank Fusion (RRF) merges them:

> score(chunk) = Σ 1 / (60 + rank)

A chunk appearing in **both** lists gets double-scored → naturally floats to top.

### Adding Metadata Filtering (Future)

To filter RAG search by specific document(s), add a `docId` filter to
both SQL queries in `rag.service.ts`:

```sql
-- Vector search addition:
AND rc.doc_id = :docId

-- FTS search addition:
AND rc.doc_id = :docId
```

Then accept `docId?` in the `POST /query` body.
