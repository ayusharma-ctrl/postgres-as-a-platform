function redactVectorLiterals(input: string): string {
    return input.replace(/\[[\d.,\s\-+eE]{80,}\]/g, "[embedding_vector_redacted]");
}

export function toSafeErrorMessage(error: unknown, maxLength = 500): string {
    const raw = error instanceof Error ? error.message : String(error);
    const redacted = redactVectorLiterals(raw);

    if (redacted.length <= maxLength) return redacted;
    return `${redacted.slice(0, maxLength)}...`;
}
