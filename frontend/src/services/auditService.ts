import axios from 'axios';

const API_URL = '/api/audits';

export type AuditStatus = 'PLANUNG' | 'DURCHFUEHRUNG' | 'BERICHTERSTATTUNG' | 'MASSNAHMENVERFOLGUNG';

export interface Audit {
    id: number;
    title: string;
    description: string | null;
    status: AuditStatus;
    audit_type: string | null;
    scope: string | null;
    objectives: string | null;
    start_date: string | null;
    end_date: string | null;
    responsible_person: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface AuditCreate {
    title: string;
    description?: string;
    audit_type?: string;
    scope?: string;
    objectives?: string;
    start_date?: string;
    end_date?: string;
    responsible_person?: string;
}

export const getAudits = async (): Promise<Audit[]> => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const getAudit = async (id: number): Promise<Audit> => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

export const createAudit = async (audit: AuditCreate): Promise<Audit> => {
    const response = await axios.post(API_URL, audit);
    return response.data;
};

export const updateAudit = async (id: number, audit: Partial<Audit>): Promise<Audit> => {
    const response = await axios.patch(`${API_URL}/${id}`, audit);
    return response.data;
};

export const updateAuditStatus = async (id: number, status: AuditStatus): Promise<Audit> => {
    const response = await axios.patch(`${API_URL}/${id}/status`, { status });
    return response.data;
};
