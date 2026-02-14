import { NavLink } from 'react-router-dom';
import { FileText, LayoutDashboard } from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/audits', icon: FileText, label: 'Prüfungen' },
];

const Sidebar: React.FC = () => {
    return (
        <div className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
                <NavLink to="/" className="block">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Audit Manager
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">Interne Revision</p>
                </NavLink>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                                transition-all duration-200 group
                                ${isActive
                                    ? 'bg-blue-600 shadow-lg shadow-blue-600/50 text-white'
                                    : 'text-gray-300 hover:bg-gray-700/50'
                                }
                            `}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
                <div className="text-xs text-gray-500 text-center">
                    v2.0.0
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
