import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const AppLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default AppLayout;
