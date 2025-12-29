import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Building, Info, PlayCircle } from 'lucide-react';
import api from '../services/api';

interface OrderItem {
  id: string;
  bank_name: string;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_charged_usd: string | number;
  status: string;
  payment_status: string;
  items: OrderItem[];
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
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center">Order not found</div>;
  }

  const isUnpaid = order.payment_status === 'PENDING';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
                <Link to="/dashboard" className="flex items-center text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back to Orders
                </Link>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
         <div className="px-4 py-4 sm:px-0">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
                  <p className="text-sm text-gray-500">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
               </div>
               <div className="flex flex-col items-end">
                   <span className="text-2xl font-bold text-gray-900">${order.total_charged_usd}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                    }`}>
                        {order.status}
                    </span>
               </div>
            </div>

            {/* Payment Instructions Section */}
            {isUnpaid && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8 border border-blue-100">
                    <div className="bg-blue-600 px-6 py-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <CreditCard className="w-5 h-5" /> Complete Your Purchase
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <PlayCircle className="text-blue-500" /> Watch: How to Pay
                                </h3>
                                {/* Placeholder Video Embed */}
                                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-white relative group cursor-pointer overflow-hidden">
                                     <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors"></div>
                                     <PlayCircle className="w-16 h-16 relative z-10 opacity-80 group-hover:opacity-100 transition-opacity" />
                                     <span className="absolute bottom-4 left-4 text-sm font-medium z-10">Instructional Video (Placeholder)</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
                                <div className="space-y-4 text-sm text-gray-600">
                                    <div className="p-4 bg-gray-50 rounded border">
                                        <p className="font-bold text-gray-900 mb-1">Option 1: Zelle</p>
                                        <p>Send payment to: <strong>billing@example.com</strong></p>
                                        <p className="text-xs mt-1">Include Order #{order.order_number} in the memo.</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded border">
                                        <p className="font-bold text-gray-900 mb-1">Option 2: ACH / Wire</p>
                                        <p>Bank: <strong>Chase Bank</strong></p>
                                        <p>Account: <strong>1234567890</strong></p>
                                        <p>Routing: <strong>021000021</strong></p>
                                    </div>
                                    <div className="flex items-start gap-2 text-blue-800 bg-blue-50 p-3 rounded">
                                        <Info className="w-5 h-5 shrink-0" />
                                        <p>After sending payment, your order will be processed within 24 hours. You will receive an email confirmation.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Items */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h3 className="font-medium text-gray-900">Order Items</h3>
                </div>
                <ul className="divide-y divide-gray-200">
                    {order.items.map((item) => (
                        <li key={item.id} className="p-6 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Building className="w-6 h-6 text-gray-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{item.bank_name}</p>
                                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                </div>
                            </div>
                            {/* We don't show individual item prices to keep it simple? Default is yes. */}
                            {/* <p className="font-medium text-gray-900">${(item.customer_price / 100).toFixed(2)}</p> */}
                        </li>
                    ))}
                </ul>
                <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="font-bold text-lg text-gray-900">${order.total_charged_usd}</span>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default OrderDetail;
