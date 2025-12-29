import React, { useEffect, useState } from 'react';
import { Users, ShoppingCart, DollarSign, Activity } from 'lucide-react';
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

  const cards = [
    { label: 'Total Brokers', value: stats?.brokers || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Brokers', value: stats?.active_brokers || 0, icon: Activity, color: 'bg-green-500' },
    { label: 'Total Orders', value: stats?.orders_total || 0, icon: ShoppingCart, color: 'bg-purple-500' },
    { label: 'Platform Revenue', value: `$${stats?.revenue_platform?.toLocaleString() || '0.00'}`, icon: DollarSign, color: 'bg-yellow-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#051b41] mb-6">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
              <div className={`p-3 rounded-full ${card.color} text-white`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Broker</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentOrders.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No recent orders found.</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-[#051b41]">#{order.order_number || order.id.slice(0,8)}</td>
                    <td className="px-6 py-3">{order.broker?.name || 'Direct'}</td>
                    <td className="px-6 py-3">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium">${(order.total_charged / 100).toFixed(2)}</td>
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
