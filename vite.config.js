import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  esbuild: {
    jsx: 'automatic',
    target: 'es2020',
  },
  build: {
    target: 'es2020',
  },
  base: '/cardnews-app/',
})