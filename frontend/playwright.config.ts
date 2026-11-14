import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against a running frontend.
 * Defaults to the live Render site; set E2E_BASE_URL to test another build.
 *
 *   npx playwright test
 *   E2E_BASE_URL=http://localhost:5173 npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://vedicmath-ai-web-y5xo.onrender.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'mobile-chromium',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
})
