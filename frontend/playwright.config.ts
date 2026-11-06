import { defineConfig } from "@playwright/test";

// E2E: backend (localhost:8000, seeded with --demo-verify) ar frontend age chalu thakte hobe.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}, baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true, timeout: 60_000 },
});
