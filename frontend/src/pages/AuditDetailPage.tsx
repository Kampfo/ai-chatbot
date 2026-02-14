import { useEffect, useState } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Search as SearchIcon, FileBarChart, CheckSquare, FolderOpen, Sparkles } from 'lucide-react';
import { getAudit } from '../services/auditService';
import type { Audit, AuditStatus } from '../services/auditService';
import Chat from '../components/Chat';

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

const phaseTabs = [
    { path: 'planung', label: 'Planung', icon: ClipboardList },
    { path: 'durchfuehrung', label: 'Durchführung', icon: SearchIcon },
    { path: 'bericht', label: 'Bericht', icon: FileBarChart },
    { path: 'massnahmen', label: 'Maßnahmen', icon: CheckSquare },
    { path: 'dokumente', label: 'Dokumente', icon: FolderOpen },
];

const AuditDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [audit, setAudit] = useState<Audit | null>(null);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        if (id) {
            setLoading(true);
            getAudit(Number(id))
                .then(setAudit)
                .catch(() => navigate('/audits'))
                .finally(() => setLoading(false));
        }
    }, [id, navigate]);

    if (loading) {
        return <div className="flex items-center justify-center h-full text-gray-500">Laden...</div>;
    }

    if (!audit) {
        return <div className="flex items-center justify-center h-full text-gray-500">Prüfung nicht gefunden</div>;
    }

    return (
        <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-5">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => navigate('/audits')} className="p-1.5 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{audit.title}</h1>
                                <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[audit.status]}`}>
                                    {STATUS_LABELS[audit.status]}
                                </span>
                            </div>
                            {audit.description && (
                                <p className="text-sm text-gray-500 mt-1">{audit.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showChat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            <Sparkles className="w-4 h-4" />
                            KI-Assistent
                        </button>
                    </div>

                    {/* Phase Tabs */}
                    <div className="flex gap-1">
                        {phaseTabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <NavLink
                                    key={tab.path}
                                    to={tab.path}
                                    className={({ isActive }) => `
                                        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                {/* Phase Content */}
                <div className="flex-1 overflow-y-auto">
                    <Outlet context={{ audit, setAudit }} />
                </div>
            </div>

            {/* Chat Sidebar */}
            {showChat && (
                <div className="w-[420px] border-l border-gray-200 flex flex-col">
                    <Chat auditId={audit.id} auditTitle={audit.title} />
                </div>
            )}
        </div>
    );
};

export default AuditDetailPage;
