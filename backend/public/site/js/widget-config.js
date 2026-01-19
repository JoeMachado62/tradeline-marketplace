// Configuration for the Tradeline Widget
// This is loaded before the widget script on pages that display the inventory
window.TL_WIDGET_CONFIG = {
  // API URL - widget appends /public/... so we just need /api
  apiUrl: window.location.origin + '/api',
  apiKey: 'tlm_21720a89f9f628ed782536045ed72cdcb95d928b7fbc580bf6db43b4811228eb',
  theme: {
    primaryColor: '#032530',
    accentColor: '#F4D445'
  }
};

console.log('[Widget Config] TL_WIDGET_CONFIG loaded:', window.TL_WIDGET_CONFIG);

