import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://snsmakeit.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
    target: 'es2020',
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('fabric')) return 'fabric';
          if (id.includes('node_modules/react-dom')) return 'vendor';
          if (id.includes('node_modules/react/')) return 'vendor';
          if (id.includes('leaflet')) return 'leaflet';
          if (id.includes('i18n.jsx') || id.includes('i18n-pages.js')) return 'i18n';
          if (id.includes('dompurify')) return 'purify';
        },
      },
    },
  },

})