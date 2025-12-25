import { useNavigate, Outlet } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';

export default function Layout() {
    const navigate = useNavigate();
    const userStr = localStorage.getItem('broker_user');
    const user = userStr ? JSON.parse(userStr) : null;

    const handleLogout = () => {
        localStorage.removeItem('broker_token');
        localStorage.removeItem('broker_user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-600 text-white p-2 rounded-lg">
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Broker Portal</h1>
                        <p className="text-xs text-gray-500">Welcome, {user?.name}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                     <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full font-mono">
                         {user?.business_name || 'Individual Broker'}
                     </span>
                    <button 
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}
