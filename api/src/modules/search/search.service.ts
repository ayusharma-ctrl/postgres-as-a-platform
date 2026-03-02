import { QueryTypes } from "sequelize";
import { sequelize } from "../../db";
import { randomUUID } from "crypto";
import { SearchDocument } from "./search.model";
import {
    FullTextSearchResult,
    FuzzySearchResult,
    GeneratedDocument,
    SearchDocumentsOptions,
    SearchDocumentsResponse,
} from "./search.types";
import { ACTIONS, NOUNS, TOPICS } from "./search.constant";

function pickOne(values: string[]): string {
    const index = Math.floor(Math.random() * values.length);
    return values[index] ?? values[0];
}

function pickMany(values: string[], count: number): string[] {
    const pool = [...values];
    const picked: string[] = [];

    while (picked.length < count && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        const [item] = pool.splice(index, 1);

        if (item) {
            picked.push(item);
        }
    }

    return picked;
}

function generateDocument(index: number): GeneratedDocument {
    const topic = pickOne(TOPICS);
    const action = pickOne(ACTIONS);
    const noun = pickOne(NOUNS);
    const tags = pickMany(TOPICS, 3);

    const title = `${topic.toUpperCase()} guide for ${action} ${noun}`;
    const summary = `Production notes for ${topic} focused on ${action} ${noun}.`;
    const body = [
        `This document explains how teams handle ${topic} in production.`,
        `It covers ${action} ${noun} with measurable guardrails.`,
        `It also includes recovery patterns and rollout strategy for realistic operations.`
    ].join(" ");

    return {
        id: randomUUID(),
        title,
        summary,
        body,
        tags,
        metadata: {
            source: "seed",
            batch: new Date().toISOString().slice(0, 10),
            ordinal: index + 1
        }
    };
}

export async function seedSearchDocuments(count: number): Promise<number> {
    const payload = Array.from({ length: count }, (_, i) => generateDocument(i));
    await SearchDocument.bulkCreate(payload);
    return payload.length;
}

export async function fullTextSearchDocuments(query: string, limit = 20): Promise<FullTextSearchResult[]> {
    // keep limit in a safe range so one request cannot pull an oversized response
    const cappedLimit = Math.max(1, Math.min(limit, 100));

    // Full-text search is our "meaning-first" path:
    // 1) Turn the user query into a tsquery using English rules.
    // 2) Match that against search_vector (already indexed).
    // 3) Rank by relevance, then use latest record as tie-breaker.
    const results = await sequelize.query<FullTextSearchResult>(`
        WITH q AS (
            SELECT websearch_to_tsquery('english', :query) AS tsq
        )
        SELECT
            d.id,
            d.title,
            d.summary,
            d.tags,
            d.metadata,
            ts_rank_cd(d.search_vector, q.tsq) AS rank
        FROM search_documents d
        CROSS JOIN q
        WHERE d.search_vector @@ q.tsq
        ORDER BY rank DESC, d.created_at DESC
        LIMIT :limit;
        `,
        {
            replacements: { query, limit: cappedLimit },
            type: QueryTypes.SELECT
        }
    );

    return results;
}

