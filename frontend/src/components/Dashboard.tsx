import React, { useState, useEffect } from 'react';
import { getAudits, createAudit, updateAudit } from '../services/auditService';
import type { Audit } from '../services/auditService';
import { PlusCircle, FileText, MessageSquare, Edit, X, Check } from 'lucide-react';
import Chat from './Chat';
import DocumentUpload from './DocumentUpload';

const Dashboard: React.FC = () => {
    const [audits, setAudits] = useState<Audit[]>([]);
    const [newAuditTitle, setNewAuditTitle] = useState('');
    const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
    const [editingAudit, setEditingAudit] = useState<Audit | null>(null);

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

    const handleCreateAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAuditTitle) return;
        try {
            await createAudit({ title: newAuditTitle, description: "New Audit" });
            setNewAuditTitle('');
            loadAudits();
        } catch (error) {
            console.error("Failed to create audit", error);
        }
    };

    const handleUpdateAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAudit) return;
        try {
            await updateAudit(editingAudit.id, {
                title: editingAudit.title,
                description: editingAudit.description,
                status: editingAudit.status
            });
            setEditingAudit(null);
            loadAudits();
            // Update selected audit if it's the one being edited
            if (selectedAudit?.id === editingAudit.id) {
                setSelectedAudit(prev => prev ? { ...prev, ...editingAudit } : null);
            }
        } catch (error) {
            console.error("Failed to update audit", error);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        Audit Manager
                    </h1>
                </div>

                <div className="p-4">
                    <form onSubmit={handleCreateAudit} className="mb-6">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newAuditTitle}
                                onChange={(e) => setNewAuditTitle(e.target.value)}
                                placeholder="New Audit..."
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors">
                                <PlusCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </form>

                    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                        {audits.map(audit => (
                            <div
                                key={audit.id}
                                className={`p-3 rounded-md cursor-pointer transition-colors group relative ${selectedAudit?.id === audit.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'}`}
                                onClick={() => setSelectedAudit(audit)}
                            >
                                <div className="font-medium text-gray-800 truncate pr-6">{audit.title}</div>
                                <div className="text-xs text-gray-500 flex justify-between mt-1">
                                    <span>{audit.status}</span>
                                    <span>#{audit.id}</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingAudit(audit);
                                    }}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                                >
                                    <Edit className="w-3 h-3 text-gray-600" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedAudit ? (
                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">{selectedAudit.title}</h2>
                                        <p className="text-gray-500 mt-1">{selectedAudit.description}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedAudit.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {selectedAudit.status}
                                    </span>
                                </div>

                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <h3 className="font-semibold text-gray-700 mb-3">Documents</h3>
                                    <DocumentUpload auditId={selectedAudit.id} />
                                </div>
                            </div>
                        </div>

                        {/* Chat Sidebar */}
                        <Chat auditId={selectedAudit.id} />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Select an audit to start working</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingAudit && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Edit Audit</h3>
                            <button onClick={() => setEditingAudit(null)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateAudit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={editingAudit.title}
                                        onChange={(e) => setEditingAudit({ ...editingAudit, title: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={editingAudit.description || ''}
                                        onChange={(e) => setEditingAudit({ ...editingAudit, description: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={editingAudit.status}
                                        onChange={(e) => setEditingAudit({ ...editingAudit, status: e.target.value as any })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="PLANNED">PLANNED</option>
                                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setEditingAudit(null)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
