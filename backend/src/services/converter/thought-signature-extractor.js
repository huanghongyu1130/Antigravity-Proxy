function extractThoughtSignature(value) {
    if (!value) return null;
    if (typeof value !== 'object') return null;
    const sig = value.thoughtSignature || value.thought_signature;
    if (!sig) return null;
    return String(sig);
}

export function extractThoughtSignatureFromPart(part) {
    if (!part || typeof part !== 'object') return null;

    return (
        extractThoughtSignature(part) ||
        extractThoughtSignature(part.metadata) ||
        extractThoughtSignature(part.functionCall) ||
        extractThoughtSignature(part.function_call) ||
        extractThoughtSignature(part.functionCall?.metadata) ||
        extractThoughtSignature(part.functionResponse) ||
        extractThoughtSignature(part.function_response) ||
        extractThoughtSignature(part.functionResponse?.metadata) ||
        null
    );
}

export function extractThoughtSignatureFromCandidate(candidate, data = null) {
    return (
        extractThoughtSignature(candidate) ||
        extractThoughtSignature(candidate?.content) ||
        extractThoughtSignature(data?.response) ||
        extractThoughtSignature(data) ||
        null
    );
}

