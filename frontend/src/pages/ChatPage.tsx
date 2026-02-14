import { useState } from 'react';
import { useAudits } from '../context/AuditContext';
import Chat from '../components/Chat';

const ChatPage: React.FC = () => {
    const { audits } = useAudits();
    const [selectedAuditId, setSelectedAuditId] = useState<number | undefined>(undefined);

    const selectedAudit = audits.find(a => a.id === selectedAuditId);

    return (
        <div className="flex h-full">
            {/* Sidebar: Audit-Auswahl */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-600">Prüfungskontext</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        Wählen Sie eine Prüfung für kontextbezogene Antworten
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button
                        onClick={() => setSelectedAuditId(undefined)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            !selectedAuditId
                                ? 'bg-blue-100 text-blue-800'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        Allgemein (kein Kontext)
                    </button>
                    {audits.map((audit) => (
                        <button
                            key={audit.id}
                            onClick={() => setSelectedAuditId(audit.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedAuditId === audit.id
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <div className="font-medium truncate">{audit.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{audit.status}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col">
                <Chat
                    key={selectedAuditId ?? 'general'}
                    auditId={selectedAuditId}
                    auditTitle={selectedAudit?.title}
                />
            </div>
        </div>
    );
};

export default ChatPage;
