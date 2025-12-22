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
const globalConfig = (window as any).TLM_WIDGET_CONFIG
if (globalConfig) {
  initWidget(globalConfig)
}

// Export for manual initialization
;(window as any).initTradelineWidget = initWidget

export { initWidget }
