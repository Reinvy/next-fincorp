import { expect, test } from "@playwright/test";
import { dbQuery, login } from "./helpers";

test("creating and switching a second company keeps data isolated", async ({ page }) => {
  await login(page);
  await page.goto("/companies");
  await page.getByRole("button", { name: "Perusahaan baru" }).click();
  await page.locator("#new-company-name").fill("PT E2E Cabang");
  await page.locator("#new-company-npwp").fill("09.333.444.5-666.000");
  await page.locator("#new-company-city").fill("Surabaya");
  await page.locator('button[form="additional-company-form"]').click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText("PT E2E CABANG").first()).toBeVisible();

  const [company] = await dbQuery<{ id: string; coa: string; invoices: string }>(
    `SELECT c.id,
       (SELECT COUNT(*)::text FROM "GlAccount" g WHERE g."companyId" = c.id) AS coa,
       (SELECT COUNT(*)::text FROM "SalesInvoice" s WHERE s."companyId" = c.id) AS invoices
     FROM "Company" c WHERE c.name = 'PT E2E Cabang'`,
  );
  expect(company.coa).toBe("55");
  expect(company.invoices).toBe("0");

  const [original] = await dbQuery<{ id: string }>("SELECT id FROM \"Company\" WHERE slug = 'pt-fincorp-nusantara'");
  await page.goto("/companies");
  const card = page.locator(".paper-sheet").filter({ hasText: "PT FinCorp Nusantara" }).last();
  await card.getByRole("button", { name: "Aktifkan" }).click();
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.find((cookie) => cookie.name === "fincorp_company")?.value;
    }, { timeout: 20_000 })
    .toBe(original.id);
  await page.goto("/sales");
  await expect(page.getByText("INV/2026/0018").first()).toBeVisible();
});
