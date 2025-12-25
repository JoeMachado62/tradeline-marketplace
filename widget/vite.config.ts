import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../backend/widget-dist',
    emptyOutDir: true,
    // Build as a library/widget that can be embedded
    lib: {
      entry: './src/main.ts',
      name: 'TradelineWidget',
      fileName: 'tradeline-widget',
      formats: ['iife'] // Immediately Invoked Function Expression for browser embedding
    },
    rollupOptions: {
      output: {
        // Ensure CSS is embedded or served alongside
        assetFileNames: 'tradeline-widget.[ext]'
      }
    }
  }
})
