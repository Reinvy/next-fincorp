import { execFileSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  execFileSync("npx", ["tsx", "scripts/reset-test-db.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      TEST_DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://fincorp:fincorp@127.0.0.1:5433/fincorp_test?schema=public",
    },
  });
}
