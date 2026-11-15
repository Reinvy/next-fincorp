import { expect, test } from "@playwright/test";
import { dbQuery, login, selectByText } from "./helpers";

test("purchase posts withholding, pays and reverses", async ({ page }) => {
  await login(page);

  await page.goto("/purchases/vendors");
  await page.getByRole("button", { name: "Tambah vendor" }).click();
  await page.locator("#vendor-name").fill("PT E2E Vendor");
  await page.locator("#vendor-npwp").fill("09.777.888.9-555.000");
  await page.locator('button[form="vendor-form"]').click();
  await expect(page.getByText("PT E2E Vendor").first()).toBeVisible();

  await page.goto("/purchases/new");
  await page.locator("#purchase-vendor").waitFor();
  await selectByText(page, "#purchase-vendor", "PT E2E Vendor");
  await selectByText(page, "tbody tr:nth-child(1) select", "5000 ·");
  await page.locator("tbody tr:nth-child(1) td:nth-child(2) input").fill("Server uji");
  await page.locator("tbody tr:nth-child(1) td:nth-child(3) input").fill("1");
  await page.locator("tbody tr:nth-child(1) td:nth-child(4) input:not([type=hidden])").fill("10000000");
  await page.locator("#purchase-withholdingType").selectOption("PPH23");
  await page.locator('button[name="mode"][value="post"]').click();
  await page.waitForURL((url) => /\/purchases\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  const invoiceId = page.url().split("/").pop()!;

  const journal = await dbQuery<{ code: string; debit: string; credit: string }>(
    `SELECT g.code, jl.debit::text, jl.credit::text
     FROM "JournalEntry" je
     JOIN "JournalLine" jl ON jl."journalEntryId" = je.id
     JOIN "GlAccount" g ON g.id = jl."accountId"
     WHERE je."sourceType" = 'PURCHASE_INVOICE' AND je."sourceId" = $1
     ORDER BY jl."sortOrder"`,
    [invoiceId],
  );
  expect(journal.map((row) => row.code)).toEqual(["5000", "1140", "2110"]);

  await page.getByRole("button", { name: "Catat pembayaran" }).click();
  await selectByText(page, "#purchase-payment-bank", "Bank BCA");
  await page.locator('button[form="purchase-payment-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Lunas").first()).toBeVisible();

  const [payment] = await dbQuery<{ amount: string; withheld: string; bankAmount: string }>(
    'SELECT amount::text, "withheldAmount"::text AS withheld, "bankAmount"::text AS "bankAmount" FROM "PurchasePayment" WHERE "invoiceId" = $1 AND "voidedAt" IS NULL',
    [invoiceId],
  );
  expect(payment.amount).toBe("11100000.00");
  expect(payment.withheld).toBe("200000.00");
  expect(payment.bankAmount).toBe("10900000.00");

  const [liability] = await dbQuery<{ balance: string }>(
    `SELECT COALESCE(SUM(jl.credit - jl.debit), 0)::text AS balance
     FROM "JournalLine" jl JOIN "GlAccount" g ON g.id = jl."accountId"
     WHERE g.code = '2140' AND g."companyId" = (SELECT "companyId" FROM "PurchaseInvoice" WHERE id = $1)`,
    [invoiceId],
  );
  expect(Number(liability.balance)).toBeGreaterThanOrEqual(200000);

  // Void payment restores the payable.
  await page.locator("summary").filter({ hasText: "Batalkan pembayaran" }).click();
  await page.getByRole("button", { name: "Batalkan", exact: true }).first().click();
  await expect
    .poll(async () => {
      const rows = await dbQuery<{ status: string }>('SELECT status FROM "PurchaseInvoice" WHERE id = $1', [invoiceId]);
      return rows[0]?.status;
    }, { timeout: 20_000 })
    .toBe("UNPAID");
  await page.reload();
  await expect(page.getByText("Belum Dibayar").first()).toBeVisible();

  const [invoice] = await dbQuery<{ status: string; paid: string }>(
    'SELECT status, "paidAmount"::text AS paid FROM "PurchaseInvoice" WHERE id = $1',
    [invoiceId],
  );
  expect(invoice.status).toBe("UNPAID");
  expect(invoice.paid).toBe("0.00");
});

test("debit note reduces the payable and future withholding", async ({ page }) => {
  await login(page);
  await page.goto("/purchases");
  await page.locator('a[href^="/purchases/"]').filter({ hasText: "PUR/2026/0007" }).click();
  await page.getByRole("button", { name: "Nota debit" }).click();
  await page.locator("#debit-note-reason").fill("Spesifikasi tidak sesuai");
  await page.locator('#purchase-debit-note-form tbody tr:nth-child(1) input').fill("0.1");
  await page.locator('button[form="purchase-debit-note-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Dibayar Sebagian").first()).toBeVisible();
});
