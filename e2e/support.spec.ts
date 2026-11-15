import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("support ticket creation, reply and final close", async ({ page }) => {
  await login(page);
  await page.goto("/support");
  await expect(page.getByText("TKT/2026/0001")).toBeVisible();
  await page.getByRole("button", { name: "Buka tiket" }).click();
  await page.locator("#ticket-subject").fill("Tiket E2E");
  await page.locator("#ticket-description").fill("Deskripsi tiket E2E untuk memastikan alur status berjalan.");
  await page.locator('button[form="ticket-form"]').click();
  await page.waitForURL(/\/support\/[a-z0-9]+$/);
  await expect(page.getByText("TKT/2026/0002").first()).toBeVisible();

  await page.locator("#ticket-reply").fill("Balasan pertama pada tiket E2E.");
  await page.getByRole("button", { name: "Kirim balasan" }).click();
  await expect(page.getByText("Balasan pertama pada tiket E2E.")).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Balasan pertama pada tiket E2E.")).toBeVisible();

  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await expect(page.getByText("Tiket sudah final")).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.getByText("Tiket sudah final")).toBeVisible();
  await expect(page.locator("#ticket-reply")).toHaveCount(0);
});
