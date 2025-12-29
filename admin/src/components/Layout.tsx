import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, LogOut, Shield, Home } from 'lucide-react';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Brokers', path: '/brokers', icon: Users },
    { label: 'Orders', path: '/orders', icon: ShoppingCart },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-[#032530] text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F4D445] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#032530]" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Portal</h1>
              <p className="text-xs text-slate-300">TradelineRental.com</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#F4D445] text-[#032530] font-semibold shadow-md' 
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/10 space-y-2">
          <a 
            href="/"
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <Home className="w-5 h-5" />
            <span>Back to Website</span>
          </a>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
            <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
