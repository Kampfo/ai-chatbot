import React, { useState } from 'react';
import { uploadDocument } from '../services/documentService';
import { Upload, Check, AlertCircle } from 'lucide-react';

interface DocumentUploadProps {
    auditId: number;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ auditId }) => {
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);
            setStatus('idle');
            try {
                await uploadDocument(auditId, file);
                setStatus('success');
            } catch (error) {
                console.error("Upload failed", error);
                setStatus('error');
            } finally {
                setUploading(false);
            }
        }
    };

    return (
        <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 transition-colors w-fit">
                <Upload className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Upload Document</span>
                <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
            </label>

            {uploading && <span className="ml-2 text-sm text-gray-500">Uploading...</span>}
            {status === 'success' && <span className="ml-2 text-sm text-green-600 flex items-center gap-1 inline-flex"><Check className="w-3 h-3" /> Done</span>}
            {status === 'error' && <span className="ml-2 text-sm text-red-600 flex items-center gap-1 inline-flex"><AlertCircle className="w-3 h-3" /> Failed</span>}
        </div>
    );
};

export default DocumentUpload;
