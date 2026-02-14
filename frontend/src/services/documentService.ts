import axios from 'axios';

const API_URL = '/api/upload';

export interface UploadedDocument {
    id: string;
    filename: string;
    content_type: string | null;
    created_at: string | null;
}

export const uploadDocument = async (auditId: number, file: File) => {
    const formData = new FormData();
    formData.append('audit_id', auditId.toString());
    formData.append('file', file);

    const response = await axios.post(API_URL, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getDocuments = async (auditId: number): Promise<UploadedDocument[]> => {
    const response = await axios.get(`${API_URL}/audits/${auditId}`);
    return response.data;
};

export const deleteDocument = async (fileId: string): Promise<void> => {
    await axios.delete(`${API_URL}/${fileId}`);
};
