import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, CheckCircle, XCircle, RotateCcw, AlertCircle } from 'lucide-react';

interface Broker {
  id: string;
  name: string;
  business_name: string;
  business_address: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  created_at: string;
  revenue_share_percent: number;
  api_key: string;
}

export default function Brokers() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<Broker | null>(null);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [newBroker, setNewBroker] = useState({
    name: '',
    email: '',
    business_name: '',
    business_address: '',
    phone: '',
    revenue_share: 10
  });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [resetSecret, setResetSecret] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<Broker | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      const response = await api.get('/admin/brokers');
      setBrokers(response.data.brokers);
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await api.post('/admin/brokers', newBroker);
      setBrokers([response.data.broker, ...brokers]);
      setCreatedSecret(response.data.api_secret);
      // Don't close modal immediately, show success state
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create broker');
    }
  };
  
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBroker) return;
    setError('');

    try {
        const response = await api.put(`/admin/brokers/${editingBroker.id}`, {
            name: editingBroker.name,
            business_name: editingBroker.business_name,
            business_address: editingBroker.business_address,
            email: editingBroker.email,
            phone: editingBroker.phone,
            revenue_share: editingBroker.revenue_share_percent,
            status: editingBroker.status.toUpperCase() // API expects uppercase
        });
        
        // Update local list
        setBrokers(brokers.map(b => b.id === editingBroker.id ? { ...response.data.broker, status: response.data.broker.status.toLowerCase() } : b));
        setEditingBroker(null);
    } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to update broker');
    }
  };

  const handleResetSecret = async () => {
    if (!showResetConfirm) return;
    try {
        const response = await api.post(`/admin/brokers/${showResetConfirm.id}/reset-secret`);
        setResetSecret(response.data.api_secret);
        // Keep modal open to show secret
    } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to reset secret');
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewBroker({ name: '', email: '', business_name: '', business_address: '', phone: '', revenue_share: 10 });
    setCreatedSecret(null);
    setError('');
  };

  const closeResetModal = () => {
    setShowResetConfirm(null);
    setResetSecret(null);
  };
  
  const getEmbedCode = (apiKey: string) => {
      return `<script src="${window.location.protocol}//${window.location.hostname}:3002/widget/loader.js" data-api-key="${apiKey}"></script>`;
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      // Could add toast here
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Brokers</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Broker
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">Broker Name</th>
                  <th className="p-4 font-semibold text-gray-600">Company</th>
                  <th className="p-4 font-semibold text-gray-600">Contact</th>
                  <th className="p-4 font-semibold text-gray-600">Rev Share</th>
                  <th className="p-4 font-semibold text-gray-600">Status</th>
                  <th className="p-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map((broker) => (
                  <tr key={broker.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{broker.name}</div>
                      <div className="text-sm text-gray-500">Joined {new Date(broker.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                        <div className="text-gray-900">{broker.business_name}</div>
                    </td>
                    <td className="p-4">
                        <div className="text-sm text-gray-900">{broker.email}</div>
                        <div className="text-sm text-gray-500">{broker.phone}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {broker.revenue_share_percent}%
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        broker.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {broker.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                        <div className="flex gap-2">
                             <button onClick={() => setShowViewModal(broker)} className="text-gray-500 hover:text-primary-600">
                                View
                             </button>
                             <button onClick={() => setEditingBroker(broker)} className="text-gray-500 hover:text-primary-600">
                                Edit
                             </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add New Broker</h2>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {createdSecret ? (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <h3 className="text-green-800 font-bold flex items-center gap-2">
                            <CheckCircle className="w-5 h-5"/> Broker Created Successfully
                        </h3>
                        <p className="text-green-700 text-sm mt-1">Please copy the API credentials below. The secret key will not be shown again.</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Secret Key</label>
                        <div className="flex gap-2">
                            <input type="text" readOnly value={createdSecret} className="w-full p-2 bg-gray-50 border rounded font-mono text-sm" />
                            <button onClick={() => copyToClipboard(createdSecret)} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm">Copy</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Widget Embed Code</label>
                        <textarea 
                            readOnly 
                            className="w-full p-2 bg-gray-50 border rounded font-mono text-xs h-24"
                            value={brokers.find(b => b.email === newBroker.email)?.api_key ? getEmbedCode(brokers.find(b => b.email === newBroker.email)!.api_key) : 'API_KEY'}
                        />
                         <p className="text-xs text-gray-500 mt-1">Send this code to the broker to install the widget on their site.</p>
                    </div>

                    <button onClick={closeCreateModal} className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 mt-4">
                        Done
                    </button>
                </div>
            ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  {error && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4"/> {error}
                      </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                        <input
                          type="text"
                          required
                          className="w-full border rounded-lg p-2"
                          value={newBroker.name}
                          onChange={(e) => setNewBroker({ ...newBroker, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          required
                          className="w-full border rounded-lg p-2"
                          value={newBroker.email}
                          onChange={(e) => setNewBroker({ ...newBroker, email: e.target.value })}
                        />
                      </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Legal Business Name</label>
                    <input
                      type="text"
                      required
                      className="w-full border rounded-lg p-2"
                      value={newBroker.business_name}
                      onChange={(e) => setNewBroker({ ...newBroker, business_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                    <textarea
                      required
                      rows={2}
                      className="w-full border rounded-lg p-2"
                      value={newBroker.business_address}
                      onChange={(e) => setNewBroker({ ...newBroker, business_address: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          required
                          className="w-full border rounded-lg p-2"
                          value={newBroker.phone}
                          onChange={(e) => setNewBroker({ ...newBroker, phone: e.target.value })}
                        />
                      </div>
                      <div>
                      </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Share (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      className="w-full border rounded-lg p-2"
                      value={newBroker.revenue_share}
                      onChange={(e) => setNewBroker({ ...newBroker, revenue_share: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Percentage of base price the broker keeps as commission.</p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={closeCreateModal}
                      className="mr-2 px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      Create Broker
                    </button>
                  </div>
                </form>
            )}
          </div>
        </div>
      )}
      
      {/* EDIT MODAL */}
      {editingBroker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Edit Broker</h2>
              <button onClick={() => setEditingBroker(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4"/> {error}
                  </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg p-2"
                      value={editingBroker.name}
                      onChange={(e) => setEditingBroker({ ...editingBroker, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full border rounded-lg p-2"
                      value={editingBroker.email}
                      onChange={(e) => setEditingBroker({ ...editingBroker, email: e.target.value })}
                    />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Business Name</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={editingBroker.business_name}
                  onChange={(e) => setEditingBroker({ ...editingBroker, business_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg p-2"
                  value={editingBroker.business_address || ''}
                  onChange={(e) => setEditingBroker({ ...editingBroker, business_address: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full border rounded-lg p-2"
                      value={editingBroker.phone || ''}
                      onChange={(e) => setEditingBroker({ ...editingBroker, phone: e.target.value })}
                    />
                  </div>
                  <div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Share (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full border rounded-lg p-2"
                      value={editingBroker.revenue_share_percent}
                      onChange={(e) => setEditingBroker({ ...editingBroker, revenue_share_percent: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select 
                          className="w-full border rounded-lg p-2"
                          value={editingBroker.status}
                          onChange={(e) => setEditingBroker({...editingBroker, status: e.target.value as any})}
                      >
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                          <option value="inactive">Inactive</option>
                      </select>
                  </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setEditingBroker(null)}
                  className="mr-2 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
              
              <div className="border-t pt-4 mt-2">
                 <h4 className="text-sm font-bold text-gray-900 mb-2">Danger Zone</h4>
                 <button 
                    type="button"
                    onClick={() => { setEditingBroker(null); setShowResetConfirm(editingBroker); }}
                    className="text-red-600 text-sm hover:underline flex items-center gap-1"
                 >
                     <RotateCcw className="w-3 h-3" /> Reset API Secret
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {showViewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-xl font-bold">{showViewModal.business_name}</h2>
                    <p className="text-gray-500 text-sm">Created on {new Date(showViewModal.created_at).toLocaleDateString()}</p>
                 </div>
                 <button onClick={() => setShowViewModal(null)} className="text-gray-400 hover:text-gray-600">
                   <XCircle className="w-6 h-6" />
                 </button>
               </div>
               
               <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                           <span className="block text-gray-500">Contact Person</span>
                           <span className="font-medium">{showViewModal.name}</span>
                       </div>
                       <div>
                           <span className="block text-gray-500">Status</span>
                           <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                showViewModal.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                           }`}>
                               {showViewModal.status.toUpperCase()}
                           </span>
                       </div>
                       <div>
                           <span className="block text-gray-500">Email</span>
                           <span className="font-medium">{showViewModal.email}</span>
                       </div>
                       <div>
                           <span className="block text-gray-500">Phone</span>
                           <span className="font-medium">{showViewModal.phone || 'N/A'}</span>
                       </div>
                       <div className="col-span-2">
                           <span className="block text-gray-500">Address</span>
                           <span className="font-medium whitespace-pre-wrap">{showViewModal.business_address || 'N/A'}</span>
                       </div>
                   </div>
                   
                   <div className="bg-gray-50 p-3 rounded-lg">
                       <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Integration Details</h4>
                       <div className="space-y-2">
                           <div>
                               <label className="text-xs text-gray-500">API Key</label>
                               <div className="flex gap-2">
                                   <code className="text-xs bg-white border p-1 rounded block w-full">{showViewModal.api_key}</code>
                                   <button onClick={() => copyToClipboard(showViewModal.api_key)} className="text-xs bg-gray-200 px-2 rounded">Copy</button>
                               </div>
                           </div>
                           <div>
                               <label className="text-xs text-gray-500">Embed Code</label>
                               <div className="relative">
                                  <textarea readOnly className="w-full text-xs font-mono p-2 border rounded bg-white h-16" value={getEmbedCode(showViewModal.api_key)} />
                                  <button onClick={() => copyToClipboard(getEmbedCode(showViewModal.api_key))} className="absolute top-1 right-1 text-xs bg-gray-100 px-1 rounded border">Copy</button>
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
               
               <div className="mt-6 flex justify-end">
                   <button onClick={() => setShowViewModal(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">Close</button>
               </div>
            </div>
          </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-sm w-full p-6">
                  {resetSecret ? (
                      <div className="text-center">
                          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">Secret Reset Successful</h3>
                          <p className="text-sm text-gray-600 mb-4">Here is the new API Secret. Copy it now, it won't be shown again.</p>
                          <div className="bg-gray-50 p-3 rounded border mb-4 break-all font-mono text-sm text-center select-all">
                              {resetSecret}
                          </div>
                          <button onClick={closeResetModal} className="w-full bg-primary-600 text-white py-2 rounded-lg">Done</button>
                      </div>
                  ) : (
                      <div className="text-center">
                          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                              <AlertCircle className="w-6 h-6 text-red-600" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">Reset API Secret?</h3>
                          <p className="text-sm text-gray-600 mb-6">
                              Are you sure you want to generate a new API Secret for <strong>{showResetConfirm.name}</strong>? 
                              The old secret will stop working immediately, which may break their live widget.
                          </p>
                          <div className="flex gap-3">
                              <button onClick={() => setShowResetConfirm(null)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                              <button onClick={handleResetSecret} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Yes, Reset</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}
