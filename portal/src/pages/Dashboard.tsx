import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Clock, AlertCircle, ChevronRight, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_charged_usd: string;
  created_at: string;
  item_count: number;
}

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, profileRes] = await Promise.all([
            api.get('/orders'),
            api.get('/profile')
        ]);
        
        if (ordersRes.data.success) {
          setOrders(ordersRes.data.orders);
        }
        
        if (profileRes.data.success) {
            setProfile(profileRes.data.client);
        }
      } catch (error) {
        console.error(error);
        // If 401, interceptor handles it
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = () => {
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_user');
      navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Client Portal</span>
            </div>
            <div className="flex items-center">
                <button 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                    Logout
                </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {profile?.has_signed_agreement && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Agreement Signed on {new Date(profile.signed_agreement_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
          )}

          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Orders</h1>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">You haven't placed any orders yet.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link to={`/orders/${order.id}`} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="text-sm font-medium text-blue-600 truncate">
                                {order.order_number}
                             </div>
                             <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                               {order.status}
                             </span>
                             {order.payment_status === 'PENDING' && (
                                 <span className="flex items-center gap-1 text-xs text-orange-600 font-medium border border-orange-200 bg-orange-50 px-2 py-0.5 rounded">
                                    <AlertCircle className="w-3 h-3" /> Unpaid
                                 </span>
                             )}
                          </div>
                          <div className="ml-2 flex-shrink-0 flex">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              ${order.total_charged_usd}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <Package className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              {order.item_count} Item{order.item_count !== 1 ? 's' : ''}
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              Placed on {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
