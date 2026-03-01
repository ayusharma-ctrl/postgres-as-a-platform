import { QueryTypes } from "sequelize";
import { sequelize } from "../../db";

export interface SearchResult {
    id: string;
    type: string;
    payload: unknown;
    rank: number;
}

export async function searchJobs(query: string): Promise<SearchResult[]> {
    /* 
        We are using two different dictionary - 'simple' & 'english'
        Better use same dictionary for both ranking and filtering to maintain consistency 

        in where clause, we have two conditions, one is faster and ideal, checks for tsvector matches tsquery
        other condition is fallback, slower - not good for big tables, so avoid using this fallback query for large table
        also, we should consider ranking only for full-text matches
    */
    const results = await sequelize.query<SearchResult>(`
        SELECT
            id,
            type,
            payload,
            ts_rank(search_vector, plainto_tsquery('simple', :query)) AS rank
        FROM jobs
        WHERE
            search_vector @@ plainto_tsquery('english', :query) OR payload::text ILIKE '%' || :query || '%'
        ORDER BY rank DESC
        LIMIT 20
        `,
        {
            replacements: { query },
            type: QueryTypes.SELECT
        }
    );

    return results;
}

export async function searchJobsOptimized(query: string): Promise<SearchResult[]> {
    /*
        why this is optimized?
        removed the OR (fallback query), compute plainto_tsquery only once, not using multiple dictionary, only full-text matches
    */
    const results = await sequelize.query<SearchResult>(`
        WITH q AS (
            SELECT plainto_tsquery('english', :query) AS query
        )
        SELECT
            id,
            type,
            payload,
            ts_rank(search_vector, q.query) AS rank
        FROM jobs, q
        WHERE search_vector @@ q.query
        ORDER BY rank DESC
        LIMIT 20;
        `,
        {
            replacements: { query },
            type: QueryTypes.SELECT
        }
    );

    return results;
}
