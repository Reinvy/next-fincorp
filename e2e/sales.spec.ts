import { expect, test } from "@playwright/test";
import { dbQuery, expectToast, login, selectByText } from "./helpers";

test("sales invoice posts, pays partially, returns and settles", async ({ page }) => {
  await login(page);

  // Customer
  await page.goto("/sales/customers");
  await page.getByRole("button", { name: "Tambah pelanggan" }).click();
  await page.locator("#customer-name").fill("PT E2E Pelanggan");
  await page.locator("#customer-npwp").fill("09.111.222.3-444.000");
  await page.locator('button[form="customer-form"]').click();
  await expect(page.getByText("PT E2E Pelanggan").first()).toBeVisible();

  // Invoice with two lines, 5% discount on the first and PPN 11%.
  await page.goto("/sales/new");
  await page.locator("#invoice-customer").waitFor();
  await selectByText(page, "#invoice-customer", "PT E2E Pelanggan");
  await selectByText(page, "#invoice-revenue", "4110");
  await page.locator("tbody tr:nth-child(1) td:nth-child(1) input").fill("Konsultasi implementasi");
  await page.locator("tbody tr:nth-child(1) td:nth-child(2) input").fill("1");
  await page.locator("tbody tr:nth-child(1) td:nth-child(3) input:not([type=hidden])").fill("10000000");
  await page.locator("tbody tr:nth-child(1) td:nth-child(4) input").fill("5");
  await page.getByRole("button", { name: "Baris", exact: true }).click();
  await page.locator("tbody tr:nth-child(2) td:nth-child(1) input").fill("Lisensi tahunan");
  await page.locator("tbody tr:nth-child(2) td:nth-child(2) input").fill("2");
  await page.locator("tbody tr:nth-child(2) td:nth-child(3) input:not([type=hidden])").fill("1000000");
  await expect(page.getByText("Rp 12.765.000").first()).toBeVisible();
  await page.locator('button[name="mode"][value="post"]').click();
  await page.waitForURL((url) => /\/sales\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  const invoiceId = page.url().split("/").pop()!;
  await expect(page.getByText("Belum Dibayar").first()).toBeVisible();

  const journal = await dbQuery<{ code: string; debit: string; credit: string }>(
    `SELECT g.code, jl.debit::text, jl.credit::text
     FROM "JournalEntry" je
     JOIN "JournalLine" jl ON jl."journalEntryId" = je.id
     JOIN "GlAccount" g ON g.id = jl."accountId"
     WHERE je."sourceType" = 'SALES_INVOICE' AND je."sourceId" = $1
     ORDER BY jl."sortOrder"`,
    [invoiceId],
  );
  expect(journal).toEqual([
    { code: "1130", debit: "12765000.00", credit: "0.00" },
    { code: "4110", debit: "0.00", credit: "11500000.00" },
    { code: "2120", debit: "0.00", credit: "1265000.00" },
  ]);

  // Partial payment
  await page.getByRole("button", { name: "Catat pembayaran" }).click();
  await page.locator('div[role="dialog"] input[inputmode="numeric"]').fill("5000000");
  await selectByText(page, "#sales-payment-bank", "Bank BCA");
  await page.locator('button[form="sales-payment-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Dibayar Sebagian").first()).toBeVisible();
  await expect(page.getByText("Rp 7.765.000").first()).toBeVisible();

  // Credit note within outstanding
  await page.getByRole("button", { name: "Nota kredit" }).click();
  await page.locator("#credit-note-reason").fill("Pengurangan lingkup");
  await page.locator('#sales-credit-note-form tbody tr:nth-child(1) input').fill("0.1");
  await page.locator('button[form="sales-credit-note-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Rp 1.054.500").first()).toBeVisible();
  await expect(page.getByText("Rp 6.710.500").first()).toBeVisible();

  // Credit above outstanding is rejected
  await page.getByRole("button", { name: "Nota kredit" }).click();
  await page.locator("#credit-note-reason").fill("Retur berlebih");
  await page.locator('#sales-credit-note-form tbody tr:nth-child(1) input').fill("0.9");
  await page.locator('button[form="sales-credit-note-form"]').click();
  await expectToast(page, "melebihi sisa tagihan");
  await page.getByRole("button", { name: "Tutup dialog" }).click();

  // Final payment
  await page.getByRole("button", { name: "Catat pembayaran" }).click();
  await page.locator('div[role="dialog"] input[inputmode="numeric"]').fill("6710500");
  await selectByText(page, "#sales-payment-bank", "Bank BCA");
  await page.locator('button[form="sales-payment-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Lunas").first()).toBeVisible();

  const [invoice] = await dbQuery<{ status: string; paidAmount: string; creditedAmount: string }>(
    'SELECT status, "paidAmount"::text, "creditedAmount"::text FROM "SalesInvoice" WHERE id = $1',
    [invoiceId],
  );
  expect(invoice.status).toBe("PAID");
  expect(invoice.creditedAmount).toBe("1054500.00");
});

test("overdue invoice shows a stamp", async ({ page }) => {
  await login(page);
  await page.goto("/sales");
  await page.locator('a[href^="/sales/"]').filter({ hasText: "INV/2026/0016" }).click();
  await expect(page.getByText("Jatuh Tempo").first()).toBeVisible();
});
