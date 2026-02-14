import axios from 'axios';

const API_URL = '/api/findings';

export interface Finding {
    id: string;
    audit_id: number;
    title: string;
    description: string | null;
    severity: string | null;
    status: string;
    action_description: string | null;
    action_due_date: string | null;
    action_status: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface FindingCreate {
    title: string;
    description?: string;
    severity?: string;
}

export interface FindingUpdate {
    title?: string;
    description?: string;
    severity?: string;
    status?: string;
    action_description?: string;
    action_due_date?: string;
    action_status?: string;
}

export const getFindings = async (auditId: number): Promise<Finding[]> => {
    const response = await axios.get(`${API_URL}/audits/${auditId}`);
    return response.data;
};

export const getFinding = async (findingId: string): Promise<Finding> => {
    const response = await axios.get(`${API_URL}/${findingId}`);
    return response.data;
};

export const createFinding = async (auditId: number, finding: FindingCreate): Promise<Finding> => {
    const response = await axios.post(`${API_URL}/audits/${auditId}`, finding);
    return response.data;
};

export const updateFinding = async (findingId: string, finding: FindingUpdate): Promise<Finding> => {
    const response = await axios.patch(`${API_URL}/${findingId}`, finding);
    return response.data;
};
