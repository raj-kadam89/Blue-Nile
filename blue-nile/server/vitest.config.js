import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', OTP_PROVIDER: 'dev', CLIENT_URL: 'http://localhost:5173' },
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    include: ['tests/**/*.test.js'],
  },
})
