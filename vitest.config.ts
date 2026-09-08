import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@aihu\/context\/ssr$/, replacement: resolve(__dirname, 'src/ssr.ts') },
      { find: /^@aihu\/context$/, replacement: resolve(__dirname, 'src/index.ts') },
    ],
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
