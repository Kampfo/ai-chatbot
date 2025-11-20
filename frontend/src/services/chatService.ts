// import axios from 'axios'; // Removed unused import

const API_URL = '/api/chat'; // Relative path for Nginx proxy // Adjust based on environment

export interface ChatSource {
    label: string;
    filename: string;
    snippet: string;
}

export interface ChatResponse {
    session_id: string;
    message: string;
    sources: ChatSource[];
}

export const sendMessage = async (
    auditId: number,
    message: string,
    sessionId: string | undefined,
    onChunk: (chunk: string) => void,
    onMetadata: (metadata: any) => void
): Promise<void> => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            audit_id: auditId.toString(),
            message,
            session_id: sessionId
        }),
    });

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const data = JSON.parse(line);
                if (data.type === 'metadata') {
                    onMetadata(data);
                } else if (data.type === 'content') {
                    onChunk(data.chunk);
                }
            } catch (e) {
                console.error("Error parsing stream line", e);
            }
        }
    }
};
