import "dotenv/config";
import { Client } from "pg";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL belum diset.");
const databaseUrl: string = testUrl;

export async function main(): Promise<void> {
  const target = new URL(databaseUrl);
  const dbName = target.pathname.replace(/^\//, "");
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`created database ${dbName}`);
    }
  } finally {
    await client.end();
  }

  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to reset non-test database ${dbName}.`);
  }
  const database = new Client({ connectionString: databaseUrl });
  await database.connect();
  try {
    console.log(`• dropping schema public in ${dbName}`);
    await database.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  } finally {
    await database.end();
  }

  const { execFileSync } = await import("node:child_process");
  const env = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" as const };
  console.log("• applying migrations to test database");
  execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env });
  console.log("• seed test database");
  execFileSync("npx", ["prisma", "db", "seed"], { stdio: "inherit", env });
}

if (process.argv[1]?.endsWith("reset-test-db.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
