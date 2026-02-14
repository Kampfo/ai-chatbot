import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Audit } from '../services/auditService';
import { updateAuditStatus } from '../services/auditService';
import { getFindings, createFinding, updateFinding } from '../services/findingService';
import type { Finding, FindingCreate, FindingUpdate } from '../services/findingService';

interface AuditDetailContext {
    audit: Audit;
    setAudit: (audit: Audit) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
};

const SEVERITY_LABELS: Record<string, string> = {
    HIGH: 'Hoch',
    MEDIUM: 'Mittel',
    LOW: 'Niedrig',
};

const ExecutionPhase: React.FC = () => {
    const { audit, setAudit } = useOutletContext<AuditDetailContext>();
    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FindingCreate>({ title: '', description: '', severity: 'MEDIUM' });

    useEffect(() => {
        loadFindings();
    }, [audit.id]);

    const loadFindings = async () => {
        setLoading(true);
        try {
            const data = await getFindings(audit.id);
            setFindings(data);
        } catch (error) {
            console.error('Failed to load findings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createFinding(audit.id, formData);
            setFormData({ title: '', description: '', severity: 'MEDIUM' });
            setShowForm(false);
            loadFindings();
        } catch (error) {
            console.error('Failed to create finding', error);
        }
    };

    const handleStatusChange = async (findingId: string, newStatus: string) => {
        try {
            await updateFinding(findingId, { status: newStatus });
            loadFindings();
        } catch (error) {
            console.error('Failed to update finding', error);
        }
    };

    const handleAdvanceToReporting = async () => {
        try {
            const updated = await updateAuditStatus(audit.id, 'BERICHTERSTATTUNG');
            setAudit(updated);
        } catch (error) {
            console.error('Failed to advance status', error);
        }
    };

    const stats = {
        total: findings.length,
        open: findings.filter(f => f.status === 'OPEN').length,
        high: findings.filter(f => f.severity === 'HIGH').length,
    };

    return (
        <div className="p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Prüfungsdurchführung</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Neue Feststellung
                </button>
            </div>

            {/* Statistiken */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-500">Feststellungen</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
                    <p className="text-sm text-gray-500">Offen</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <p className="text-2xl font-bold text-red-600">{stats.high}</p>
                    <p className="text-sm text-gray-500">Hohes Risiko</p>
                </div>
            </div>

            {/* Feststellungen-Liste */}
            {loading ? (
                <div className="text-center py-8 text-gray-500">Laden...</div>
            ) : findings.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                    <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Noch keine Feststellungen dokumentiert</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {findings.map((finding) => (
                        <div key={finding.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                onClick={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${SEVERITY_COLORS[finding.severity || 'MEDIUM']}`}>
                                        {SEVERITY_LABELS[finding.severity || 'MEDIUM']}
                                    </span>
                                    <h4 className="font-medium text-gray-800">{finding.title}</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={finding.status}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(finding.id, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs px-2 py-1 border border-gray-300 rounded"
                                    >
                                        <option value="OPEN">Offen</option>
                                        <option value="IN_PROGRESS">In Bearbeitung</option>
                                        <option value="CLOSED">Geschlossen</option>
                                    </select>
                                    {expandedId === finding.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>
                            </div>
                            {expandedId === finding.id && (
                                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                                    {finding.description && (
                                        <div className="mt-3">
                                            <p className="text-xs font-medium text-gray-500 mb-1">Beschreibung</p>
                                            <p className="text-sm text-gray-700">{finding.description}</p>
                                        </div>
                                    )}
                                    {finding.action_description && (
                                        <div className="mt-3">
                                            <p className="text-xs font-medium text-gray-500 mb-1">Maßnahme</p>
                                            <p className="text-sm text-gray-700">{finding.action_description}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Zur Berichterstattung wechseln */}
            {audit.status === 'DURCHFUEHRUNG' && (
                <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">Durchführung abschließen?</h3>
                    <p className="text-sm text-blue-600 mb-4">
                        Wechseln Sie zur Berichterstattungsphase, um den Prüfungsbericht zu erstellen.
                    </p>
                    <button
                        onClick={handleAdvanceToReporting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Zur Berichterstattung wechseln
                    </button>
                </div>
            )}

            {/* Create Finding Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-[550px]">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">Neue Feststellung</h3>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={4}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Schweregrad</label>
                                <select
                                    value={formData.severity || 'MEDIUM'}
                                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="LOW">Niedrig</option>
                                    <option value="MEDIUM">Mittel</option>
                                    <option value="HIGH">Hoch</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                                    Abbrechen
                                </button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Erstellen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutionPhase;
