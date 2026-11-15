import dotenv from "dotenv";
import { defineConfig } from "@playwright/test";

dotenv.config({ override: true });

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://fincorp:fincorp@127.0.0.1:5433/fincorp_test?schema=public";
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/icon.svg`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});
