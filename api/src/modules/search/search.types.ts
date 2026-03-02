export interface FullTextSearchResult {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    metadata: Record<string, unknown>;
    rank: number;
}

export interface FuzzySearchResult {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    metadata: Record<string, unknown>;
    score: number;
}

export type SearchMode = "auto" | "fulltext" | "fuzzy";

export interface SearchDocumentResult {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    metadata: Record<string, unknown>;
    rank?: number;
    score?: number;
    matched_by: "fulltext" | "fuzzy";
}

export interface GeneratedDocument {
    id: string;
    title: string;
    summary: string;
    body: string;
    tags: string[];
    metadata: Record<string, unknown>;
}

export interface SearchDocumentsOptions {
    mode?: SearchMode;
    limit?: number;
    threshold?: number;
    minFullTextResults?: number;
}

export interface SearchDocumentsResponse {
    mode: SearchMode;
    total: number;
    results: SearchDocumentResult[];
}
