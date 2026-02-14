import axios from 'axios';

const API_URL = '/api/reports';

export interface AuditReport {
    id: string;
    audit_id: number;
    version: number;
    content_markdown: string | null;
    generated_at: string | null;
}

export const generateReport = async (
    auditId: number,
    useAi: boolean = true,
): Promise<AuditReport> => {
    const response = await axios.post(`${API_URL}/audits/${auditId}/generate`, {
        use_ai: useAi,
    });
    return response.data;
};

export const getReports = async (auditId: number): Promise<AuditReport[]> => {
    const response = await axios.get(`${API_URL}/audits/${auditId}`);
    return response.data;
};

export const getReport = async (reportId: string): Promise<AuditReport> => {
    const response = await axios.get(`${API_URL}/${reportId}`);
    return response.data;
};
