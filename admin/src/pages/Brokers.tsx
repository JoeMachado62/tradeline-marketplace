import React, { useEffect, useState } from 'react';
import { Plus, Copy, Eye, X } from 'lucide-react';
import api from '../services/api';

interface BrokerFormData {
  name: string;
  email: string;
  business_name: string;
  phone: string;
  website: string;
  revenue_share: number;
}

const initialFormData: BrokerFormData = {
  name: '',
  email: '',
  business_name: '',
  phone: '',
  website: '',
  revenue_share: 10
};

const Brokers: React.FC = () => {
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [newBroker, setNewBroker] = useState<BrokerFormData>(initialFormData);
  const [creating, setCreating] = useState(false);
  const [createdBroker, setCreatedBroker] = useState<any>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchBrokers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/brokers');
      if (data.success) {
        setBrokers(data.brokers);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreatedSecret(null);
    setCreatedBroker(null);
    try {
      const { data } = await api.post('/admin/brokers', newBroker);
      if (data.success) {
        setCreatedBroker(data.broker);
        setCreatedSecret(data.api_secret);
        fetchBrokers(); // Refresh list
      }
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to create broker');
    } finally {
      setCreating(false);
    }
  };

  const generateWidgetCode = (apiKey: string) => {
    return `<!-- Tradeline Widget -->
<div id="tradeline-widget"></div>
<script>
  window.TL_WIDGET_CONFIG = {
    apiKey: "${apiKey}",
    apiUrl: "https://tradeline-marketplace-production-bcaa.up.railway.app/api"
  };
</script>
<script src="https://tradeline-marketplace-production-bcaa.up.railway.app/admin/widget.js"></script>
<link rel="stylesheet" href="https://tradeline-marketplace-production-bcaa.up.railway.app/admin/widget.css">`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openViewModal = (broker: any) => {
    setSelectedBroker(broker);
    setShowViewModal(true);
  };

  const closeCreateModal = () => {
    setShowModal(false);
    setCreatedSecret(null);
    setCreatedBroker(null);
    setNewBroker(initialFormData);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#051b41]">Broker Management</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#051b41] text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Broker
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Business</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Rev Share</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">Loading...</td></tr>
              ) : brokers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8">No brokers found.</td></tr>
              ) : (
                brokers.map((broker: any) => (
                  <tr key={broker.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-[#051b41]">{broker.name}</td>
                    <td className="px-6 py-3">{broker.business_name || '-'}</td>
                    <td className="px-6 py-3">{broker.email}</td>
                    <td className="px-6 py-3">{broker.phone || '-'}</td>
                    <td className="px-6 py-3">{broker.revenue_share_percent}%</td>
                    <td className="px-6 py-3">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${
                           broker.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                           broker.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                           'bg-gray-100 text-gray-800'
                         }`}>
                            {broker.status}
                         </span>
                    </td>
                    <td className="px-6 py-3">
                       <button 
                         onClick={() => openViewModal(broker)}
                         className="flex items-center gap-1 text-blue-600 hover:underline"
                       >
                         <Eye className="w-4 h-4" /> View
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Broker Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#051b41]">
                  {createdSecret ? "Broker Created Successfully!" : "Add New Broker"}
              </h2>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {createdSecret && createdBroker ? (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 p-4 rounded">
                        <p className="text-green-800 font-bold mb-2">✅ Broker "{createdBroker.name}" created!</p>
                        
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">API Key:</p>
                          <code className="block bg-gray-100 p-2 rounded text-xs break-all">{createdBroker.api_key}</code>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">API Secret (save this now!):</p>
                          <code className="block bg-black text-green-400 p-2 rounded text-xs break-all">{createdSecret}</code>
                          <p className="text-xs text-red-600 mt-1">⚠️ This secret will not be shown again!</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                        <p className="font-bold text-blue-800 mb-2">📋 Widget Embed Code</p>
                        <p className="text-xs text-gray-600 mb-2">Share this code with the broker to add to their website:</p>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                          {generateWidgetCode(createdBroker.api_key)}
                        </pre>
                        <button 
                            onClick={() => copyToClipboard(generateWidgetCode(createdBroker.api_key))}
                            className="mt-2 flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Copy className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy Code'}
                        </button>
                    </div>

                    <button 
                        onClick={closeCreateModal}
                        className="w-full bg-[#051b41] text-white py-2 rounded font-medium"
                    >
                        Done
                    </button>
                </div>
            ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium mb-1">Contact Name <span className="text-red-500">*</span></label>
                       <input required className="w-full border p-2 rounded" 
                              value={newBroker.name} onChange={e => setNewBroker({...newBroker, name: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-sm font-medium mb-1">Business Name <span className="text-red-500">*</span></label>
                       <input required className="w-full border p-2 rounded" 
                              value={newBroker.business_name} onChange={e => setNewBroker({...newBroker, business_name: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
                       <input required type="email" className="w-full border p-2 rounded" 
                              value={newBroker.email} onChange={e => setNewBroker({...newBroker, email: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-sm font-medium mb-1">Phone <span className="text-red-500">*</span></label>
                       <input required type="tel" className="w-full border p-2 rounded" placeholder="(555) 123-4567"
                              value={newBroker.phone} onChange={e => setNewBroker({...newBroker, phone: e.target.value})} />
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium mb-1">Website URL <span className="text-red-500">*</span></label>
                     <input required type="url" className="w-full border p-2 rounded" placeholder="https://example.com"
                            value={newBroker.website} onChange={e => setNewBroker({...newBroker, website: e.target.value})} />
                  </div>

                  <div>
                     <label className="block text-sm font-medium mb-1">Revenue Share (%)</label>
                     <input type="number" min="0" max="100" className="w-full border p-2 rounded" 
                            value={newBroker.revenue_share} onChange={e => setNewBroker({...newBroker, revenue_share: parseInt(e.target.value) || 10})} />
                     <p className="text-xs text-gray-500 mt-1">Broker's commission percentage (10-25% typical)</p>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                      <button type="button" onClick={closeCreateModal} className="flex-1 border p-2 rounded hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={creating} className="flex-1 bg-[#051b41] text-white p-2 rounded hover:bg-blue-900">
                          {creating ? 'Creating...' : 'Create Broker'}
                      </button>
                  </div>
                </form>
            )}
          </div>
        </div>
      )}

      {/* View Broker Modal */}
      {showViewModal && selectedBroker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#051b41]">Broker Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Contact Name</p>
                  <p className="font-medium">{selectedBroker.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Business Name</p>
                  <p className="font-medium">{selectedBroker.business_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{selectedBroker.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{selectedBroker.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Website</p>
                  <p className="font-medium">{selectedBroker.website || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Revenue Share</p>
                  <p className="font-medium">{selectedBroker.revenue_share_percent}%</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-1">API Key</p>
                <code className="block bg-gray-100 p-2 rounded text-xs break-all">{selectedBroker.api_key}</code>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                <p className="font-bold text-blue-800 mb-2">📋 Widget Embed Code</p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                  {generateWidgetCode(selectedBroker.api_key)}
                </pre>
                <button 
                    onClick={() => copyToClipboard(generateWidgetCode(selectedBroker.api_key))}
                    className="mt-2 flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <Copy className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              <button 
                  onClick={() => setShowViewModal(false)}
                  className="w-full border border-gray-300 py-2 rounded font-medium hover:bg-gray-50"
              >
                  Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brokers;
