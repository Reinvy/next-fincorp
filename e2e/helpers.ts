import { expect, type Page } from "@playwright/test";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ override: true });

export const ADMIN = { email: "admin@fincorp.id", password: "FinCorp#2026" };
export const ACCOUNTANT = { email: "akuntan@fincorp.id", password: "Akuntan#2026" };
export const VIEWER = { email: "viewer@fincorp.id", password: "Viewer#2026" };

export async function ready(page: Page): Promise<void> {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: "attached", timeout: 30_000 });
}

export async function login(page: Page, user = ADMIN): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").waitFor();
  await ready(page);
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: /^Masuk$/i }).click();
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 30_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await ready(page);
  await page.locator("summary").filter({ hasText: "@fincorp.id" }).first().click();
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL(/\/login/);
}

export async function dbQuery<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const connectionString =
    process.env.TEST_DATABASE_URL ?? "postgresql://fincorp:fincorp@127.0.0.1:5433/fincorp_test?schema=public";
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

export async function activeCompanyId(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "fincorp_company")?.value ?? "";
}

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.locator(".app-toast").last()).toContainText(text);
  // Server actions can still be re-rendering the route after the toast appears.
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(250);
}

export async function selectByText(page: Page, selector: string, text: string): Promise<void> {
  const option = page.locator(`${selector} option`).filter({ hasText: text }).first();
  const value = await option.getAttribute("value");
  if (!value) throw new Error(`Option not found: ${text}`);
  await page.locator(selector).selectOption(value);
}

export async function openDialog(
  page: Page,
  buttonName: string,
  fieldSelector: string,
  attempts = 4,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await page.locator(fieldSelector).isVisible().catch(() => false)) return;
    await page.getByRole("button", { name: buttonName }).first().click().catch(() => {});
    try {
      await page.locator(fieldSelector).waitFor({ state: "visible", timeout: 2500 });
      return;
    } catch {
      await page.waitForTimeout(300);
    }
  }
  await page.locator(fieldSelector).waitFor({ state: "visible", timeout: 10_000 });
}
