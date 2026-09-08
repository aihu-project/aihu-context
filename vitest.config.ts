import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@aihu/context': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      '@aihu/context/ssr': fileURLToPath(new URL('./src/ssr.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: false,
  },
})
