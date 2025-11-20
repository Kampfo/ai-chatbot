import React from 'react';
import { FileText, Calendar, CheckSquare, Settings, User } from 'lucide-react';

interface SidebarProps {
    activeTab: 'audits' | 'planning' | 'actions' | 'settings' | 'profile';
    onTabChange: (tab: 'audits' | 'planning' | 'actions' | 'settings' | 'profile') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'audits' as const, icon: FileText, label: 'Prüfungen' },
        { id: 'planning' as const, icon: Calendar, label: 'Planung' },
        { id: 'actions' as const, icon: CheckSquare, label: 'Maßnahmen' },
        { id: 'settings' as const, icon: Settings, label: 'Einstellungen' },
        { id: 'profile' as const, icon: User, label: 'Profil' },
    ];

    return (
        <div className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
                <h1 className="text-2xl font-bold text-gradient bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Audit Manager
                </h1>
                <p className="text-xs text-gray-400 mt-1">Interne Revision</p>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex-1 py-6 px-3 space-y-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                                transition-all duration-200 group
                                ${isActive
                                    ? 'bg-blue-600 shadow-lg shadow-blue-600/50 text-white'
                                    : 'text-gray-300 hover:bg-gray-700/50'
                                }
                            `}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
                <div className="text-xs text-gray-500 text-center">
                    v1.0.0 • AI-Powered
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
