import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Force new file hashes on each build
const buildId = Date.now().toString(36)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5020,
    proxy: {
      '/api': {
        target: 'http://localhost:4020',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-${buildId}-[hash].js`,
        chunkFileNames: `assets/[name]-${buildId}-[hash].js`,
        assetFileNames: `assets/[name]-${buildId}-[hash].[ext]`
      }
    }
  }
})
