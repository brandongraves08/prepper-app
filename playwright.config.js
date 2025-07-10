// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  webServer: {
    command: 'npm run preview --prefix src/ui/frontend -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000,
  },
  testDir: './tests/e2e',
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
  },
};
module.exports = config;
