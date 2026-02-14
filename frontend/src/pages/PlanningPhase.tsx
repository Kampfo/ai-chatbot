import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Plus, Trash2 } from 'lucide-react';
import type { Audit, AuditStatus } from '../services/auditService';
import { updateAudit, updateAuditStatus } from '../services/auditService';

interface AuditDetailContext {
    audit: Audit;
    setAudit: (audit: Audit) => void;
}

const AUDIT_TYPES = [
    { value: 'COMPLIANCE', label: 'Compliance-Prüfung' },
    { value: 'OPERATIONAL', label: 'Betriebsprüfung' },
    { value: 'FINANCIAL', label: 'Finanzprüfung' },
    { value: 'IT', label: 'IT-Prüfung' },
    { value: 'PROCESS', label: 'Prozessprüfung' },
];

const PlanningPhase: React.FC = () => {
    const { audit, setAudit } = useOutletContext<AuditDetailContext>();
    const [formData, setFormData] = useState({
        audit_type: audit.audit_type || '',
        scope: audit.scope || '',
        objectives: audit.objectives || '',
        start_date: audit.start_date || '',
        end_date: audit.end_date || '',
        responsible_person: audit.responsible_person || '',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await updateAudit(audit.id, formData);
            setAudit(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save', error);
        } finally {
            setSaving(false);
        }
    };

    const handleAdvanceToExecution = async () => {
        try {
            const updated = await updateAuditStatus(audit.id, 'DURCHFUEHRUNG');
            setAudit(updated);
        } catch (error) {
            console.error('Failed to advance status', error);
        }
    };

    return (
        <div className="p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Prüfungsplanung</h2>
                <div className="flex items-center gap-3">
                    {saved && <span className="text-sm text-green-600">Gespeichert</span>}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Speichern...' : 'Speichern'}
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {/* Prüfungstyp */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">Prüfungsdetails</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prüfungstyp</label>
                            <select
                                value={formData.audit_type}
                                onChange={(e) => setFormData({ ...formData, audit_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Bitte wählen...</option>
                                {AUDIT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prüfungsleiter</label>
                            <input
                                type="text"
                                value={formData.responsible_person}
                                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Name des Prüfungsleiters"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Prüfungsumfang */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">Prüfungsumfang (Scope)</h3>
                    <textarea
                        value={formData.scope}
                        onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="Beschreiben Sie den Umfang der Prüfung..."
                    />
                </div>

                {/* Prüfungsziele */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">Prüfungsziele</h3>
                    <textarea
                        value={formData.objectives}
                        onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="Definieren Sie die Ziele der Prüfung..."
                    />
                </div>

                {/* Phase voranschreiten */}
                {audit.status === 'PLANUNG' && (
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <h3 className="font-semibold text-blue-800 mb-2">Bereit für die Durchführung?</h3>
                        <p className="text-sm text-blue-600 mb-4">
                            Wenn die Planung abgeschlossen ist, können Sie zur Durchführungsphase wechseln.
                        </p>
                        <button
                            onClick={handleAdvanceToExecution}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Zur Durchführung wechseln
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlanningPhase;
