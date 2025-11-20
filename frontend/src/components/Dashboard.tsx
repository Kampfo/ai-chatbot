import React, { useState, useEffect } from 'react';
import { getAudits } from '../services/auditService';
import type { Audit } from '../services/auditService';
import Sidebar from './Sidebar';
import Chat from './Chat';
import AuditPanel from './AuditPanel';
import DocumentUpload from './DocumentUpload';
import { Settings, User, Calendar, CheckSquare } from 'lucide-react';

const Dashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'audits' | 'planning' | 'actions' | 'settings' | 'profile'>('audits');
    const [audits, setAudits] = useState<Audit[]>([]);
    const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAudits();
    }, []);

    const loadAudits = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getAudits();
            setAudits(data);
        } catch (error) {
            console.error("Failed to load audits", error);
            setError("Konnte Prüfungen nicht laden. Backend evtl. nicht erreichbar.");
            // Don't throw, just log and continue
        } finally {
            setLoading(false);
        }
    };

    const renderRightPanel = () => {
        switch (activeTab) {
            case 'audits':
                return (
                    <AuditPanel
                        audits={audits}
                        selectedAudit={selectedAudit}
                        onSelectAudit={setSelectedAudit}
                        onAuditsChange={loadAudits}
                    />
                );

            case 'planning':
                return (
                    <div className="w-96 bg-gray-50 border-l border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Calendar className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-800">Prüfungsplanung</h2>
                        </div>
                        <div className="bg-white rounded-lg p-8 text-center">
                            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">Kalenderansicht kommt bald...</p>
                        </div>
                    </div>
                );

            case 'actions':
                return (
                    <div className="w-96 bg-gray-50 border-l border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckSquare className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-800">Maßnahmenverfolgung</h2>
                        </div>
                        <div className="bg-white rounded-lg p-8 text-center">
                            <CheckSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">Aufgabenverwaltung kommt bald...</p>
                        </div>
                    </div>
                );

            case 'settings':
                return (
                    <div className="w-96 bg-gray-50 border-l border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Settings className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-800">Einstellungen</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="card p-4">
                                <h3 className="font-semibold text-gray-800 mb-2">Erscheinungsbild</h3>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option>Hell</option>
                                    <option>Dunkel</option>
                                    <option>System</option>
                                </select>
                            </div>
                            <div className="card p-4">
                                <h3 className="font-semibold text-gray-800 mb-2">Sprache</h3>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option>Deutsch</option>
                                    <option>English</option>
                                </select>
                            </div>
                            <div className="card p-4">
                                <h3 className="font-semibold text-gray-800 mb-2">Benachrichtigungen</h3>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded" defaultChecked />
                                    <span className="text-sm text-gray-700">E-Mail-Benachrichtigungen</span>
                                </label>
                            </div>
                        </div>
                    </div>
                );

            case 'profile':
                return (
                    <div className="w-96 bg-gray-50 border-l border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <User className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-800">Profil</h2>
                        </div>
                        <div className="card p-6 text-center">
                            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center">
                                <User className="w-12 h-12 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Max Mustermann</h3>
                            <p className="text-sm text-gray-500 mb-4">max.mustermann@example.com</p>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                Profil bearbeiten
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Left Sidebar - Navigation */}
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Center - Chat */}
            <Chat
                auditId={selectedAudit?.id}
                auditTitle={selectedAudit?.title}
            />

            {/* Right Panel - Context Dependent */}
            {renderRightPanel()}

            {/* Hidden Document Upload (integrated into chat in future) */}
            <div className="hidden">
                {selectedAudit && <DocumentUpload auditId={selectedAudit.id} />}
            </div>
        </div>
    );
};

export default Dashboard;
