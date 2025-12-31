import React, { useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, User } from 'lucide-react';
import api from '../services/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill email from URL if present (from registered redirect)
  React.useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/login', { email, password });
      if (data.success) {
        localStorage.setItem('client_token', data.token);
        localStorage.setItem('client_user', JSON.stringify(data.client));
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const error = err as AxiosError<{ error: string }>;
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const isNewClient = searchParams.get('new');

  return (
    <div className="min-h-screen login-bg flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        
        {/* New Client Welcome Banner */}
        {isNewClient && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-2xl p-8 mb-6 text-white text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Thank You For Your Order!</h2>
            <p className="text-emerald-100 mb-4">
              Your tradeline order has been submitted successfully and is being processed.
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-left text-sm space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-lg">📧</span>
                <span>You'll receive a confirmation email with your order details and next steps.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📋</span>
                <span>Our team will review your documents and begin processing your tradelines.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📊</span>
                <span>Track your order status anytime by logging into this portal.</span>
              </div>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo/Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#032530] rounded-2xl mb-4">
              <User className="w-8 h-8 text-[#F4D445]" />
            </div>
            <h1 className="text-2xl font-bold text-[#032530]">Client Portal</h1>
            <p className="text-gray-500 mt-1">
              {isNewClient 
                ? 'Log in below to track your order status' 
                : 'Login to view your orders'}
            </p>
          </div>

          {isNewClient && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-6 text-sm">
              <strong>📬 Check Your Email!</strong><br/>
              Your login credentials have been sent to your email address. Use your email and the password you created during checkout.
            </div>
          )}
          
          {searchParams.get('reset') && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg mb-6 text-sm">
              Password reset successfully! Please log in with your new password.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#032530] focus:ring-2 focus:ring-[#032530]/10 outline-none transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:border-[#032530] focus:ring-2 focus:ring-[#032530]/10 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#032530] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-[#032530] hover:text-[#021a22] font-medium">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#032530] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#021a22] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Logging in...
                </span>
              ) : 'Login'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Need help? <a href="mailto:support@tradelinerental.com" className="text-[#032530] font-medium hover:underline">Contact Support</a>
            </p>
          </div>
        </div>

        {/* What to Expect - Only for new clients */}
        {isNewClient && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center">
            <h3 className="font-semibold text-[#032530] mb-2">What Happens Next?</h3>
            <p className="text-sm text-gray-600">
              Our team will verify your documents and add you as an authorized user to your selected tradelines. 
              This typically takes 1-3 business days. You'll receive email updates and can track progress here in your portal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
