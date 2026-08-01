import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * `node` is enough: the dither core touches the DOM only inside `prepareSource`, never at
 * module scope, so `applyDither` is a pure function of its arguments.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
