import { expect, test } from "@playwright/test";
import { dbQuery, expectToast, login } from "./helpers";

test("closed period rejects posting and can be reopened", async ({ page }) => {
  await login(page);
  await page.goto("/accounting/closing?year=2026");
  const october = page.getByRole("row", { name: /Oktober 2026/ });
  await october.getByRole("button", { name: "Tutup" }).click();
  await page.locator("#close-note").fill("Tutup untuk E2E");
  await page.locator('button[form="close-period-form"]').click();
  await expect
    .poll(async () => {
      const rows = await dbQuery<{ status: string }>(
        'SELECT status FROM "FiscalPeriod" WHERE year = 2026 AND month = 10',
      );
      return rows[0]?.status;
    }, { timeout: 20_000 })
    .toBe("CLOSED");
  await page.reload();
  await expect(page.getByRole("row", { name: /Oktober 2026/ })).toContainText("Ditutup");

  await page.goto("/accounting/journal/new");
  await page.locator("#journal-description").waitFor();
  const rows = page.locator("tbody tr");
  await rows.nth(0).locator("select").selectOption({ label: "6110 · Beban Gaji & Upah" });
  await rows.nth(1).locator("select").selectOption({ label: "3200 · Saldo Awal" });
  await page.locator("#journal-date").fill("2026-10-15");
  await page.locator("#journal-description").fill("Posting setelah tutup buku");
  await page.locator("tbody tr:nth-child(1) td:nth-child(3) input:not([type=hidden])").fill("100000");
  await page.locator("tbody tr:nth-child(2) td:nth-child(4) input:not([type=hidden])").fill("100000");
  await page.locator('button[name="mode"][value="post"]').click();
  await expectToast(page, "sudah ditutup");

  await page.goto("/accounting/closing?year=2026");
  const octoberAgain = page.getByRole("row", { name: /Oktober 2026/ });
  await octoberAgain.getByRole("button", { name: "Buka kembali" }).click();
  await page.locator("#reopen-note").fill("Koreksi E2E");
  await page.locator('button[form="reopen-period-form"]').click();
  await expect
    .poll(async () => {
      const rows = await dbQuery<{ status: string }>(
        'SELECT status FROM "FiscalPeriod" WHERE year = 2026 AND month = 10',
      );
      return rows[0]?.status;
    }, { timeout: 20_000 })
    .toBe("OPEN");
  await page.reload();
  await expect(page.getByRole("row", { name: /Oktober 2026/ })).toContainText("Terbuka");
});

test("viewer cannot post and sees no create actions", async ({ page }) => {
  await login(page, { email: "viewer@fincorp.id", password: "Viewer#2026" });
  await page.goto("/sales");
  await expect(page.getByRole("link", { name: "Faktur baru" })).toHaveCount(0);
  await page.goto("/settings/team");
  await expect(page.getByText("Hanya admin yang dapat melihat")).toBeVisible();
  await page.goto("/accounting/journal");
  await expect(page.getByRole("link", { name: "Jurnal baru" })).toHaveCount(0);
});
