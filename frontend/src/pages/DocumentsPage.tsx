import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Upload, FileText, Trash2, File, FileSpreadsheet, Search, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { Audit } from '../services/auditService';
import { uploadDocument, getDocuments, deleteDocument } from '../services/documentService';
import type { UploadedDocument } from '../services/documentService';
import { analyzeDocument, getAnalyses } from '../services/analysisService';
import type { DocumentAnalysis, AnalysisType } from '../services/analysisService';

interface AuditDetailContext {
    audit: Audit;
    setAudit: (audit: Audit) => void;
}

const FILE_ICONS: Record<string, typeof FileText> = {
    'application/pdf': FileText,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': File,
};

const ANALYSIS_TYPES: { value: AnalysisType; label: string; description: string }[] = [
    { value: 'RISK', label: 'Risikoanalyse', description: 'Identifiziert Risiken und Schwachstellen' },
    { value: 'SUMMARY', label: 'Zusammenfassung', description: 'Erstellt eine strukturierte Zusammenfassung' },
    { value: 'COMPLIANCE', label: 'Compliance-Prüfung', description: 'Prüft auf regulatorische Anforderungen' },
    { value: 'CUSTOM', label: 'Benutzerdefiniert', description: 'Eigene Analyse-Anweisung' },
];

const DocumentsPage: React.FC = () => {
    const { audit } = useOutletContext<AuditDetailContext>();
    const [documents, setDocuments] = useState<UploadedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Analysis state
    const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
    const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType>('SUMMARY');
    const [customPrompt, setCustomPrompt] = useState('');
    const [analysisResults, setAnalysisResults] = useState<Record<string, DocumentAnalysis[]>>({});
    const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

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

    const handleAnalyze = async (fileId: string) => {
        setAnalysisLoading(true);
        try {
            const result = await analyzeDocument(
                fileId,
                selectedAnalysisType,
                selectedAnalysisType === 'CUSTOM' ? customPrompt : undefined,
            );
            setAnalysisResults(prev => ({
                ...prev,
                [fileId]: [result, ...(prev[fileId] || [])],
            }));
            setAnalyzingFileId(null);
            setExpandedDoc(fileId);
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setAnalysisLoading(false);
        }
    };

    const loadAnalyses = async (fileId: string) => {
        try {
            const results = await getAnalyses(fileId);
            setAnalysisResults(prev => ({ ...prev, [fileId]: results }));
        } catch (error) {
            console.error('Failed to load analyses', error);
        }
    };

    const toggleExpand = (fileId: string) => {
        if (expandedDoc === fileId) {
            setExpandedDoc(null);
        } else {
            setExpandedDoc(fileId);
            if (!analysisResults[fileId]) {
                loadAnalyses(fileId);
            }
        }
    };

    return (
        <div className="p-8 max-w-5xl">
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
                <div className="space-y-3">
                    {documents.map((doc) => {
                        const Icon = FILE_ICONS[doc.content_type || ''] || File;
                        const isExpanded = expandedDoc === doc.id;
                        const docAnalyses = analysisResults[doc.id] || [];

                        return (
                            <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="flex items-center px-4 py-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                        <span className="text-sm font-medium text-gray-800 truncate">{doc.filename}</span>
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                            {doc.filename.split('.').pop()?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs text-gray-400">
                                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString('de-DE') : '-'}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setAnalyzingFileId(analyzingFileId === doc.id ? null : doc.id);
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="KI-Analyse"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleExpand(doc.id)}
                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                                            title="Analysen anzeigen"
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Löschen"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Analysis trigger */}
                                {analyzingFileId === doc.id && (
                                    <div className="px-4 pb-3 border-t border-gray-100 pt-3 bg-blue-50">
                                        <div className="flex items-end gap-3">
                                            <div className="flex-1">
                                                <label className="text-xs font-medium text-gray-600 mb-1 block">Analysetyp</label>
                                                <select
                                                    value={selectedAnalysisType}
                                                    onChange={(e) => setSelectedAnalysisType(e.target.value as AnalysisType)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                >
                                                    {ANALYSIS_TYPES.map(t => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selectedAnalysisType === 'CUSTOM' && (
                                                <div className="flex-1">
                                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Anweisung</label>
                                                    <input
                                                        type="text"
                                                        value={customPrompt}
                                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                                        placeholder="Was soll analysiert werden?"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleAnalyze(doc.id)}
                                                disabled={analysisLoading}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                                            >
                                                <Search className="w-4 h-4" />
                                                {analysisLoading ? 'Analysiere...' : 'Analysieren'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Analyses */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50">
                                        {docAnalyses.length === 0 ? (
                                            <div className="px-4 py-6 text-center text-gray-400 text-sm">
                                                Noch keine Analysen für dieses Dokument
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {docAnalyses.map((analysis) => (
                                                    <div key={analysis.id} className="px-4 py-3">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                                {ANALYSIS_TYPES.find(t => t.value === analysis.analysis_type)?.label || analysis.analysis_type}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {analysis.created_at ? new Date(analysis.created_at).toLocaleString('de-DE') : ''}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                                            {analysis.result}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DocumentsPage;
