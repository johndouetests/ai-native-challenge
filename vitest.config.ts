import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [vue()],
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['tests/unit/setup.ts'],
          env: { TZ: 'Europe/Kyiv' },
        },
      },
      {
        test: {
          name: 'sim',
          environment: 'node',
          include: ['tests/server/**/*.test.ts'],
        },
      },
    ],
  },
})
