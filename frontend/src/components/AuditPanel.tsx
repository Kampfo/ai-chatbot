import React, { useState } from 'react';
import { PlusCircle, Edit, X, FileText } from 'lucide-react';
import type { Audit, AuditStatus } from '../services/auditService';
import { createAudit, updateAudit } from '../services/auditService';

interface AuditPanelProps {
    audits: Audit[];
    selectedAudit: Audit | null;
    onSelectAudit: (audit: Audit) => void;
    onAuditsChange: () => void;
}

const STATUS_LABELS: Record<AuditStatus, string> = {
    PLANUNG: 'Planung',
    DURCHFUEHRUNG: 'Durchführung',
    BERICHTERSTATTUNG: 'Berichterstattung',
    MASSNAHMENVERFOLGUNG: 'Maßnahmenverfolgung',
};

const STATUS_COLORS: Record<AuditStatus, string> = {
    PLANUNG: 'bg-gray-100 text-gray-800',
    DURCHFUEHRUNG: 'bg-yellow-100 text-yellow-800',
    BERICHTERSTATTUNG: 'bg-blue-100 text-blue-800',
    MASSNAHMENVERFOLGUNG: 'bg-green-100 text-green-800',
};

const AuditPanel: React.FC<AuditPanelProps> = ({
    audits,
    selectedAudit,
    onSelectAudit,
    onAuditsChange
}) => {
    const [showModal, setShowModal] = useState(false);
    const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
    const [formData, setFormData] = useState<{ title: string; description: string; status: AuditStatus }>({
        title: '',
        description: '',
        status: 'PLANUNG'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAudit) {
                await updateAudit(editingAudit.id, formData);
            } else {
                await createAudit({ title: formData.title, description: formData.description });
            }
            setShowModal(false);
            setEditingAudit(null);
            setFormData({ title: '', description: '', status: 'PLANUNG' });
            onAuditsChange();
        } catch (error) {
            console.error('Failed to save audit', error);
        }
    };

    const openEditModal = (audit: Audit) => {
        setEditingAudit(audit);
        setFormData({
            title: audit.title,
            description: audit.description || '',
            status: audit.status
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingAudit(null);
        setFormData({ title: '', description: '', status: 'PLANUNG' });
        setShowModal(true);
    };

    return (
        <div className="w-96 bg-gray-50 border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Prüfungen</h2>
                    <button
                        onClick={openCreateModal}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <PlusCircle className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-gray-500">{audits.length} Prüfungen insgesamt</p>
            </div>

            {/* Audit List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {audits.map((audit) => (
                    <div
                        key={audit.id}
                        onClick={() => onSelectAudit(audit)}
                        className={`
                            card-hover p-4 cursor-pointer group
                            ${selectedAudit?.id === audit.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}
                        `}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <h3 className="font-semibold text-gray-800 line-clamp-1">{audit.title}</h3>
                                </div>
                                {audit.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{audit.description}</p>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[audit.status] || 'bg-gray-100 text-gray-800'}`}>
                                        {STATUS_LABELS[audit.status] || audit.status}
                                    </span>
                                    <span className="text-xs text-gray-500">#{audit.id}</span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(audit);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden scale-in">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">
                                {editingAudit ? 'Prüfung bearbeiten' : 'Neue Prüfung'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={4}
                                />
                            </div>
                            {editingAudit && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as AuditStatus })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="PLANUNG">Planung</option>
                                        <option value="DURCHFUEHRUNG">Durchführung</option>
                                        <option value="BERICHTERSTATTUNG">Berichterstattung</option>
                                        <option value="MASSNAHMENVERFOLGUNG">Maßnahmenverfolgung</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {editingAudit ? 'Speichern' : 'Erstellen'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditPanel;
