import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './tests/helpers/global-setup.ts',
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  workers: 1, // serial para garantir ordem dos dados no mesmo DB de seed

  use: {
    baseURL: 'http://localhost',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
    trace: 'retain-on-failure',
  },

  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
});
