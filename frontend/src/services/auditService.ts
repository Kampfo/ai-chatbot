import axios from 'axios';

const API_URL = 'http://localhost:8000/audits'; // Adjust based on environment

export interface Audit {
    id: number;
    title: string;
    description: string;
    status: string;
    created_at: string;
}

export const getAudits = async (): Promise<Audit[]> => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const createAudit = async (audit: { title: string; description: string }) => {
    const response = await axios.post(API_URL, audit);
    return response.data;
};
