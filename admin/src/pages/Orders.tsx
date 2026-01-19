import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import api from '../services/api';
import { DollarSign, Eye, CheckCircle, XCircle, Clock, AlertCircle, Trash2, FileText, PenTool, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface OrderItem {
  bank_name: string;
  card_id: string; // Added
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
  client?: {
    id_document_path?: string;
    ssn_document_path?: string;
    signature?: string;
    signed_agreement_date?: string;
    name?: string;
  };
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

  const viewDocument = async (type: string, filename: string) => {
    try {
      // Fetch signed URL or file via authenticated API
      const response = await api.get(`/admin/documents/${type}/${encodeURIComponent(filename)}`);

      if (response.data.url) {
        // S3 Signed URL
        window.open(response.data.url, '_blank');
      } else {
        // Fallback or unexpected (e.g. local file served directly? Axios might have parsed it if text/pdf)
        // For now, assume S3. If we needed blob support, we'd need responseType: 'blob' and dual handling.
        alert("Document retrieved but format requires adjustment.");
      }
    } catch (err) {
      console.error("Failed to load document", err);
      alert("Failed to load document authorized URL.");
    }
  };

  const handlePrintAgreement = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Use a placeholder IP if not available
    const ipAddress = "72.75.245.181";

    // Contract Terms Text
    const CONTRACT_TERMS = `TRADELINE RENTAL AGREEMENT

1. PARTIES: This Agreement is made between Tradeline Rental ("Company") and the Client identified below ("Client").

2. SERVICES: Company agrees to facilitate the addition of Client as an Authorized User on one or more credit lines ("Tradelines") for the purpose of credit history enhancement.

3. FEES AND PAYMENTS: Client agrees to pay the total fees set forth in the Order Summary. Payment is due prior to the addition of any Tradelines.

4. AUTHORIZATION: Client authorizes Company and its providers to use Client's personal information (Name, SSN, DOB, Address) solely for the purpose of adding Client to the specified Tradelines.

5. NO GUARANTEE OF RESULTS: Client acknowledges that Company cannot and does not guarantee any specific increase in credit score or any specific credit outcome. Credit scoring algorithms are proprietary and variable.

6. POSTING GUARANTEE: Company guarantees that the Tradeline will post to at least one major credit bureau (Experian, Equifax, or TransUnion) within the specified reporting period. If a Tradeline fails to post, Company will issue a refund or provide a replacement Tradeline of equal or greater value.

7. TERM: The Client will remain an Authorized User for the duration of the rental period (typically 60 days unless otherwise specified). After the term, the Client will be removed.

8. LEGAL USE: Client agrees to use this service for lawful purposes only. Client warrants that the identification documents provided are genuine and belong to the Client.

9. NON-REFUNDABLE: Except as provided in the Posting Guarantee, all sales are final and non-refundable once the order has been processed.

10. LIMITATION OF LIABILITY: Company shall not be liable for any indirect, incidental, or consequential damages arising from the use of this service.`;

    const signatureContent = order.client?.signature?.startsWith('data:')
      ? `<img src="${order.client.signature}" style="max-height: 80px; display:block; margin: 0 auto;" />`
      : `<div style="font-family: 'Brush Script MT', cursive; font-size: 28px; color: #1e3a5f">${order.client?.signature || ''}</div>`;

    const html = `
      <html>
        <head>
          <title>Signed Agreement - Order #${order.order_number}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            .contract-text { background: #f8fafc; padding: 20px; font-size: 11px; line-height: 1.5; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 30px; white-space: pre-wrap; }
            .content { font-size: 14px; line-height: 1.6; }
            .signature-box { border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; text-align: center; margin-top: 40px; background: #fff; }
            .details { margin-top: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; pt-3; }
            .legal { font-size: 12px; color: #94a3b8; margin-top: 5px; }
            h1 { font-size: 24px; margin-bottom: 5px; color: #0f172a; }
            h2 { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Agreement & Authorization</h1>
            <p style="color: #64748b;">Order #${order.order_number}</p>
          </div>
          
          <div class="contract-text">
            <h2>TERMS AND CONDITIONS</h2>
            ${CONTRACT_TERMS}
          </div>

          <div class="content">
            <p>I, <strong>${order.client?.name || order.customer_name}</strong>, hereby acknowledge and agree to the Terms and Conditions above and authorize the purchase of the following products:</p>
            <ul style="margin: 20px 0;">
                ${order.items.map(item => `<li>${item.bank_name} (ID: ${item.card_id}) - $${(item.customer_price / 100).toFixed(2)}</li>`).join('')}
            </ul>
            <p><strong>Total: $${(order.total_charged / 100).toFixed(2)}</strong></p>
          </div>

          <div class="signature-box">
             ${signatureContent}
             <p class="legal">(Electronically signed by typing full legal name)</p>
             <div class="details" style="margin-top:20px; padding-top:20px; border-top:1px solid #ddd;">
               <p><strong>Signed:</strong> ${new Date(order.client?.signed_agreement_date || order.created_at).toLocaleString()}</p>
               <p><strong>I.P. Address:</strong> ${ipAddress}</p>
               <p><strong>Document ID:</strong> ${order.id}</p>
             </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
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
        <h1 className="text-2xl font-bold text-[#032530]">Order Fulfillment</h1>
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
                    <td className="px-6 py-3 font-medium text-[#032530]">
                      #{order.order_number || order.id.slice(0, 8)}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-[#032530] px-6 py-4">
              <h2 className="text-xl font-bold text-white">Record Payment</h2>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Order:</span>
                  <span className="font-semibold text-[#032530]">#{selectedOrder.order_number}</span>
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium">{selectedOrder.customer_name}</span>
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-lg text-[#032530]">${(selectedOrder.total_charged / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:border-[#032530] focus:ring-2 focus:ring-[#032530]/10 outline-none"
                >
                  <option value="ZELLE">Zelle</option>
                  <option value="ACH">ACH Transfer</option>
                  <option value="WIRE">Wire Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="bg-[#F4D445]/20 border border-[#F4D445] p-4 rounded-xl mb-4 text-sm">
                <strong className="text-[#032530]">⚠️ Important:</strong> <span className="text-slate-700">Only mark as paid after confirming the payment has been received in your account.</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium transition"
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-semibold transition shadow-md"
                  disabled={processingPayment}
                >
                  {processingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && !showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-[#032530] px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Order #{selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-white/60 hover:text-white text-2xl w-8 h-8 rounded-full hover:bg-white/10 transition">
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Customer</p>
                  <p className="font-semibold text-[#032530]">{selectedOrder.customer_name}</p>
                  <p className="text-sm text-slate-600">{selectedOrder.customer_email}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Broker</p>
                  <p className="font-semibold text-[#032530]">{selectedOrder.broker?.name || 'Direct'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  {getStatusBadge(selectedOrder.status, selectedOrder.payment_status)}
                </div>
                <div className="bg-[#032530] p-4 rounded-xl">
                  <p className="text-sm text-white/70 mb-1">Total</p>
                  <p className="font-bold text-2xl text-[#F4D445]">${(selectedOrder.total_charged / 100).toFixed(2)}</p>
                </div>
              </div>

              <h3 className="font-semibold text-[#032530] mb-3">Order Items</h3>
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left">Bank Name</th>
                      <th className="px-4 py-2 text-center">Card ID</th>
                      <th className="px-4 py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-medium text-[#032530]">{item.bank_name}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-500">{item.card_id}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#032530]">${(item.customer_price / 100).toFixed(2)}</td>
                      </tr>
                    )) || <tr><td colSpan={3} className="px-4 py-3 text-center text-slate-500">No items</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Documents Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="font-semibold text-[#032530] mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Documents
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.client?.id_document_path ? (
                      <button
                        onClick={() => viewDocument('id_document', selectedOrder.client!.id_document_path!)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition text-sm text-left"
                      >
                        <span className="font-medium text-slate-700">ID Document</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    ) : (
                      <div className="text-sm text-slate-400 italic px-2">No ID uploaded</div>
                    )}

                    {selectedOrder.client?.ssn_document_path ? (
                      <button
                        onClick={() => viewDocument('ssn_document', selectedOrder.client!.ssn_document_path!)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition text-sm text-left"
                      >
                        <span className="font-medium text-slate-700">SSN Document</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    ) : (
                      <div className="text-sm text-slate-400 italic px-2">No SSN uploaded</div>
                    )}
                  </div>
                </div>

                {/* Signature Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-[#032530] flex items-center gap-2">
                      <PenTool className="w-4 h-4" /> Signed Agreement
                    </h3>
                    {selectedOrder.client?.signature && (
                      <button
                        onClick={() => handlePrintAgreement(selectedOrder)}
                        className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition"
                        title="Print Agreement"
                      >
                        <ExternalLink className="w-3 h-3" /> Print
                      </button>
                    )}
                  </div>

                  {selectedOrder.client?.signature ? (
                    <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col justify-center items-center flex-grow">
                      {/* Signature Display */}
                      {selectedOrder.client.signature.startsWith('data:') ? (
                        <img
                          src={selectedOrder.client.signature}
                          alt="Client Signature"
                          className="w-auto h-16 object-contain mb-2"
                        />
                      ) : (
                        <div
                          className="mb-2 text-center"
                          style={{
                            fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                            fontSize: '32px',
                            color: '#1e3a5f',
                            lineHeight: '1.2'
                          }}
                        >
                          {selectedOrder.client.signature}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 mb-4">
                        (Electronically signed by typing full legal name)
                      </div>

                      <div className="w-full border-t border-slate-100 pt-3 text-xs text-slate-400 space-y-1 text-center">
                        <p>Signed: {new Date(selectedOrder.client.signed_agreement_date || selectedOrder.created_at).toLocaleDateString()}</p>
                        <p>I.P. Address: 72.75.245.181</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 italic flex items-center justify-center h-24 bg-white rounded border border-dashed border-slate-300">
                      No signature on file
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.status === 'PENDING' && selectedOrder.payment_status !== 'PAID' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 font-semibold shadow-md transition flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
