import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import api from '../services/api';
import { DollarSign, Eye, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface OrderItem {
  bank_name: string;
  credit_limit: number;
  customer_price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  broker?: { name: string };
  customer_email: string;
  customer_name: string;
  total_charged: number;
  status: string;
  payment_status: string;
  created_at: string;
  items: OrderItem[];
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("ZELLE");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/admin/orders');
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!confirm(`Delete order ${order.order_number}? This cannot be undone.`)) {
      return;
    }
    
    setDeletingId(order.id);
    try {
      const { data } = await api.delete(`/admin/orders/${order.id}`);
      if (data.success) {
        setOrders(orders.filter(o => o.id !== order.id));
      }
    } catch (err: unknown) {
      const error = err as AxiosError<{ error: string }>;
      alert(error.response?.data?.error || 'Failed to delete order');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedOrder) return;
    setProcessingPayment(true);
    
    try {
      const { data } = await api.post(`/admin/orders/${selectedOrder.id}/mark-paid`, {
        payment_method: paymentMethod
      });
      
      if (data.success) {
        // Update local state
        setOrders(orders.map(o => 
          o.id === selectedOrder.id 
            ? { ...o, status: 'PROCESSING', payment_status: 'PAID' }
            : o
        ));
        setShowPaymentModal(false);
        setSelectedOrder(null);
      }
    } catch (err: unknown) {
      const error = err as AxiosError<{ error: string }>;
      alert(error.response?.data?.error || 'Failed to mark as paid');
    } finally {
      setProcessingPayment(false);
    }
  };


  const getStatusBadge = (status: string, paymentStatus: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: LucideIcon }> = {
      'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      'PROCESSING': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      'COMPLETED': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'CANCELLED': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      'REFUNDED': { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle },
    };
    
    const config = statusConfig[status] || statusConfig['PENDING'];
    const Icon = config.icon;
    
    return (
      <div className="flex flex-col gap-1">
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} inline-flex items-center gap-1`}>
          <Icon className="w-3 h-3" />
          {status}
        </span>
        {paymentStatus && paymentStatus !== 'PAID' && (
          <span className="text-xs text-orange-600 font-medium">
            💳 {paymentStatus}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#051b41]">Order Fulfillment</h1>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500">
            {orders.filter(o => o.status === 'PENDING').length} pending payment
          </span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">Order #</th>
                <th className="px-6 py-3">Broker</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8">No orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-[#051b41]">
                      #{order.order_number || order.id.slice(0,8)}
                    </td>
                    <td className="px-6 py-3">{order.broker?.name || 'Direct'}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-gray-400">{order.customer_email}</div>
                    </td>
                    <td className="px-6 py-3 font-semibold">
                      ${(order.total_charged / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-3">
                      {getStatusBadge(order.status, order.payment_status)}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                        
                        {(order.status === 'PENDING' && order.payment_status !== 'PAID') && (
                          <button 
                            className="text-green-600 hover:text-green-800 flex items-center gap-1"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowPaymentModal(true);
                            }}
                          >
                            <DollarSign className="w-4 h-4" /> Mark Paid
                          </button>
                        )}
                        
                        <button 
                          className="text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-50"
                          onClick={() => handleDeleteOrder(order)}
                          disabled={deletingId === order.id}
                        >
                          <Trash2 className="w-4 h-4" /> 
                          {deletingId === order.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p><strong>Order:</strong> #{selectedOrder.order_number}</p>
              <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
              <p><strong>Amount:</strong> ${(selectedOrder.total_charged / 100).toFixed(2)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="ZELLE">Zelle</option>
                <option value="ACH">ACH Transfer</option>
                <option value="WIRE">Wire Transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4 text-sm">
              <strong>⚠️ Important:</strong> Only mark as paid after confirming the payment has been received in your account.
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button 
                onClick={handleMarkAsPaid}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={processingPayment}
              >
                {processingPayment ? 'Processing...' : 'Confirm Payment Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && !showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Order #{selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedOrder.customer_name}</p>
                <p className="text-sm">{selectedOrder.customer_email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Broker</p>
                <p className="font-medium">{selectedOrder.broker?.name || 'Direct'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(selectedOrder.status, selectedOrder.payment_status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-bold text-lg">${(selectedOrder.total_charged / 100).toFixed(2)}</p>
              </div>
            </div>

            <h3 className="font-semibold mb-2">Order Items</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                  <span>{item.bank_name} - ${item.credit_limit?.toLocaleString()}</span>
                  <span className="font-medium">${(item.customer_price / 100).toFixed(2)} × {item.quantity}</span>
                </div>
              )) || <p className="text-gray-500">No items</p>}
            </div>

            {selectedOrder.status === 'PENDING' && selectedOrder.payment_status !== 'PAID' && (
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
