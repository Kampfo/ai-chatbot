import axios from 'axios';

const API_URL = '/api/documents'; // Relative path for Nginx proxy // Adjust based on environment

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
