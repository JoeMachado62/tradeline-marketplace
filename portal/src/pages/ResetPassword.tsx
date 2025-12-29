import React, { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');

  useEffect(() => {
    // Validate token on page load
    const validateToken = async () => {
      if (!token) {
        setError('Invalid reset link. Please request a new one.');
        setValidating(false);
        return;
      }

      try {
        const { data } = await api.post('/portal/validate-reset-token', { token });
        if (data.valid) {
          setTokenValid(true);
        } else {
          setError('This reset link has expired. Please request a new one.');
        }
      } catch (err: unknown) {
        const error = err as AxiosError<{ error: string }>;
        setError(error.response?.data?.error || 'Invalid or expired reset link.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/portal/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login?reset=1');
      }, 2000);
    } catch (err: unknown) {
      const error = err as AxiosError<{ error: string }>;
      setError(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen login-bg flex items-center justify-center px-4">
        <div className="text-center text-white">
          <svg className="animate-spin w-12 h-12 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-white/80">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen login-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#032530] mb-2">Password Reset!</h1>
          <p className="text-gray-600">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen login-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#032530] mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            to="/forgot-password" 
            className="inline-block bg-[#032530] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#021a22] transition-colors"
          >
            Request New Reset Link
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
            <Lock className="w-8 h-8 text-[#F4D445]" />
          </div>
          <h1 className="text-2xl font-bold text-[#032530]">Set New Password</h1>
          <p className="text-gray-500 mt-1">Enter your new password below</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:border-[#032530] focus:ring-2 focus:ring-[#032530]/10 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#032530] focus:ring-2 focus:ring-[#032530]/10 outline-none transition-all"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
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
                Resetting...
              </span>
            ) : 'Reset Password'}
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

export default ResetPassword;
