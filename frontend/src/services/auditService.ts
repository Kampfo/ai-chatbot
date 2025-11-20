import axios from 'axios';

const API_URL = '/api/audits'; // Relative path for Nginx proxy

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

export const updateAudit = async (id: number, audit: Partial<Audit>) => {
    const response = await axios.put(`${API_URL}/${id}`, audit);
    return response.data;
};
