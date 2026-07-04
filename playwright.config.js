import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:41737',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      name: 'backend',
      command: 'node src/server.js',
      cwd: './backend',
      url: 'http://localhost:41738/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        DATABASE_PATH: './.e2e/snow-e2e.db',
        SHARE_ALLOWED_ORIGINS:
          'http://localhost:41737,http://127.0.0.1:41737',
      },
    },
    {
      name: 'frontend',
      command: 'npm run dev',
      url: 'http://localhost:41737',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
