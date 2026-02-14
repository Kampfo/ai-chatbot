import axios from 'axios';

const API_URL = '/api/analysis';

export type AnalysisType = 'RISK' | 'SUMMARY' | 'COMPLIANCE' | 'CUSTOM';

export interface DocumentAnalysis {
    id: string;
    file_id: string;
    analysis_type: AnalysisType;
    prompt: string | null;
    result: string | null;
    created_at: string | null;
}

export const analyzeDocument = async (
    fileId: string,
    analysisType: AnalysisType,
    customPrompt?: string,
): Promise<DocumentAnalysis> => {
    const response = await axios.post(`${API_URL}/document/${fileId}`, {
        analysis_type: analysisType,
        custom_prompt: customPrompt,
    });
    return response.data;
};

export const getAnalyses = async (fileId: string): Promise<DocumentAnalysis[]> => {
    const response = await axios.get(`${API_URL}/document/${fileId}`);
    return response.data;
};
