import mammoth from "mammoth";
import PDFParser from "pdf2json";
import { createHash } from "crypto";

// SHA-256 hash of raw file bytes (deduplication key)
export function hashBuffer(buffer: Buffer): string {
    return createHash("sha256").update(buffer).digest("hex");
}

// Security: limit/cap individual chunk before sending to LLM, do not send entire data to LLM
export function truncateContext(content: string, maxChars = 600): string {
    if (content.length <= maxChars) return content;
    return content.slice(0, maxChars) + "…";
}

// method to read text from pdf file
const textFromPdf = async (fileBuffer: Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);

        pdfParser.on("pdfParser_dataReady", () => {
            const parsedText = pdfParser.getRawTextContent();
            resolve(parsedText);
        });

        pdfParser.on("pdfParser_dataError", () => {
            reject(new Error("Failed to parse PDF"));
        });

        pdfParser.parseBuffer(fileBuffer);
    });
}

// helper method to extract text from the uploaded file
export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        if (mimeType === "application/pdf") {
            return await textFromPdf(buffer);
        }

        if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        }

        throw new Error(`Unsupported file type: ${mimeType}`);
    } catch (e) {
        throw new Error(`Error in extractTextFromFile: ${e}`);
    }
}

/* Sentence-aware chunking
 *
 * Strategy:
 *  1. Normalise whitespace / newlines
 *  2. Split at sentence boundaries (. ! ?)
 *  3. Accumulate sentences until chunkSize is reached
 *  4. Carry `overlap` chars into the next chunk so context isn't lost
 *  5. Fall back to raw sliding window if no sentence boundaries exist
 */
export function chunkText(text: string, chunkSize = 600, overlap = 50): string[] {
    // 1
    const normalised = text
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    // 2
    const sentences = normalised
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
        if (current.length + sentence.length + 1 > chunkSize && current.length > 0) {
            chunks.push(current.trim());
            // carry overlap tail into next chunk to preserve context boundary
            current = current.slice(-overlap).trim() + " " + sentence;
        } else {
            current = current ? current + " " + sentence : sentence;
        }
    }

    if (current.trim().length > 0) {
        chunks.push(current.trim());
    }

    // Fallback: no sentence boundaries detected (e.g. tables / code blocks)
    if (chunks.length === 0) {
        let i = 0;
        while (i < normalised.length) {
            chunks.push(normalised.slice(i, i + chunkSize));
            i += chunkSize - overlap;
        }
    }

    // discard micro-fragments that carry no semantic value
    return chunks.filter(c => c.trim().length >= 30);
}
