import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "../../config/index";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const EMBED_MODEL = "gemini-embedding-001";
const OUTPUT_DIMS = 1536;

export const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: env.GEMINI_API_KEY,
    maxOutputTokens: 512,
    temperature: 0.2
});

export async function embedText(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
        model: EMBED_MODEL,
        contents: text,
        config: {
            taskType: "RETRIEVAL_QUERY",
            outputDimensionality: OUTPUT_DIMS
        }
    });

    return response.embeddings![0]!.values!;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(
        texts.map(text =>
            ai.models.embedContent({
                model: EMBED_MODEL,
                contents: text,
                config: {
                    taskType: "RETRIEVAL_DOCUMENT",
                    outputDimensionality: OUTPUT_DIMS
                }
            })
        )
    );

    return results.map(r => r.embeddings![0]!.values!);
}
