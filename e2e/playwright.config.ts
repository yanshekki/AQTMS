// ── Playwright Configuration ──
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 1,
  workers: 2,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'cd ../apps/backend && npx tsx src/main.ts',
      port: 3001,
      timeout: 10_000,
      reuseExistingServer: true,
    },
    {
      command: 'cd ../apps/web && npx vite --port 5173',
      port: 5173,
      timeout: 10_000,
      reuseExistingServer: true,
    },
  ],
});
