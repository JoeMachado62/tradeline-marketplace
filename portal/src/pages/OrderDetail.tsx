import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Building, Info, PlayCircle, FileText, Download, Home } from 'lucide-react';
import api from '../services/api';

interface OrderItem {
  id: string;
  bank_name: string;
  quantity: number;
  credit_limit?: number;
  age_months?: number;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_charged_usd: string | number;
  status: string;
  payment_status: string;
  items: OrderItem[];
  documents?: { id: string; name: string; url: string }[];
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        if (data.success) {
          setOrder(data.order);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 mx-auto text-[#032530] mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-slate-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Order Not Found</h2>
          <p className="text-slate-500 mb-4">This order may have been removed or doesn't exist.</p>
          <Link to="/dashboard" className="text-[#032530] font-medium hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const isUnpaid = order.payment_status === 'PENDING';

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'PROCESSING': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-[#032530] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="flex items-center text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" /> Back to Orders
            </Link>
            <a href="/" className="flex items-center text-white/70 hover:text-white transition-colors">
              <Home className="w-5 h-5 mr-2" /> Home
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Order Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#032530]">Order #{order.order_number}</h1>
              <p className="text-sm text-slate-500 mt-1">
                Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-3xl font-bold text-[#032530]">${order.total_charged_usd}</span>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusStyles(order.status)}`}>
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Instructions Section */}
        {isUnpaid && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6 border border-[#F4D445]">
            <div className="bg-[#032530] px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#F4D445]" /> Complete Your Purchase
              </h2>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-[#032530] mb-4 flex items-center gap-2">
                    <PlayCircle className="text-[#F4D445]" /> Watch: How to Pay
                  </h3>
                  {/* Video Embed */}
                  <div className="aspect-video bg-[#032530] rounded-xl flex items-center justify-center text-white relative group cursor-pointer overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors"></div>
                    <PlayCircle className="w-16 h-16 relative z-10 text-[#F4D445] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="absolute bottom-4 left-4 text-sm font-medium z-10">Instructional Video</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-[#032530] mb-4">Payment Methods</h3>
                  <div className="space-y-4 text-sm">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="font-bold text-[#032530] mb-2">Option 1: Zelle</p>
                      <p className="text-slate-600">Send payment to: <strong className="text-[#032530]">billing@tradelinerental.com</strong></p>
                      <p className="text-xs mt-2 text-slate-500">Include Order #{order.order_number} in the memo.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="font-bold text-[#032530] mb-2">Option 2: ACH / Wire</p>
                      <div className="grid grid-cols-2 gap-2 text-slate-600">
                        <span>Bank:</span><strong className="text-[#032530]">Chase Bank</strong>
                        <span>Account:</span><strong className="text-[#032530]">1234567890</strong>
                        <span>Routing:</span><strong className="text-[#032530]">021000021</strong>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-[#032530] bg-[#F4D445]/20 p-4 rounded-xl border border-[#F4D445]">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm">After sending payment, your order will be processed within 24 hours. You will receive an email confirmation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-[#032530]">Order Items</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-[#032530]/10 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-[#032530]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#032530]">{item.bank_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span>Qty: {item.quantity}</span>
                      {item.credit_limit && <span>• ${item.credit_limit.toLocaleString()} limit</span>}
                      {item.age_months && <span>• {Math.floor(item.age_months / 12)}+ years</span>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="bg-[#032530] px-6 py-4 flex justify-between items-center">
            <span className="font-medium text-white">Total</span>
            <span className="font-bold text-2xl text-[#F4D445]">${order.total_charged_usd}</span>
          </div>
        </div>

        {/* Documents Section */}
        {order.documents && order.documents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-[#032530] flex items-center gap-2">
                <FileText className="w-5 h-5" /> Documents
              </h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {order.documents.map((doc) => (
                <li key={doc.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#032530]/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#032530]" />
                    </div>
                    <span className="font-medium text-slate-700">{doc.name}</span>
                  </div>
                  <a 
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#032530] text-white rounded-lg hover:bg-[#021a22] transition font-medium text-sm"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Help Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            Need help with your order? Contact <a href="mailto:support@tradelinerental.com" className="text-[#032530] hover:underline font-medium">support@tradelinerental.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
