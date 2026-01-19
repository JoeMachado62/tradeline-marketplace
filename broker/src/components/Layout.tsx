import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, Briefcase, Home, LayoutDashboard, ShoppingCart } from 'lucide-react';

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const userStr = localStorage.getItem('broker_user');
    const user = userStr ? JSON.parse(userStr) : null;

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        localStorage.removeItem('broker_token');
        localStorage.removeItem('broker_user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="header-bg shadow-lg px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#F4D445] text-[#032530] p-2.5 rounded-xl shadow-md">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Broker Portal</h1>
                            <p className="text-xs text-slate-300">Welcome, {user?.name}</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1 bg-[#032530]/50 p-1 rounded-lg border border-white/10 ml-4 hidden md:flex">
                        <Link
                            to="/"
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${isActive('/')
                                    ? 'bg-[#F4D445] text-[#032530]'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <LayoutDashboard size={16} />
                            Dashboard
                        </Link>
                        <Link
                            to="/orders"
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${isActive('/orders')
                                    ? 'bg-[#F4D445] text-[#032530]'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <ShoppingCart size={16} />
                            Orders
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block text-sm text-[#F4D445] bg-[#032530]/50 px-4 py-1.5 rounded-full font-medium border border-[#F4D445]/30">
                        {user?.business_name || 'Individual Broker'}
                    </span>
                    <a
                        href="/"
                        className="text-slate-300 hover:text-white p-2.5 rounded-lg hover:bg-white/10 transition"
                        title="Back to Website"
                    >
                        <Home size={20} />
                    </a>
                    <button
                        onClick={handleLogout}
                        className="text-slate-300 hover:text-red-400 p-2.5 rounded-lg hover:bg-red-500/10 transition"
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

            {/* Footer */}
            <footer className="border-t border-slate-200 mt-auto py-6 text-center">
                <p className="text-sm text-slate-500">
                    © {new Date().getFullYear()} TradelineRental.com — <a href="/broker" className="text-[#032530] hover:underline">Broker Program</a>
                </p>
            </footer>
        </div>
    );
}
