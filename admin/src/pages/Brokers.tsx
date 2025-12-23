import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';

const Brokers: React.FC = () => {
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newBroker, setNewBroker] = useState({ name: '', email: '', business_name: '', revenue_share: 10 });
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

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
    try {
      const { data } = await api.post('/admin/brokers', newBroker);
      if (data.success) {
        setBrokers([data.broker, ...brokers]); // Optimistic update or refetch
        setCreatedSecret(data.api_secret);
        // Don't close modal immediately, show secret
      }
    } catch (error) {
      console.error(error);
      alert('Failed to create broker');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#051b41]">Broker Management</h1>
        <button 
          onClick={() => { setShowModal(true); setCreatedSecret(null); }}
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
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Business</th>
                <th className="px-6 py-3">Rev Share</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">API Key</th>
                <th className="px-6 py-3">Joined</th>
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
                    <td className="px-6 py-3">{broker.email}</td>
                    <td className="px-6 py-3">{broker.business_name || '-'}</td>
                    <td className="px-6 py-3">{broker.revenue_share_percent}%</td>
                    <td className="px-6 py-3">
                         <span className={`px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-bold`}>
                            {broker.status}
                         </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-mono text-gray-500">
                        {broker.api_key?.substring(0, 10)}...
                    </td>
                    <td className="px-6 py-3">{new Date(broker.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-[#051b41]">
                {createdSecret ? "Broker Created!" : "Add New Broker"}
            </h2>
            
            {createdSecret ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
                    <p className="text-green-800 font-bold mb-2">Success! Here is the API Secret:</p>
                    <code className="block bg-black text-green-400 p-3 rounded font-mono break-all text-sm mb-2">
                        {createdSecret}
                    </code>
                    <p className="text-xs text-red-600 font-medium">
                        ⚠️ Copy this now. It will not be shown again.
                    </p>
                    <button 
                        onClick={() => { setShowModal(false); setCreatedSecret(null); }}
                        className="mt-4 w-full bg-[#051b41] text-white py-2 rounded"
                    >
                        Done
                    </button>
                </div>
            ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium mb-1">Full Name</label>
                   <input required className="w-full border p-2 rounded" 
                          value={newBroker.name} onChange={e => setNewBroker({...newBroker, name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Email</label>
                   <input required type="email" className="w-full border p-2 rounded" 
                          value={newBroker.email} onChange={e => setNewBroker({...newBroker, email: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Business Name (Optional)</label>
                   <input className="w-full border p-2 rounded" 
                          value={newBroker.business_name} onChange={e => setNewBroker({...newBroker, business_name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Revenue Share (%)</label>
                   <input type="number" min="0" max="100" className="w-full border p-2 rounded" 
                          value={newBroker.revenue_share} onChange={e => setNewBroker({...newBroker, revenue_share: parseInt(e.target.value)})} />
                </div>
                
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 border p-2 rounded hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={creating} className="flex-1 bg-[#051b41] text-white p-2 rounded hover:bg-blue-900">
                        {creating ? 'Creating...' : 'Create Broker'}
                    </button>
                </div>
                </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Brokers;