export async function fuzzySearchDocuments(
    query: string,
    limit = 20,
    threshold = 0.25
): Promise<FuzzySearchResult[]> {
    // keep both limit and threshold in a practical range for stable behavior.
    const cappedLimit = Math.max(1, Math.min(limit, 100));
    const normalizedThreshold = Math.max(0.15, Math.min(threshold, 0.9));
    const effectiveThreshold = query.trim().length <= 3
        ? Math.min(normalizedThreshold, 0.18)
        : normalizedThreshold;

    // Fuzzy search is our "typo-friendly" path:
    // 1) Configure trigram thresholds for this query.
    // 2) Build candidates from title/summary/tags (high-signal fields).
    // 3) Score candidates with weighted similarity.
    // 4) Keep only rows above threshold and sort by best score.
    const results = await sequelize.query<FuzzySearchResult>(`
        WITH cfg AS (
            SELECT
                set_config('pg_trgm.similarity_threshold', CAST(:threshold AS text), true) AS sim_threshold,
                set_config('pg_trgm.word_similarity_threshold', CAST(:threshold AS text), true) AS word_threshold
        ),
        candidates AS (
            SELECT
                d.id,
                d.title,
                d.summary,
                d.tags,
                d.metadata,
                d.created_at,
                array_to_string(d.tags, ' ') AS tags_text
            FROM search_documents d
            CROSS JOIN cfg
            WHERE d.title ILIKE '%' || :query || '%'
                OR d.summary ILIKE '%' || :query || '%'
                OR array_to_string(d.tags, ' ') ILIKE '%' || :query || '%'
                OR d.title % :query
                OR d.summary % :query
                OR array_to_string(d.tags, ' ') % :query
                OR :query <% d.title
                OR :query <% d.summary
                OR :query <% array_to_string(d.tags, ' ')
        ),
        scored AS (
            SELECT
                id,
                title,
                summary,
                tags,
                metadata,
                created_at,
                GREATEST(
                    word_similarity(:query, title) * 1.0,
                    similarity(title, :query) * 0.95,
                    word_similarity(:query, summary) * 0.7,
                    similarity(summary, :query) * 0.6,
                    word_similarity(:query, tags_text) * 1.1,
                    similarity(tags_text, :query) * 1.0
                ) AS score
            FROM candidates
        )
        SELECT
            id,
            title,
            summary,
            tags,
            metadata,
            score
        FROM scored
        WHERE score >= :threshold
        ORDER BY score DESC, created_at DESC
        LIMIT :limit;
        `,
        {
            replacements: {
                query,
                limit: cappedLimit,
                threshold: effectiveThreshold
            },
            type: QueryTypes.SELECT
        }
    );

    return results;
}

export async function searchDocuments(query: string, options: SearchDocumentsOptions = {}): Promise<SearchDocumentsResponse> {
    const mode = options.mode ?? "auto";
    const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
    const threshold = options.threshold ?? 0.25;
    const minFullTextResults = Math.max(1, Math.min(options.minFullTextResults ?? 10, limit));

    if (mode === "fulltext") {
        const fullText = await fullTextSearchDocuments(query, limit);
        return {
            mode,
            total: fullText.length,
            results: fullText.map((row) => ({
                ...row,
                matched_by: "fulltext"
            }))
        };
    }

    if (mode === "fuzzy") {
        const fuzzy = await fuzzySearchDocuments(query, limit, threshold);
        return {
            mode,
            total: fuzzy.length,
            results: fuzzy.map((row) => ({
                ...row,
                matched_by: "fuzzy"
            }))
        };
    }

    // Auto mode follows a common production pattern:
    // start with strict relevance, then use fuzzy fallback only if needed.
    const fullText = await fullTextSearchDocuments(query, limit);

    if (fullText.length >= minFullTextResults || fullText.length >= limit) {
        return {
            mode,
            total: fullText.length,
            results: fullText.map((row) => ({
                ...row,
                matched_by: "fulltext"
            }))
        };
    }

    const usedIds = new Set(fullText.map((row) => row.id));
    const remaining = limit - fullText.length;

    // Fetch extra fuzzy rows because some may overlap with full-text and get removed.
    const fuzzy = await fuzzySearchDocuments(query, Math.min(limit, remaining * 2), threshold);
    const fuzzyFallback = fuzzy
        .filter((row) => !usedIds.has(row.id))
        .slice(0, remaining)
        .map((row) => ({
            ...row,
            matched_by: "fuzzy" as const
        }));

    const merged = [
        ...fullText.map((row) => ({
            ...row,
            matched_by: "fulltext" as const
        })),
        ...fuzzyFallback
    ];

    return {
        mode,
        total: merged.length,
        results: merged
    };
}
