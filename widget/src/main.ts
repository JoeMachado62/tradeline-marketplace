import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Widget from './Widget.vue'
import type { WidgetConfig } from './types'
import { useWidgetStore } from './stores/widget'

// Standard initialization for standalone testing
const initWidget = async (config: WidgetConfig, selector: string = '#app') => {
  const app = createApp(Widget)
  const pinia = createPinia()
  app.use(pinia)
  app.mount(selector)

  const store = useWidgetStore()
  await store.initialize(config)
  
  return { app, store }
}

// Check for global config or auto-init
const globalConfig = (window as any).TL_WIDGET_CONFIG;

// Development Mode Auto-Init
if (import.meta.env.DEV && !globalConfig) {
  const devUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  console.log("🔧 Development Mode: Connecting to", devUrl);
  
  initWidget({
    apiKey: "test_dev_key",
    apiUrl: devUrl,
    theme: {
      primaryColor: "#2563eb",
      secondaryColor: "#1e40af"
    }
  });
} else if (globalConfig) {
  initWidget(globalConfig);
}

// Export for manual initialization
;(window as any).initTradelineWidget = initWidget

export { initWidget }
