import React, { useEffect, useState } from 'react';
import { Users, ShoppingCart, DollarSign, Activity, TrendingUp, ArrowUpRight } from 'lucide-react';
import api from '../services/api';

interface DashboardStats {
  brokers: number;
  active_brokers: number;
  orders_total: number;
  revenue_platform: number;
}

interface Order {
  id: string;
  order_number?: string;
  broker?: { name: string };
  created_at: string;
  status: string;
  total_charged: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        if (data.success) {
          setStats(data.stats);
          setRecentOrders(data.recent_orders || []);
        }
      } catch (error) {
        console.error('Failed to load dashboard', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 text-[#032530] mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Brokers', value: stats?.brokers || 0, icon: Users, color: 'bg-[#032530]', trend: '+12%' },
    { label: 'Active Brokers', value: stats?.active_brokers || 0, icon: Activity, color: 'bg-emerald-500', trend: '+8%' },
    { label: 'Total Orders', value: stats?.orders_total || 0, icon: ShoppingCart, color: 'bg-violet-500', trend: '+24%' },
    { label: 'Platform Revenue', value: `$${stats?.revenue_platform?.toLocaleString() || '0.00'}`, icon: DollarSign, color: 'bg-[#F4D445]', textColor: 'text-[#032530]', trend: '+18%' },
  ];

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#032530]">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.color} ${card.textColor || 'text-white'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  {card.trend}
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-[#032530] mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#032530]">Recent Orders</h2>
            <p className="text-sm text-gray-500">Latest transactions across all brokers</p>
          </div>
          <a href="/orders" className="text-sm text-[#032530] hover:text-[#021a22] font-medium flex items-center gap-1">
            View All <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Broker</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    No recent orders found.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#032530]">
                      #{order.order_number || order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{order.broker?.name || 'Direct'}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyles(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-[#032530]">
                      ${(order.total_charged / 100).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
