import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: 'src/web/client',
  base: '/app/',
  build: {
    outDir: resolve(process.cwd(), 'dist/web'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4300',
        changeOrigin: true,
      },
    },
  },
})
