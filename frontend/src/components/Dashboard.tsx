import React, { useEffect, useState } from 'react';
import { getAudits, Audit, createAudit } from '../services/auditService';
import { PlusCircle, FileText, MessageSquare } from 'lucide-react';
import Chat from './Chat';
import DocumentUpload from './DocumentUpload';

const Dashboard: React.FC = () => {
    const [audits, setAudits] = useState<Audit[]>([]);
    const [newAuditTitle, setNewAuditTitle] = useState('');
    const [newAuditDesc, setNewAuditDesc] = useState('');
    const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        loadAudits();
    }, []);

    const loadAudits = async () => {
        try {
            const data = await getAudits();
            setAudits(data);
        } catch (error) {
            console.error("Failed to load audits", error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAuditTitle) return;
        await createAudit({ title: newAuditTitle, description: newAuditDesc });
        setNewAuditTitle('');
        setNewAuditDesc('');
        loadAudits();
    };

    const toggleChat = (auditId: number) => {
        if (selectedAuditId === auditId && showChat) {
            setShowChat(false);
        } else {
            setSelectedAuditId(auditId);
            setShowChat(true);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">Audit Dashboard</h1>

                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" /> Create New Audit
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                value={newAuditTitle}
                                onChange={(e) => setNewAuditTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                placeholder="e.g. Q4 Financial Audit"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                value={newAuditDesc}
                                onChange={(e) => setNewAuditDesc(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                placeholder="Scope and objectives..."
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Create Audit
                        </button>
                    </form>
                </div>

                <div className="grid gap-4">
                    {audits.map((audit) => (
                        <div key={audit.id} className={`bg-white p-4 rounded-lg shadow border transition-all ${selectedAuditId === audit.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:shadow-md'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-gray-500" /> {audit.title}
                                    </h3>
                                    <p className="text-gray-600 mt-1">{audit.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${audit.status === 'PLANNED' ? 'bg-yellow-100 text-yellow-800' :
                                            audit.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'
                                        }`}>
                                        {audit.status}
                                    </span>
                                    <button
                                        onClick={() => toggleChat(audit.id)}
                                        className={`flex items-center gap-1 text-sm px-3 py-1 rounded-md transition-colors ${selectedAuditId === audit.id && showChat ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        <MessageSquare className="w-4 h-4" /> {selectedAuditId === audit.id && showChat ? 'Close Chat' : 'AI Chat'}
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    Created: {new Date(audit.created_at).toLocaleDateString()}
                                </div>
                                <DocumentUpload auditId={audit.id} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showChat && selectedAuditId && (
                <Chat auditId={selectedAuditId} />
            )}
        </div>
    );
};

export default Dashboard;
