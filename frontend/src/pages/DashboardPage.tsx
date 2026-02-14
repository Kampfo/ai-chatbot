import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, AlertTriangle, CheckCircle, Clock, FileText, ArrowRight } from 'lucide-react';
import { useAudits } from '../context/AuditContext';
import { getFindings } from '../services/findingService';
import type { Finding } from '../services/findingService';

interface DashboardStats {
    totalAudits: number;
    byStatus: Record<string, number>;
    totalFindings: number;
    openFindings: number;
    highSeverityFindings: number;
    overdueActions: number;
}

const STATUS_LABELS: Record<string, string> = {
    PLANUNG: 'Planung',
    DURCHFUEHRUNG: 'Durchführung',
    BERICHTERSTATTUNG: 'Berichterstattung',
    MASSNAHMENVERFOLGUNG: 'Maßnahmenverfolgung',
};

const STATUS_COLORS: Record<string, string> = {
    PLANUNG: 'bg-blue-100 text-blue-800',
    DURCHFUEHRUNG: 'bg-yellow-100 text-yellow-800',
    BERICHTERSTATTUNG: 'bg-purple-100 text-purple-800',
    MASSNAHMENVERFOLGUNG: 'bg-green-100 text-green-800',
};

const DashboardPage: React.FC = () => {
    const { audits, loading: auditsLoading } = useAudits();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        totalAudits: 0,
        byStatus: {},
        totalFindings: 0,
        openFindings: 0,
        highSeverityFindings: 0,
        overdueActions: 0,
    });
    const [allFindings, setAllFindings] = useState<Finding[]>([]);
    const [loadingFindings, setLoadingFindings] = useState(true);

    useEffect(() => {
        if (audits.length > 0) {
            loadAllFindings();
        } else {
            setLoadingFindings(false);
        }
    }, [audits]);

    const loadAllFindings = async () => {
        setLoadingFindings(true);
        try {
            const findingsPromises = audits.map(a => getFindings(a.id).catch(() => []));
            const results = await Promise.all(findingsPromises);
            const findings = results.flat();
            setAllFindings(findings);

            const now = new Date();
            setStats({
                totalAudits: audits.length,
                byStatus: audits.reduce((acc, a) => {
                    acc[a.status] = (acc[a.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                totalFindings: findings.length,
                openFindings: findings.filter(f => f.status === 'OPEN').length,
                highSeverityFindings: findings.filter(f => f.severity === 'HIGH').length,
                overdueActions: findings.filter(f =>
                    f.action_due_date &&
                    new Date(f.action_due_date) < now &&
                    f.action_status !== 'DONE'
                ).length,
            });
        } catch (error) {
            console.error('Failed to load findings', error);
        } finally {
            setLoadingFindings(false);
        }
    };

    const isLoading = auditsLoading || loadingFindings;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-8">Dashboard</h1>

            {isLoading ? (
                <div className="text-center py-16 text-gray-500">Laden...</div>
            ) : (
                <>
                    {/* Stats cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-sm text-gray-500">Prüfungen</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800">{stats.totalAudits}</div>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-yellow-600" />
                                </div>
                                <span className="text-sm text-gray-500">Offene Feststellungen</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800">{stats.openFindings}</div>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                </div>
                                <span className="text-sm text-gray-500">Hohe Priorität</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800">{stats.highSeverityFindings}</div>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Clock className="w-5 h-5 text-orange-600" />
                                </div>
                                <span className="text-sm text-gray-500">Überfällige Maßnahmen</span>
                            </div>
                            <div className="text-3xl font-bold text-red-600">{stats.overdueActions}</div>
                        </div>
                    </div>

                    {/* Audits by status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Prüfungen nach Status</h3>
                            <div className="space-y-3">
                                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                                    const count = stats.byStatus[status] || 0;
                                    const pct = stats.totalAudits > 0 ? (count / stats.totalAudits) * 100 : 0;
                                    return (
                                        <div key={status}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
                                                    {label}
                                                </span>
                                                <span className="text-gray-600">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent audits */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Aktuelle Prüfungen</h3>
                            {audits.length === 0 ? (
                                <p className="text-gray-400 text-sm">Keine Prüfungen vorhanden</p>
                            ) : (
                                <div className="space-y-2">
                                    {audits.slice(0, 5).map(audit => (
                                        <button
                                            key={audit.id}
                                            onClick={() => navigate(`/audits/${audit.id}`)}
                                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <div>
                                                <div className="text-sm font-medium text-gray-800">{audit.title}</div>
                                                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[audit.status]}`}>
                                                    {STATUS_LABELS[audit.status] || audit.status}
                                                </span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Overdue actions */}
                    {stats.overdueActions > 0 && (
                        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                            <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Überfällige Maßnahmen
                            </h3>
                            <div className="space-y-2">
                                {allFindings
                                    .filter(f =>
                                        f.action_due_date &&
                                        new Date(f.action_due_date) < new Date() &&
                                        f.action_status !== 'DONE'
                                    )
                                    .slice(0, 5)
                                    .map(f => (
                                        <div key={f.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-red-100">
                                            <div>
                                                <span className="text-sm font-medium text-gray-800">{f.title}</span>
                                                {f.action_description && (
                                                    <p className="text-xs text-gray-500 mt-0.5">{f.action_description}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-red-600 font-medium">
                                                Fällig: {f.action_due_date ? new Date(f.action_due_date).toLocaleDateString('de-DE') : ''}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {audits.length === 0 && (
                        <div className="text-center py-16">
                            <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">Willkommen beim Audit Manager</h3>
                            <p className="text-gray-400 mb-6">Erstellen Sie Ihre erste Prüfung, um loszulegen.</p>
                            <button
                                onClick={() => navigate('/audits')}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Zur Prüfungsübersicht
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DashboardPage;
