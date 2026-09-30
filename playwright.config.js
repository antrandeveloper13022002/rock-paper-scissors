import { defineConfig, devices } from '@playwright/test';

// End-to-end tests in a real browser. `npm run e2e` starts the Vite dev server
// and the online WebSocket server itself, then runs e2e/*.spec.js.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // Uses the Microsoft Edge already installed on this machine (Chromium), so no
  // separate browser download is needed. On a machine with Playwright's own
  // Chromium (`npx playwright install chromium`), drop `channel`.
  projects: [{ name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1280, height: 800 } } }],
  webServer: [
    { command: 'npx vite --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: true },
    { command: 'node server/index.js', port: 8787, reuseExistingServer: true },
  ],
});
