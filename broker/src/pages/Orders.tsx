import { useEffect, useState } from 'react';
import api from '../services/api';
import { ChevronLeft, ChevronRight, Eye, ShoppingCart, CheckCircle, XCircle, Clock, AlertCircle, FileText, PenTool, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export default function Orders() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1
    });
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    useEffect(() => {
        fetchOrders(1);
    }, []);

    const fetchOrders = async (page: number) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/portal/broker/orders?page=${page}&limit=${pagination.limit}`);
            if (data.success) {
                setOrders(data.orders);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchOrders(newPage);
        }
    };

    const openOrderDetails = (order: any) => {
        setSelectedOrder(order);
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

    const viewDocument = async (type: string, filename: string) => {
        try {
            const response = await api.get(`/portal/broker/documents/${type}/${encodeURIComponent(filename)}`);
            if (response.data.url) {
                window.open(response.data.url, '_blank');
            } else {
                alert("Document format not supported for direct view.");
            }
        } catch (error) {
            console.error('Failed to view document:', error);
            alert("Failed to load document.");
        }
    };

    const handlePrintAgreement = (order: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Use a placeholder IP if not available
        const ipAddress = "72.75.245.181";

        const signatureContent = order.client?.signature?.startsWith('data:')
            ? `<img src="${order.client.signature}" style="max-height: 80px; display:block; margin: 0 auto;" />`
            : `<div style="font-family: 'Brush Script MT', cursive; font-size: 28px; color: #1e3a5f">${order.client?.signature || ''}</div>`;

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

        const html = `
          <html>
            <head>
              <title>Signed Agreement - Order #${order.order_number || order.id}</title>
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
                <p style="color: #64748b;">Order #${order.order_number || order.id}</p>
              </div>
              
              <div class="contract-text">
                <h2>TERMS AND CONDITIONS</h2>
                ${CONTRACT_TERMS}
              </div>

              <div class="content">
                <p>I, <strong>${order.client?.name || order.customer_name}</strong>, hereby acknowledge and agree to the Terms and Conditions above and authorize the purchase of the following products:</p>
                <ul style="margin: 20px 0;">
                    ${order.items.map((item: any) => `<li>${item.bank_name} (ID: ${item.card_id}) - $${(item.customer_price / 100).toFixed(2)}</li>`).join('')}
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

    if (loading && orders.length === 0) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <svg className="animate-spin w-10 h-10 mx-auto text-[#032530] mb-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-slate-500">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[#032530]">Orders</h1>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                        <p className="font-medium">No orders found</p>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-mono text-xs text-[#032530]">{order.id.substring(0, 8)}...</td>
                                        <td className="px-6 py-4 text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-slate-700">{order.customer_email}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">${(order.total_charged / 100).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-emerald-600 font-semibold">+${((order.broker_revenue_share + order.broker_markup) / 100).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                                order.status === 'PENDING' ? 'bg-[#F4D445]/20 text-[#032530]' :
                                                    'bg-slate-100 text-slate-800'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openOrderDetails(order)}
                                                className="text-[#032530] hover:text-[#F4D445] transition"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                        <p className="text-sm text-slate-500">
                            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.pages}
                                className="p-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                        <div className="bg-[#032530] px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Order #{selectedOrder.order_number || selectedOrder.id.substring(0, 8)}</h2>
                            <button onClick={() => setSelectedOrder(null)} className="text-white/60 hover:text-white text-2xl w-8 h-8 rounded-full hover:bg-white/10 transition">
                                ×
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-sm text-slate-500 mb-1">Customer</p>
                                    <p className="font-semibold text-[#032530]">{selectedOrder.customer_name || selectedOrder.customer_email}</p>
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
                                        {selectedOrder.items?.map((item: any, idx: number) => (
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
                                                onClick={() => viewDocument('id_document', selectedOrder.client.id_document_path)}
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
                                                onClick={() => viewDocument('ssn_document', selectedOrder.client.ssn_document_path)}
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

                            <div className="bg-[#F4D445]/10 border border-[#F4D445] p-4 rounded-lg mt-6">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-[#854d0e]">Your Commission</span>
                                    <span className="text-xl font-bold text-[#854d0e]">
                                        +${((selectedOrder.broker_revenue_share + selectedOrder.broker_markup) / 100).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
