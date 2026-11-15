import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test("wrong password shows an inline error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(ADMIN.email);
  await page.locator("#password").fill("salah-sekali");
  await page.getByRole("button", { name: /^Masuk$/i }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Email atau kata sandi salah.");
  await expect(page).toHaveURL(/\/login/);
});

test("admin can sign in and out", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Ringkasan" })).toBeVisible();
  await page.goto("/dashboard");
  await page.locator("summary").filter({ hasText: "@fincorp.id" }).first().click();
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL(/\/login/);
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/);
});
