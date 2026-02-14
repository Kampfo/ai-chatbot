import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Upload, FileText, Trash2, File, FileSpreadsheet } from 'lucide-react';
import type { Audit } from '../services/auditService';
import { uploadDocument, getDocuments, deleteDocument } from '../services/documentService';
import type { UploadedDocument } from '../services/documentService';

interface AuditDetailContext {
    audit: Audit;
    setAudit: (audit: Audit) => void;
}

const FILE_ICONS: Record<string, typeof FileText> = {
    'application/pdf': FileText,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': File,
};

const DocumentsPage: React.FC = () => {
    const { audit } = useOutletContext<AuditDetailContext>();
    const [documents, setDocuments] = useState<UploadedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadDocuments();
    }, [audit.id]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const data = await getDocuments(audit.id);
            setDocuments(data);
        } catch (error) {
            console.error('Failed to load documents', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                await uploadDocument(audit.id, file);
            }
            loadDocuments();
        } catch (error) {
            console.error('Failed to upload', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId: string) => {
        try {
            await deleteDocument(fileId);
            setDocuments(prev => prev.filter(d => d.id !== fileId));
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
    };

    return (
        <div className="p-8 max-w-4xl">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Dokumente</h2>

            {/* Upload-Bereich */}
            <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-6 ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-2">
                    {uploading ? 'Wird hochgeladen...' : 'Dateien hierher ziehen oder klicken'}
                </p>
                <p className="text-xs text-gray-400 mb-4">PDF, DOCX, XLSX, TXT (max. 50MB)</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.xlsm,.txt"
                    onChange={(e) => handleUpload(e.target.files)}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    Dateien auswählen
                </button>
            </div>

            {/* Dokumenten-Liste */}
            {loading ? (
                <div className="text-center py-8 text-gray-500">Laden...</div>
            ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    Noch keine Dokumente hochgeladen
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Dateiname</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Typ</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Hochgeladen</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => {
                                const Icon = FILE_ICONS[doc.content_type || ''] || File;
                                return (
                                    <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Icon className="w-4 h-4 text-blue-600" />
                                                <span className="text-sm font-medium text-gray-800">{doc.filename}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {doc.filename.split('.').pop()?.toUpperCase()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString('de-DE') : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Löschen"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DocumentsPage;
