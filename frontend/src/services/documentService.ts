import axios from 'axios';

const API_URL = 'http://localhost:8000/documents/upload'; // Adjust based on environment

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
