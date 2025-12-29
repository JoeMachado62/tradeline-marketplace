import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, KeyRound } from 'lucide-react';
import api from '../services/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/portal/forgot-password', { email });
      setSuccess(true);
    } catch {
      // Don't reveal if email exists or not for security
      setSuccess(true); // Always show success to prevent email enumeration
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen login-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#032530] mb-2">Check Your Email</h1>
          <p className="text-gray-600 mb-6">
            If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            The link will expire in 1 hour. Check your spam folder if you don't see it.
          </p>
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-[#032530] hover:text-[#021a22] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen login-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#032530] rounded-2xl mb-4">
            <KeyRound className="w-8 h-8 text-[#F4D445]" />
          </div>
          <h1 className="text-2xl font-bold text-[#032530]">Forgot Password</h1>
          <p className="text-gray-500 mt-1">Enter your email to receive a reset link</p>
        </div>

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
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
                Sending...
              </span>
            ) : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-[#032530] hover:text-[#021a22] font-medium text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
