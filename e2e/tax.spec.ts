import { expect, test } from "@playwright/test";
import { login, selectByText } from "./helpers";

test("VAT settlement and e-Faktur status update", async ({ page }) => {
  await login(page);
  await page.goto("/tax?period=2026-10");
  await expect(page.getByText("PPN Keluaran").first()).toBeVisible();
  await page.getByRole("button", { name: "Selesaikan PPN" }).click();
  await selectByText(page, "#settle-bank", "Bank BCA");
  await page.locator('button[form="settle-ppn-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Selesai").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Selesaikan PPN" })).toHaveCount(0);

  await page.goto("/tax/efaktur?period=2026-10");
  await expect(page.getByText("e-Faktur").first()).toBeVisible();
  await page.getByRole("button", { name: "Status faktur pajak" }).first().click();
  await page.locator("#tax-status").selectOption("SUBMITTED");
  await page.locator("#tax-number").fill("010.000-26.00000999");
  await page.locator('button[form="tax-invoice-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
  await page.reload();
  await expect(page.locator("td").getByText("Dilaporkan").first()).toBeVisible();
});
