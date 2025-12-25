import { useEffect, useState } from 'react';
import api from '../services/api';
import { DollarSign, ShoppingCart, TrendingUp, Copy, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [broker, setBroker] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes, profileRes] = await Promise.all([
        api.get('/portal/broker/dashboard'),
        api.get('/portal/broker/orders?limit=10'),
        api.get('/portal/broker/me')
      ]);

      setStats(statsRes.data.stats);
      setOrders(ordersRes.data.orders);
      setBroker(profileRes.data.broker);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
      if (broker?.api_key) {
          navigator.clipboard.writeText(broker.api_key);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* API Key Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Widget Integration Keys</h2>
          <p className="text-sm text-gray-500 mb-4">Use this API Key to embed the checkout widget on your website.</p>
          
          <div className="flex gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
               <span className="font-mono text-sm text-gray-700 flex-1 break-all">{broker?.api_key}</span>
               <button 
                  onClick={copyApiKey}
                  className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-800"
               >
                   {copied ? <><CheckCircle size={16}/> Copied</> : <><Copy size={16}/> Copy Key</>}
               </button>
          </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_orders || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <ShoppingCart size={24} />
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500">Total Commissions</p>
                <p className="text-2xl font-bold text-gray-900">${stats?.total_commission?.toLocaleString() || '0.00'}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full text-green-600">
                <DollarSign size={24} />
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500">Pending Payout</p>
                <p className="text-2xl font-bold text-gray-900">${stats?.pending_payout?.toLocaleString() || '0.00'}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                <TrendingUp size={24} />
            </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-gray-50 text-gray-600">
                        <th className="px-6 py-3 font-medium">Order ID</th>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Customer</th>
                        <th className="px-6 py-3 font-medium">Total</th>
                        <th className="px-6 py-3 font-medium">Commission</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                No orders found yet.
                            </td>
                        </tr>
                    ) : (
                        orders.map((order: any) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-mono text-xs">{order.id.substring(0, 8)}...</td>
                                <td className="px-6 py-3">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-3">{order.customer_email}</td>
                                <td className="px-6 py-3">${(order.total_charged / 100).toFixed(2)}</td>
                                <td className="px-6 py-3 text-green-600 font-medium">+${((order.broker_revenue_share + order.broker_markup) / 100).toFixed(2)}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {order.status}
                                    </span>
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
}
