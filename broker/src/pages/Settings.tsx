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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Markup Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Markup</h2>
          <p className="text-gray-600 mb-6">
            Set your markup to increase the displayed price of tradelines in your widget. 
            This markup is added to the base price and you keep 100% of it as commission.
          </p>

          <div className="space-y-4">
            {/* Markup Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Markup Type</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSettings({ ...settings, markup_type: 'PERCENTAGE' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    settings.markup_type === 'PERCENTAGE'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Percent className="w-4 h-4" />
                  Percentage
                </button>
                <button
                  onClick={() => setSettings({ ...settings, markup_type: 'FIXED' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    settings.markup_type === 'FIXED'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Fixed Amount
                </button>
              </div>
            </div>

            {/* Markup Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup Value {settings.markup_type === 'PERCENTAGE' ? '(%)' : '($)'}
              </label>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {settings.markup_type === 'PERCENTAGE' ? '%' : '$'}
                </span>
                <input
                  type="number"
                  min="0"
                  max={settings.markup_type === 'PERCENTAGE' ? 100 : 10000}
                  step={settings.markup_type === 'PERCENTAGE' ? 1 : 10}
                  value={settings.markup_value}
                  onChange={(e) => setSettings({ ...settings, markup_value: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Example Calculation */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Example Calculation</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Base Price (API):</span>
              <span className="font-medium">${exampleBasePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Your Markup ({settings.markup_type === 'PERCENTAGE' ? `${settings.markup_value}%` : 'fixed'}):</span>
              <span className="font-medium text-green-600">+${exampleMarkup.toFixed(2)}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
              <span className="text-blue-900 font-medium">Customer Pays:</span>
              <span className="font-bold text-lg">${exampleCustomerPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Your Commission Breakdown:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Revenue Share ({settings.revenue_share_percent}% of base):</span>
                <span className="font-medium">${exampleRevenueShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Markup (100% yours):</span>
                <span className="font-medium">${exampleMarkup.toFixed(2)}</span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                <span className="text-blue-900 font-medium">Total Commission:</span>
                <span className="font-bold text-lg text-green-600">${exampleCommission.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Share Info */}
        <div className="bg-gray-100 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Revenue Share Rate</h3>
          <p className="text-2xl font-bold text-gray-900">{settings.revenue_share_percent}%</p>
          <p className="text-sm text-gray-500 mt-1">
            This is set by the platform administrator and applies to base prices.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </main>
    </div>
  );
};

export default Settings;
