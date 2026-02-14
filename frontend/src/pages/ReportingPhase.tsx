import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileBarChart, Download, RefreshCw, Clock } from 'lucide-react';
import type { Audit } from '../services/auditService';
import { updateAuditStatus } from '../services/auditService';
import { generateReport, getReports } from '../services/reportService';
import type { AuditReport } from '../services/reportService';

interface AuditDetailContext {
    audit: Audit;
    setAudit: (audit: Audit) => void;
}

const ReportingPhase: React.FC = () => {
    const { audit, setAudit } = useOutletContext<AuditDetailContext>();
    const [reports, setReports] = useState<AuditReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);

    useEffect(() => {
        loadReports();
    }, [audit.id]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await getReports(audit.id);
            setReports(data);
            if (data.length > 0) {
                setSelectedReport(data[0]);
            }
        } catch (error) {
            console.error('Failed to load reports', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (useAi: boolean) => {
        setGenerating(true);
        try {
            const report = await generateReport(audit.id, useAi);
            setReports(prev => [report, ...prev]);
            setSelectedReport(report);
        } catch (error) {
            console.error('Failed to generate report', error);
        } finally {
            setGenerating(false);
        }
    };

    const handleAdvanceToTracking = async () => {
        try {
            const updated = await updateAuditStatus(audit.id, 'MASSNAHMENVERFOLGUNG');
            setAudit(updated);
        } catch (error) {
            console.error('Failed to advance status', error);
        }
    };

    const handleDownloadMarkdown = () => {
        if (!selectedReport?.content_markdown) return;
        const blob = new Blob([selectedReport.content_markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Pruefungsbericht_${audit.title.replace(/\s+/g, '_')}_v${selectedReport.version}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-8 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Berichterstattung</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleGenerate(true)}
                        disabled={generating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                        {generating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileBarChart className="w-4 h-4" />
                        )}
                        {generating ? 'Wird generiert...' : 'Bericht generieren (KI)'}
                    </button>
                    <button
                        onClick={() => handleGenerate(false)}
                        disabled={generating}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
                    >
                        Ohne KI
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Laden...</div>
            ) : reports.length === 0 ? (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                    <FileBarChart className="w-16 h-16 mx-auto text-blue-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Noch kein Bericht erstellt</h3>
                    <p className="text-gray-500 mb-6">
                        Klicken Sie auf "Bericht generieren", um einen Prüfungsbericht basierend auf Ihren Feststellungen, Risiken und Dokumenten zu erstellen.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-6">
                    {/* Version list */}
                    <div className="col-span-1 space-y-2">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">Versionen</h3>
                        {reports.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => setSelectedReport(r)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                    selectedReport?.id === r.id
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                <div className="font-medium">Version {r.version}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    {r.generated_at ? new Date(r.generated_at).toLocaleString('de-DE') : ''}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Report content */}
                    <div className="col-span-3">
                        {selectedReport && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
                                    <span className="text-sm font-medium text-gray-600">
                                        Version {selectedReport.version}
                                    </span>
                                    <button
                                        onClick={handleDownloadMarkdown}
                                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1"
                                    >
                                        <Download className="w-4 h-4" />
                                        Markdown herunterladen
                                    </button>
                                </div>
                                <div className="p-6 prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 max-h-[70vh] overflow-y-auto">
                                    {selectedReport.content_markdown}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {audit.status === 'BERICHTERSTATTUNG' && (
                <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">Bericht abgeschlossen?</h3>
                    <p className="text-sm text-blue-600 mb-4">
                        Wechseln Sie zur Maßnahmenverfolgung, um die Umsetzung der empfohlenen Maßnahmen zu überwachen.
                    </p>
                    <button
                        onClick={handleAdvanceToTracking}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Zur Maßnahmenverfolgung wechseln
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReportingPhase;
