import axios from 'axios';

const API_URL = '/api/risks';

export interface Risk {
    id: number;
    audit_id: number;
    title: string;
    description: string | null;
    impact: string | null;
    likelihood: string | null;
    created_at: string | null;
}

export interface RiskCreate {
    title: string;
    description?: string;
    impact?: string;
    likelihood?: string;
}

export const getRisks = async (auditId: number): Promise<Risk[]> => {
    const response = await axios.get(`${API_URL}/audits/${auditId}`);
    return response.data;
};

export const createRisk = async (auditId: number, risk: RiskCreate): Promise<Risk> => {
    const response = await axios.post(`${API_URL}/audits/${auditId}`, risk);
    return response.data;
};

export const updateRisk = async (riskId: number, risk: Partial<RiskCreate>): Promise<Risk> => {
    const response = await axios.patch(`${API_URL}/${riskId}`, risk);
    return response.data;
};

export const deleteRisk = async (riskId: number): Promise<void> => {
    await axios.delete(`${API_URL}/${riskId}`);
};
