import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DollarSign, ShoppingCart, TrendingUp, Copy, CheckCircle, Code, Settings } from 'lucide-react';


export default function Dashboard() {
  const navigate = useNavigate();
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
      primaryColor: "#032530",
      secondaryColor: "#F4D445"
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
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 mx-auto text-[#032530] mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Key Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#032530] mb-1">Your Widget Integration</h2>
              <p className="text-sm text-slate-500">Use this to embed the tradeline checkout widget on your website.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
              >
                <Settings size={18} />
                Settings
              </button>
              <button 
                onClick={() => setShowEmbedModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#032530] text-white rounded-lg hover:bg-[#021a22] transition font-medium shadow-md"
              >
                <Code size={18} />
                Get Embed Code
              </button>
            </div>
          </div>

          
          <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
               <div className="flex-1">
                 <span className="text-xs text-slate-500 block mb-1 font-medium">API Key</span>
                 <span className="font-mono text-sm text-slate-700 break-all">{broker?.api_key}</span>
               </div>
               <button 
                  onClick={copyApiKey}
                  className="flex items-center gap-2 text-sm font-medium text-[#032530] hover:text-[#021a22] px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-[#032530] transition"
               >
                   {copied ? <><CheckCircle size={16} className="text-green-600"/> Copied</> : <><Copy size={16}/> Copy</>}
               </button>
          </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-[#032530]">{stats?.total_orders || 0}</p>
            </div>
            <div className="bg-[#032530]/10 p-3 rounded-xl text-[#032530]">
                <ShoppingCart size={24} />
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Total Commissions</p>
                <p className="text-2xl font-bold text-emerald-600">${stats?.total_commission?.toLocaleString() || '0.00'}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                <DollarSign size={24} />
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Pending Payout</p>
                <p className="text-2xl font-bold text-[#F4D445]">${stats?.pending_payout?.toLocaleString() || '0.00'}</p>
            </div>
            <div className="bg-[#F4D445]/20 p-3 rounded-xl text-[#F4D445]">
                <TrendingUp size={24} />
            </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-[#032530]">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="px-6 py-3 font-medium">Order ID</th>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Customer</th>
                        <th className="px-6 py-3 font-medium">Total</th>
                        <th className="px-6 py-3 font-medium">Commission</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                              <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                              <p className="font-medium">No orders yet</p>
                              <p className="text-sm">Orders from your widget will appear here</p>
                            </td>
                        </tr>
                    ) : (
                        orders.map((order: any) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4 font-mono text-xs text-[#032530]">{order.id.substring(0, 8)}...</td>
                                <td className="px-6 py-4 text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-slate-700">{order.customer_email}</td>
                                <td className="px-6 py-4 font-medium text-slate-900">${(order.total_charged / 100).toFixed(2)}</td>
                                <td className="px-6 py-4 text-emerald-600 font-semibold">+${((order.broker_revenue_share + order.broker_markup) / 100).toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                        order.status === 'PENDING' ? 'bg-[#F4D445]/20 text-[#032530]' :
                                        'bg-slate-100 text-slate-800'
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#032530]">Widget Embed Code</h2>
              <button onClick={() => setShowEmbedModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl w-10 h-10 rounded-full hover:bg-slate-100 transition">
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-slate-600 mb-4">
                Copy and paste this code into your website where you want the tradeline widget to appear.
                Your API key is already included.
              </p>
              
              <div className="bg-[#032530] rounded-xl p-4 overflow-x-auto">
                <pre className="text-[#F4D445] text-sm font-mono whitespace-pre-wrap">
                  {getEmbedCode()}
                </pre>
              </div>
            </div>

            <div className="bg-[#032530]/5 border border-[#032530]/20 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-[#032530] mb-2">📋 Instructions:</h4>
              <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                <li>Copy the embed code above</li>
                <li>Paste it into your website's HTML where you want the widget</li>
                <li>The widget will automatically load and display tradelines</li>
                <li>Customers can add to cart and checkout directly from your site</li>
              </ol>
            </div>

            <div className="bg-[#F4D445]/20 border border-[#F4D445] rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-[#032530] mb-2">⚠️ Important:</h4>
              <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                <li>Keep your API key confidential - don't share it publicly</li>
                <li>Orders placed through your widget are automatically linked to your account</li>
                <li>You earn commissions on all sales through your widget</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowEmbedModal(false)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-medium transition"
              >
                Close
              </button>
              <button 
                onClick={copyEmbedCode}
                className="flex-1 px-4 py-3 bg-[#032530] text-white rounded-xl hover:bg-[#021a22] flex items-center justify-center gap-2 font-semibold shadow-lg transition"
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
