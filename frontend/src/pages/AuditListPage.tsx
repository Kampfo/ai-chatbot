import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FileText, Search, X } from 'lucide-react';
import { useAudits } from '../context/AuditContext';
import type { AuditStatus } from '../services/auditService';

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

const AuditListPage: React.FC = () => {
    const { audits, loading, addAudit } = useAudits();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<AuditStatus | ''>('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '' });

    const filteredAudits = audits.filter(audit => {
        const matchesSearch = audit.title.toLowerCase().includes(search.toLowerCase()) ||
            (audit.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !filterStatus || audit.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const audit = await addAudit(formData);
            setShowCreateModal(false);
            setFormData({ title: '', description: '' });
            navigate(`/audits/${audit.id}`);
        } catch (error) {
            console.error('Failed to create audit', error);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Prüfungen</h1>
                    <p className="text-gray-500 mt-1">{audits.length} Prüfungen insgesamt</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <PlusCircle className="w-5 h-5" />
                    Neue Prüfung
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Prüfungen durchsuchen..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as AuditStatus | '')}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Alle Status</option>
                    <option value="PLANUNG">Planung</option>
                    <option value="DURCHFUEHRUNG">Durchführung</option>
                    <option value="BERICHTERSTATTUNG">Berichterstattung</option>
                    <option value="MASSNAHMENVERFOLGUNG">Maßnahmenverfolgung</option>
                </select>
            </div>

            {/* Audit Grid */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Laden...</div>
            ) : filteredAudits.length === 0 ? (
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">
                        {search || filterStatus ? 'Keine Prüfungen gefunden' : 'Noch keine Prüfungen vorhanden'}
                    </p>
                    {!search && !filterStatus && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Erste Prüfung erstellen
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAudits.map((audit) => (
                        <div
                            key={audit.id}
                            onClick={() => navigate(`/audits/${audit.id}`)}
                            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-gray-800 line-clamp-1">{audit.title}</h3>
                                </div>
                                <span className="text-xs text-gray-400">#{audit.id}</span>
                            </div>
                            {audit.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{audit.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                                <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[audit.status] || 'bg-gray-100 text-gray-800'}`}>
                                    {STATUS_LABELS[audit.status] || audit.status}
                                </span>
                                {audit.responsible_person && (
                                    <span className="text-xs text-gray-500">{audit.responsible_person}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">Neue Prüfung</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="z.B. IT-Sicherheitsprüfung Q1 2026"
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
                                    placeholder="Kurze Beschreibung des Prüfungsumfangs..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
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

export default AuditListPage;
