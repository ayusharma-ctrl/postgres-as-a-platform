import { QueryTypes } from "sequelize";
import { sequelize } from "../../db";
import {
    EmbeddingVector,
    SimilarityResult
} from "./vector.types";


export async function insertEmbedding(
    entityType: string,
    entityId: string,
    content: string,
    embedding: EmbeddingVector
): Promise<void> {
    const vectorLiteral = `[${embedding.join(",")}]`;

    await sequelize.query(`
        INSERT INTO embeddings (entity_type, entity_id, content, embedding)
        VALUES (:entityType, :entityId, :content, :embedding::vector)
        `,
        {
            replacements: {
                entityType,
                entityId,
                content,
                embedding: vectorLiteral,
            }
        }
    );
}

export async function searchSimilar(
    embedding: EmbeddingVector,
    limit: number = 5
): Promise<SimilarityResult[]> {

    const vectorLiteral = `[${embedding.join(",")}]`;

    /*
        <=> is cosine distance operator
        1 - distance gives similarity score
    */
    const results =
        await sequelize.query<SimilarityResult>(`
            SELECT
                id,
                entity_type,
                entity_id,
                content,
                1 - (embedding <=> :embedding::vector) AS similarity
            FROM embeddings
            ORDER BY embedding <=> :embedding::vector
            LIMIT :limit
            `,
            {
                replacements: {
                    embedding: vectorLiteral,
                    limit
                },

                type: QueryTypes.SELECT
            }
        );

    return results;
}
