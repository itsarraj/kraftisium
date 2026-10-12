import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['daisyui']
        }
      }
    }
  },
  // Absolute base so deep routes (e.g. /auth/google/callback) load /assets/* correctly.
  base: '/',
  // Enable source maps for better debugging
  css: {
    devSourcemap: true
  }
})