import { expect, test } from "@playwright/test";
import { dbQuery, expectToast, login, selectByText } from "./helpers";

test("asset acquisition, depreciation and disposal", async ({ page }) => {
  await login(page);
  await page.goto("/fixed-assets/new");
  await page.locator("#asset-name").fill("Server E2E");
  await page.locator("#asset-category").fill("Peralatan");
  await page.locator("#asset-purchaseDate").fill("2026-11-01");
  const money = page.locator('input[inputmode="numeric"]');
  await money.nth(0).fill("12000000");
  await page.locator("#asset-life").fill("12");
  await selectByText(page, "#asset-funding", "Bank BCA");
  await page.getByRole("button", { name: /Simpan aset/i }).click();
  await page.waitForURL((url) => /\/fixed-assets\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  const assetId = page.url().split("/").pop()!;

  await page.goto("/fixed-assets");
  await page.getByRole("button", { name: "Jalankan penyusutan" }).click();
  await page.locator("#depreciation-period").fill("2026-11");
  await page.locator('button[form="depreciation-form"]').click();
  await page.locator('div[role="dialog"]').waitFor({ state: "hidden", timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("2026-11").first()).toBeVisible();

  await page.getByRole("button", { name: "Jalankan penyusutan" }).click();
  await page.locator("#depreciation-period").fill("2026-11");
  await page.locator('button[form="depreciation-form"]').click();
  await expectToast(page, "sudah dijalankan");
  await page.getByRole("button", { name: "Tutup dialog" }).click();

  const [depreciated] = await dbQuery<{ accumulated: string }>(
    'SELECT "accumulatedDepreciation"::text AS accumulated FROM "FixedAsset" WHERE id = $1',
    [assetId],
  );
  expect(Number(depreciated.accumulated)).toBe(1000000);

  await page.goto(`/fixed-assets/${assetId}`);
  await page.getByRole("button", { name: "Lepas aset" }).click();
  await page.locator('div[role="dialog"] input[inputmode="numeric"]').fill("500000");
  await selectByText(page, "#disposal-bank", "Bank BCA");
  await page.locator('button[form="disposal-form"]').click();
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.getByText("Dilepas").first()).toBeVisible();

  const [asset] = await dbQuery<{ status: string; proceeds: string }>(
    'SELECT status, "disposalProceeds"::text AS proceeds FROM "FixedAsset" WHERE id = $1',
    [assetId],
  );
  expect(asset.status).toBe("DISPOSED");
  expect(Number(asset.proceeds)).toBe(500000);
});
