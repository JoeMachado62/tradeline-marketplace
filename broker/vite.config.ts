import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.', 
  publicDir: 'public',
  base: '/broker/', // Assuming we serve it from /broker path in production if integrated, or root if standalone. Let's use /broker to be safe/consistent with admin
  server: {
    port: 3003,
    proxy: {
       '/api': {
         target: 'http://localhost:8080',
         changeOrigin: true
       }
    }
  },
  build: {
    outDir: '../backend/broker-dist', // Output to backend folder directly for serving
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
