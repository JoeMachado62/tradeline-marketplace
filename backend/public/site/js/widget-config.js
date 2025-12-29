// Configuration for the Tradeline Widget
// This is loaded before the widget script on pages that display the inventory
window.TL_WIDGET_CONFIG = {
  // API URL - widget appends /public/... so we just need /api
  apiUrl: window.location.origin + '/api',
  apiKey: 'tlm_02c2488d6724e0383c4f5cc870da89aa176e4eee615b747de6d89d3a5adc787e',
  theme: {
    primaryColor: '#032530',
    accentColor: '#F4D445'
  }
};

console.log('[Widget Config] TL_WIDGET_CONFIG loaded:', window.TL_WIDGET_CONFIG);

