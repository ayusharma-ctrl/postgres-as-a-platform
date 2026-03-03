export type EmbeddingVector = number[];

export interface SimilarityResult {
    id: string;
    entity_type: string;
    entity_id: string;
    content: string;
    similarity: number;
}
