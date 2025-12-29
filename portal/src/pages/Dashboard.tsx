import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Clock, AlertCircle, ChevronRight, CheckCircle, LogOut, User } from 'lucide-react';
import api from '../services/api';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_charged_usd: string;
  created_at: string;
  item_count: number;
}

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    email?: string;
    has_signed_agreement?: boolean;
    signed_agreement_date?: string;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, profileRes] = await Promise.all([
            api.get('/orders'),
            api.get('/profile')
        ]);
        
        if (ordersRes.data.success) {
          setOrders(ordersRes.data.orders);
        }
        
        if (profileRes.data.success) {
            setProfile(profileRes.data.client);
        }
      } catch (error) {
        console.error(error);
        // If 401, interceptor handles it
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'PROCESSING': return 'bg-blue-100 text-blue-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleLogout = () => {
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_user');
      navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-[#032530] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F4D445] rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-[#032530]" />
              </div>
              <span className="text-xl font-bold text-white">Client Portal</span>
            </div>
            <div className="flex items-center gap-4">
              {profile && (
                <span className="text-white/70 text-sm hidden sm:block">
                  {profile.email}
                </span>
              )}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-white/80 hover:text-white font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {profile?.has_signed_agreement && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Agreement Signed</p>
              <p className="text-xs text-emerald-600">
                Signed on {new Date(profile.signed_agreement_date || '').toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#032530]">Your Orders</h1>
          <p className="text-gray-500 mt-1">View and track your tradeline orders</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="animate-spin w-10 h-10 text-[#032530] mx-auto mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p className="text-gray-500">Loading orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Orders Yet</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              You haven't placed any orders yet. Browse our tradeline inventory to get started.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link to={`/orders/${order.id}`} className="block hover:bg-gray-50 transition-colors">
                    <div className="px-6 py-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#032530]/10 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-[#032530]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold text-[#032530]">
                                {order.order_number}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyles(order.status)}`}>
                                {order.status}
                              </span>
                              {order.payment_status === 'PENDING' && (
                                <span className="flex items-center gap-1 text-xs text-orange-600 font-medium border border-orange-200 bg-orange-50 px-2 py-1 rounded-full">
                                  <AlertCircle className="w-3 h-3" /> Payment Pending
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {order.item_count} Item{order.item_count !== 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(order.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-bold text-[#032530]">
                            ${order.total_charged_usd}
                          </span>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-sm text-gray-400">
          Need help? Contact <a href="mailto:support@tradelinerental.com" className="text-[#032530] hover:underline font-medium">support@tradelinerental.com</a>
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
