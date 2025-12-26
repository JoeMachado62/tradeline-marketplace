import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Widget from './Widget.vue'
import type { WidgetConfig } from './types'
import { useWidgetStore } from './stores/widget'

// Standard initialization
const initWidget = async (config: WidgetConfig, selector: string = '#tradeline-widget') => {
  const container = document.querySelector(selector);
  if (!container) {
    console.error(`[TradelineWidget] Container "${selector}" not found`);
    return null;
  }

  const app = createApp(Widget)
  const pinia = createPinia()
  app.use(pinia)
  app.mount(selector)

  const store = useWidgetStore()
  await store.initialize(config)
  
  console.log('[TradelineWidget] Initialized successfully with API:', config.apiUrl);
  return { app, store }
}

// Auto-initialize when DOM is ready
const autoInit = () => {
  const globalConfig = (window as any).TL_WIDGET_CONFIG;
  
  if (globalConfig) {
    console.log('[TradelineWidget] Found config, initializing...');
    initWidget(globalConfig);
  } else {
    console.log('[TradelineWidget] No TL_WIDGET_CONFIG found. Use window.initTradelineWidget(config) to initialize manually.');
  }
};

// Run auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  // DOM already loaded
  autoInit();
}

// Export for manual initialization
(window as any).initTradelineWidget = initWidget

export { initWidget }
