import axios from 'axios';

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

export const sendMessage = async (auditId: number, message: string, sessionId?: string): Promise<ChatResponse> => {
    const response = await axios.post(API_URL, {
        audit_id: auditId.toString(),
        message,
        session_id: sessionId
    });
    return response.data;
};
