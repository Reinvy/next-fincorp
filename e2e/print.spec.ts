import { expect, test } from "@playwright/test";
import { dbQuery, login } from "./helpers";

test("invoice and balance sheet print without the app shell", async ({ page }) => {
  await login(page);
  const [invoice] = await dbQuery<{ id: string }>("SELECT id FROM \"SalesInvoice\" WHERE number = 'INV/2026/0001'");
  await page.goto(`/sales/${invoice.id}`);
  await expect(page.getByText("Ditagihkan kepada")).toBeVisible();
  await expect(page.locator(".print-sheet").getByText("Rp 49.950.000").first()).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".app-sidebar")).toBeHidden();
  await expect(page.locator(".app-header")).toBeHidden();
  await expect(page.locator("main header").first()).toBeHidden();
  await expect(page.locator(".print-sheet").getByText("PT FinCorp Nusantara").first()).toBeVisible();
  await expect(page.getByText("Dibuat oleh")).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  await page.goto("/reports/balance-sheet");
  await expect(page.locator(".print-sheet").getByText(/total aset/i).first()).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".app-sidebar")).toBeHidden();
  await expect(page.locator(".print-sheet").getByText(/total aset/i).first()).toBeVisible();
  await expect(page.locator(".print-sheet").getByText(/total liabilitas \+ ekuitas/i).first()).toBeVisible();
  await page.emulateMedia({ media: "screen" });
});
