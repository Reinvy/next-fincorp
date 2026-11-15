import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("CSV exports carry a BOM and unknown reports return 404", async ({ page }) => {
  await login(page);
  const response = await page.request.get("/api/export/balance-sheet");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["content-disposition"]).toContain("attachment");
  const body = await response.body();
  expect([body[0], body[1], body[2]]).toEqual([0xef, 0xbb, 0xbf]);
  const text = body.toString("utf8");
  expect(text).toContain("TOTAL ASET");

  const backup = await page.request.get("/api/export/backup");
  expect(backup.status()).toBe(200);
  expect(backup.headers()["content-type"]).toContain("application/json");
  const json = await backup.json();
  expect(json).toHaveProperty("company");
  expect(JSON.stringify(json).toLowerCase()).not.toContain("password");

  const unknown = await page.request.get("/api/export/tidak-ada");
  expect(unknown.status()).toBe(404);
});
