import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const envPath = resolve(process.cwd(), '.env')
if (!existsSync(envPath)) {
  console.error('\n❌ ==============================================================================')
  console.error('   FATAL: Archivo .env no encontrado en la raíz del proyecto para Vite.')
  console.error('   Por favor copie el archivo .env.example a .env antes de compilar o iniciar el frontend:')
  console.error('       cp .env.example .env')
  console.error('   ==============================================================================\n')
  process.exit(1)
}

export default defineConfig({
  plugins: [react()],
  root: 'src/web/client',
  envDir: process.cwd(),
  base: '/',
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
