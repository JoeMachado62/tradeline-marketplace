import { useEffect, useState } from 'react';
import api from '../services/api';
import { DollarSign, ShoppingCart, TrendingUp, Copy, CheckCircle, Code } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [broker, setBroker] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

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

  const getEmbedCode = () => {
    const baseUrl = "https://tradeline-marketplace-production-bcaa.up.railway.app";
    return `<!-- Tradeline Widget Styles -->
<link rel="stylesheet" href="${baseUrl}/widget/tradeline-widget.css">

<!-- Container where widget will render -->
<div id="tradeline-widget"></div>

<!-- Widget Configuration & Script -->
<script>
  window.TL_WIDGET_CONFIG = {
    apiKey: "${broker?.api_key || 'YOUR_API_KEY'}",
    apiUrl: "${baseUrl}/api",
    theme: {
      primaryColor: "#2563eb",
      secondaryColor: "#1e40af"
    }
  };
</script>
<script src="${baseUrl}/widget/tradeline-widget.iife.js"></script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* API Key Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Widget Integration</h2>
              <p className="text-sm text-gray-500">Use this to embed the tradeline checkout widget on your website.</p>
            </div>
            <button 
              onClick={() => setShowEmbedModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
            >
              <Code size={18} />
              Get Embed Code
            </button>
          </div>
          
          <div className="flex gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
               <div className="flex-1">
                 <span className="text-xs text-gray-500 block mb-1">API Key</span>
                 <span className="font-mono text-sm text-gray-700 break-all">{broker?.api_key}</span>
               </div>
               <button 
                  onClick={copyApiKey}
                  className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-800"
               >
                   {copied ? <><CheckCircle size={16}/> Copied</> : <><Copy size={16}/> Copy</>}
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

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Widget Embed Code</h2>
              <button onClick={() => setShowEmbedModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-4">
                Copy and paste this code into your website where you want the tradeline widget to appear.
                Your API key is already included.
              </p>
              
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                  {getEmbedCode()}
                </pre>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Copy the embed code above</li>
                <li>Paste it into your website's HTML where you want the widget</li>
                <li>The widget will automatically load and display tradelines</li>
                <li>Customers can add to cart and checkout directly from your site</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important:</h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Keep your API key confidential - don't share it publicly</li>
                <li>Orders placed through your widget are automatically linked to your account</li>
                <li>You earn commissions on all sales through your widget</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowEmbedModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button 
                onClick={copyEmbedCode}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
              >
                {embedCopied ? <><CheckCircle size={18} /> Copied!</> : <><Copy size={18} /> Copy Embed Code</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
