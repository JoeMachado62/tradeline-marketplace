import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Percent, DollarSign } from 'lucide-react';
import api from '../services/api';

interface BrokerSettings {
  markup_type: 'PERCENTAGE' | 'FIXED';
  markup_value: number;
  revenue_share_percent: number;
  allow_promo_codes: boolean;
  primary_color: string;
  secondary_color: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<BrokerSettings>({
    markup_type: 'PERCENTAGE',
    markup_value: 0,
    revenue_share_percent: 10,
    allow_promo_codes: true,
    primary_color: '#032530',
    secondary_color: '#F4D445',
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
          allow_promo_codes: data.broker.allow_promo_codes !== false,
          primary_color: data.broker.primary_color || '#032530',
          secondary_color: data.broker.secondary_color || '#F4D445',
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
        allow_promo_codes: settings.allow_promo_codes,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
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
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

      {/* Main Settings Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#032530] mb-2">Widget Configuration</h2>
        <p className="text-slate-500 mb-6">
          Customize how the tradeline widget appears and functions on your site.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LEFT: Pricing Markup */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Pricing Strategy
            </h3>

            {/* Markup Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Markup Type</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSettings({ ...settings, markup_type: 'PERCENTAGE' })}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition font-medium ${settings.markup_type === 'PERCENTAGE'
                    ? 'border-[#032530] bg-[#032530]/5 text-[#032530]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Percent className="w-4 h-4" />
                  Percentage
                </button>
                <button
                  onClick={() => setSettings({ ...settings, markup_type: 'FIXED' })}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition font-medium ${settings.markup_type === 'FIXED'
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

          {/* RIGHT: Branding Colors */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Branding Colors
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="h-12 w-12 rounded-lg cursor-pointer border-0 p-1 bg-white shadow-sm ring-1 ring-slate-200"
                  />
                  <div className="flex flex-col">
                    <input
                      type="text"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-24 text-sm border border-slate-200 rounded-md px-2 py-1 uppercase"
                      maxLength={7}
                    />
                    <span className="text-xs text-slate-400 mt-1">Buttons & Headers</span>
                  </div>
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="h-12 w-12 rounded-lg cursor-pointer border-0 p-1 bg-white shadow-sm ring-1 ring-slate-200"
                  />
                  <div className="flex flex-col">
                    <input
                      type="text"
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="w-24 text-sm border border-slate-200 rounded-md px-2 py-1 uppercase"
                      maxLength={7}
                    />
                    <span className="text-xs text-slate-400 mt-1">Accents & Highlights</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Live Preview</label>
              <div className="p-4 rounded-lg border border-slate-200 flex flex-col gap-3" style={{ background: '#fff' }}>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="font-bold" style={{ color: settings.primary_color }}>Widget Title</h4>
                  <span className="text-xs px-2 py-1 rounded bg-slate-100">Step 1/3</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded border border-slate-100 bg-slate-50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ background: settings.primary_color }}>TL</div>
                  <div className="flex-1">
                    <div className="h-2 w-20 bg-slate-200 rounded mb-1"></div>
                    <div className="h-2 w-12 bg-slate-200 rounded"></div>
                  </div>
                  <div className="font-bold" style={{ color: settings.primary_color }}>$500</div>
                </div>
                <button className="w-full py-2 rounded text-white font-medium text-sm" style={{ background: settings.primary_color }}>
                  Checkout Now
                </button>
                <div className="text-center text-xs font-medium" style={{ color: settings.secondary_color }}>
                  ★ Premium Partner
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Promo Codes */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-start gap-3">
            <div
              onClick={() => setSettings({ ...settings, allow_promo_codes: !settings.allow_promo_codes })}
              className={`relative w-11 h-6 transition flex-shrink-0 cursor-pointer rounded-full ${settings.allow_promo_codes ? 'bg-[#032530]' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.allow_promo_codes ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700">Promo Codes</h3>
              <p className="text-xs text-slate-500 mt-1">
                Toggle switch to Enable / Disable "10-30OFF" promo code.<br />
                Promo code is enabled by default and must be manually disabled. It provides the following discounts: 10% on second line, 20% on third line and 30% on any additional lines.
              </p>
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
    </div >
  );
};

export default Settings;
