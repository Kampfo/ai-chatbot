import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Audit } from '../services/auditService';
import { updateAuditStatus } from '../services/auditService';
import { getFindings, updateFinding } from '../services/findingService';
import type { Finding } from '../services/findingService';

interface AuditDetailContext {
    audit: Audit;
    setAudit: (audit: Audit) => void;
}

const ACTION_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    OPEN: { label: 'Offen', color: 'bg-red-50 border-red-200', icon: AlertCircle },
    IN_PROGRESS: { label: 'In Bearbeitung', color: 'bg-yellow-50 border-yellow-200', icon: Clock },
    DONE: { label: 'Erledigt', color: 'bg-green-50 border-green-200', icon: CheckCircle },
};

const ActionTrackingPhase: React.FC = () => {
    const { audit, setAudit } = useOutletContext<AuditDetailContext>();
    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [actionForm, setActionForm] = useState({ action_description: '', action_due_date: '', action_status: 'OPEN' });

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

    const handleSaveAction = async (findingId: string) => {
        try {
            await updateFinding(findingId, actionForm);
            setEditingId(null);
            loadFindings();
        } catch (error) {
            console.error('Failed to save action', error);
        }
    };

    const handleActionStatusChange = async (findingId: string, newStatus: string) => {
        try {
            await updateFinding(findingId, { action_status: newStatus });
            loadFindings();
        } catch (error) {
            console.error('Failed to update action status', error);
        }
    };

    const startEditing = (finding: Finding) => {
        setEditingId(finding.id);
        setActionForm({
            action_description: finding.action_description || '',
            action_due_date: finding.action_due_date || '',
            action_status: finding.action_status || 'OPEN',
        });
    };

    // Statistiken
    const withActions = findings.filter(f => f.action_description);
    const stats = {
        total: findings.length,
        withActions: withActions.length,
        done: withActions.filter(f => f.action_status === 'DONE').length,
        overdue: withActions.filter(f => f.action_due_date && new Date(f.action_due_date) < new Date() && f.action_status !== 'DONE').length,
    };

    const progressPercent = stats.withActions > 0 ? Math.round((stats.done / stats.withActions) * 100) : 0;

    return (
        <div className="p-8 max-w-4xl">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Maßnahmenverfolgung</h2>

            {/* Fortschritt */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Fortschritt</h3>
                    <span className="text-2xl font-bold text-blue-600">{progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4 text-center">
                    <div>
                        <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                        <p className="text-xs text-gray-500">Feststellungen</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-900">{stats.withActions}</p>
                        <p className="text-xs text-gray-500">Mit Maßnahme</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-green-600">{stats.done}</p>
                        <p className="text-xs text-gray-500">Erledigt</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-red-600">{stats.overdue}</p>
                        <p className="text-xs text-gray-500">Überfällig</p>
                    </div>
                </div>
            </div>

            {/* Findings mit Maßnahmen */}
            {loading ? (
                <div className="text-center py-8 text-gray-500">Laden...</div>
            ) : findings.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                    <p className="text-gray-500">Keine Feststellungen vorhanden. Erstellen Sie Feststellungen in der Durchführungsphase.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {findings.map((finding) => {
                        const statusConfig = ACTION_STATUS_CONFIG[finding.action_status || 'OPEN'];
                        const isOverdue = finding.action_due_date && new Date(finding.action_due_date) < new Date() && finding.action_status !== 'DONE';
                        const isEditing = editingId === finding.id;

                        return (
                            <div key={finding.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}>
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-gray-800">{finding.title}</h4>
                                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${finding.severity === 'HIGH' ? 'bg-red-100 text-red-800' : finding.severity === 'LOW' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {finding.severity === 'HIGH' ? 'Hoch' : finding.severity === 'LOW' ? 'Niedrig' : 'Mittel'}
                                        </span>
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-3 space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Maßnahmenbeschreibung</label>
                                                <textarea
                                                    value={actionForm.action_description}
                                                    onChange={(e) => setActionForm({ ...actionForm, action_description: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                                    rows={2}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Fälligkeitsdatum</label>
                                                    <input
                                                        type="date"
                                                        value={actionForm.action_due_date}
                                                        onChange={(e) => setActionForm({ ...actionForm, action_due_date: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                                    <select
                                                        value={actionForm.action_status}
                                                        onChange={(e) => setActionForm({ ...actionForm, action_status: e.target.value })}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                                    >
                                                        <option value="OPEN">Offen</option>
                                                        <option value="IN_PROGRESS">In Bearbeitung</option>
                                                        <option value="DONE">Erledigt</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Abbrechen</button>
                                                <button onClick={() => handleSaveAction(finding.id)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Speichern</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-2">
                                            {finding.action_description ? (
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-700">{finding.action_description}</p>
                                                        {finding.action_due_date && (
                                                            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                                                Fällig: {new Date(finding.action_due_date).toLocaleDateString('de-DE')}
                                                                {isOverdue && ' (überfällig)'}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={finding.action_status || 'OPEN'}
                                                            onChange={(e) => handleActionStatusChange(finding.id, e.target.value)}
                                                            className="text-xs px-2 py-1 border border-gray-300 rounded"
                                                        >
                                                            <option value="OPEN">Offen</option>
                                                            <option value="IN_PROGRESS">In Bearbeitung</option>
                                                            <option value="DONE">Erledigt</option>
                                                        </select>
                                                        <button onClick={() => startEditing(finding)} className="text-xs text-blue-600 hover:underline">Bearbeiten</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(finding)}
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    + Maßnahme hinzufügen
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ActionTrackingPhase;
