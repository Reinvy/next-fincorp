import { expect, test } from "@playwright/test";
import { dbQuery, expectToast, login, openDialog, selectByText } from "./helpers";

test("bank account, insufficient cash, transfer and reconciliation", async ({ page }) => {
  await login(page);
  await page.goto("/cash-bank");

  await page.getByRole("button", { name: "Rekening baru" }).click();
  await page.locator("#bank-name").fill("Bank E2E");
  await page.locator("#bank-bankName").fill("BCA");
  await page.locator("#bank-accountNumber").fill("777000111");
  await page.locator("#bank-openingDate").fill("2026-11-01");
  await page.locator('button[form="bank-account-form"]').click();
  await page.getByText("Bank E2E").first().waitFor({ timeout: 15_000 });

  const [bank] = await dbQuery<{ id: string }>(
    `SELECT id FROM "BankAccount" WHERE name = 'Bank E2E' ORDER BY "createdAt" DESC LIMIT 1`,
  );

  // Cash out without balance is rejected.
  await page.getByRole("button", { name: "Kas masuk/keluar" }).click();
  await selectByText(page, "#cash-bankAccountId", "Bank E2E");
  await page.locator("#cash-direction").selectOption("OUT");
  await page.locator("#cash-date").fill("2026-11-21");
  await page.locator('div[role="dialog"] input[inputmode="numeric"]').fill("1000000");
  await page.locator("#cash-category").fill("Operasional");
  await selectByText(page, "#cash-counterAccountId", "6180");
  await page.locator("#cash-description").fill("Uji saldo tidak cukup");
  await page.locator('button[form="cash-transaction-form"]').click();
  await expectToast(page, "negatif");
  await page.getByRole("button", { name: "Tutup dialog" }).click();
  await page.reload();
  await page.locator("#main-content").waitFor();
  await page.waitForTimeout(500);

  // Create two cash movements that will be reconciled.
  for (const movement of [
    { direction: "IN", amount: "1000000", date: "2026-11-20", counter: "4130", description: "Penerimaan E2E" },
    { direction: "OUT", amount: "150000", date: "2026-11-21", counter: "6180", description: "Biaya admin E2E" },
  ]) {
    await openDialog(page, "Kas masuk/keluar", "#cash-bankAccountId");
    await selectByText(page, "#cash-bankAccountId", "Bank E2E");
    await page.locator("#cash-direction").selectOption(movement.direction);
    await page.locator("#cash-date").fill(movement.date);
    await page.locator('div[role="dialog"] input[inputmode="numeric"]').fill(movement.amount);
    await page.locator("#cash-category").fill("Operasional");
    await selectByText(page, "#cash-counterAccountId", movement.counter);
    await page.locator("#cash-description").fill(movement.description);
    await page.locator('button[form="cash-transaction-form"]').click();
    await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
    await page.reload();
    await page.locator("#main-content").waitFor();
    await page.waitForTimeout(400);
  }

  await page.goto(`/cash-bank/reconciliation?account=${bank.id}&from=2026-11-01&to=2026-11-30`);
  await page.locator("#statement-csv").fill(
    "date,description,reference,amount\n2026-11-20,Penerimaan E2E,R1,1000000\n2026-11-21,Biaya admin E2E,R2,-150000",
  );
  await page.getByRole("button", { name: "Impor", exact: true }).click();
  await page.getByText("Penerimaan E2E").first().waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Cocokkan otomatis" }).click();
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByText("Selesai").first()).toBeVisible();
  await expect(page.getByText("Rp 0").first()).toBeVisible();

  // Transfer from BCA enriches the new account.
  await page.goto("/cash-bank");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
  await openDialog(page, "Transfer", "#transfer-from");
  await selectByText(page, "#transfer-from", "Bank BCA");
  await selectByText(page, "#transfer-to", "Bank E2E");
  await page.locator("#transfer-date").fill("2026-11-22");
  await page.locator('div[role="dialog"] input[inputmode="numeric"]').fill("5000000");
  await page.locator("#transfer-description").fill("Pindah dana E2E");
  await page.locator('button[form="transfer-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });

  const [balance] = await dbQuery<{ balance: string }>(
    `SELECT COALESCE(SUM(jl.debit - jl.credit), 0)::text AS balance
     FROM "BankAccount" b
     JOIN "JournalLine" jl ON jl."accountId" = b."coaAccountId"
     JOIN "JournalEntry" je ON je.id = jl."journalEntryId" AND je.status = 'POSTED'
     WHERE b.id = $1`,
    [bank.id],
  );
  expect(Number(balance.balance)).toBe(5850000);
});
