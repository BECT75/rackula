import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["performance-step17.spec.ts"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "../playwright-report-step-17" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium" }],
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    cwd: "..",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
