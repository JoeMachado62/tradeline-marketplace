import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Percent, DollarSign } from 'lucide-react';
import api from '../services/api';

interface BrokerSettings {
  markup_type: 'PERCENTAGE' | 'FIXED';
  markup_value: number;
  revenue_share_percent: number;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<BrokerSettings>({
    markup_type: 'PERCENTAGE',
    markup_value: 0,
    revenue_share_percent: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/portal/broker/me');
      if (data.success) {
        setSettings({
          markup_type: data.broker.markup_type || 'PERCENTAGE',
          markup_value: data.broker.markup_value || 0,
          revenue_share_percent: data.broker.revenue_share_percent || 10,
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.put('/portal/broker/settings', {
        markup_type: settings.markup_type,
        markup_value: settings.markup_value,
      });

      if (data.success) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Calculate example pricing
  const exampleBasePrice = 500;
  const exampleMarkup = settings.markup_type === 'PERCENTAGE' 
    ? exampleBasePrice * (settings.markup_value / 100)
    : settings.markup_value;
  const exampleCustomerPrice = exampleBasePrice + exampleMarkup;
  const exampleRevenueShare = exampleBasePrice * (settings.revenue_share_percent / 100);
  const exampleCommission = exampleRevenueShare + exampleMarkup;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 mx-auto text-[#032530] mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-slate-600 hover:text-[#032530] p-2 rounded-lg hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-[#032530]">Settings</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-xl">
          {success}
        </div>
      )}

      {/* Markup Settings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#032530] mb-2">Pricing Markup</h2>
        <p className="text-slate-500 mb-6">
          Set your markup to increase the displayed price of tradelines in your widget. 
          This markup is added to the base price and you keep 100% of it as commission.
        </p>

        <div className="space-y-6">
          {/* Markup Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Markup Type</label>
            <div className="flex gap-4">
              <button
                onClick={() => setSettings({ ...settings, markup_type: 'PERCENTAGE' })}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition font-medium ${
                  settings.markup_type === 'PERCENTAGE'
                    ? 'border-[#032530] bg-[#032530]/5 text-[#032530]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Percent className="w-4 h-4" />
                Percentage
              </button>
              <button
                onClick={() => setSettings({ ...settings, markup_type: 'FIXED' })}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition font-medium ${
                  settings.markup_type === 'FIXED'
                    ? 'border-[#032530] bg-[#032530]/5 text-[#032530]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Fixed Amount
              </button>
            </div>
          </div>

          {/* Markup Value */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Markup Value {settings.markup_type === 'PERCENTAGE' ? '(%)' : '($)'}
            </label>
            <div className="relative w-48">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                {settings.markup_type === 'PERCENTAGE' ? '%' : '$'}
              </span>
              <input
                type="number"
                min="0"
                max={settings.markup_type === 'PERCENTAGE' ? 100 : 10000}
                step={settings.markup_type === 'PERCENTAGE' ? 1 : 10}
                value={settings.markup_value}
                onChange={(e) => setSettings({ ...settings, markup_value: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#032530]/10 focus:border-[#032530] outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Example Calculation */}
      <div className="bg-[#032530] rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Example Calculation</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-300">Base Price (API):</span>
            <span className="font-medium">${exampleBasePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Your Markup ({settings.markup_type === 'PERCENTAGE' ? `${settings.markup_value}%` : 'fixed'}):</span>
            <span className="font-medium text-[#F4D445]">+${exampleMarkup.toFixed(2)}</span>
          </div>
          <div className="border-t border-white/20 pt-3 mt-3 flex justify-between">
            <span className="font-medium">Customer Pays:</span>
            <span className="font-bold text-xl">${exampleCustomerPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20">
          <h4 className="font-medium mb-3">Your Commission Breakdown:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-300">Revenue Share ({settings.revenue_share_percent}% of base):</span>
              <span className="font-medium">${exampleRevenueShare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Markup (100% yours):</span>
              <span className="font-medium">${exampleMarkup.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/20 pt-3 mt-3 flex justify-between">
              <span className="font-semibold">Total Commission:</span>
              <span className="font-bold text-xl text-[#F4D445]">${exampleCommission.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Share Info */}
      <div className="bg-[#F4D445]/20 border border-[#F4D445] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[#032530] mb-1">Revenue Share Rate</h3>
        <p className="text-3xl font-bold text-[#032530]">{settings.revenue_share_percent}%</p>
        <p className="text-sm text-slate-600 mt-2">
          This is set by the platform administrator and applies to base prices.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 w-full bg-[#032530] text-white py-4 rounded-xl font-semibold hover:bg-[#021a22] transition disabled:opacity-50 shadow-lg"
      >
        <Save className="w-5 h-5" />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

export default Settings;
