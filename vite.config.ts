import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const simulator = process.env.SIM_TARGET ?? 'http://localhost:4010'
const proxy = {
  '/api': { target: simulator, changeOrigin: true },
  '/ws': { target: simulator.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
}

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
  build: { sourcemap: false },
})
