import { test, expect } from "@playwright/test";

test("lesson 1 shows pinyin above characters", async ({ page }) => {
  await page.goto("/lesson/1");
  // ruby <rt> elements carry the pinyin
  await expect(page.locator("rt").first()).toBeVisible();
  expect(await page.locator("rt").count()).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "读完了" })).toBeVisible();
});

test("finishing shows the summary card, then advances to lesson 2", async ({ page }) => {
  await page.goto("/lesson/1");
  await page.getByRole("button", { name: "读完了" }).click();

  const dialog = page.getByRole("dialog", { name: "本课小结" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/读完 \d+ \/ \d+/)).toBeVisible();

  await dialog.getByRole("button", { name: "下一课" }).click();
  await expect(page).toHaveURL(/\/lesson\/2$/);
});

test("a locked lesson redirects home", async ({ page }) => {
  await page.goto("/lesson/3"); // id-2 not read in a fresh context
  await expect(page).toHaveURL("/");
});

test("an invalid lesson id 404s", async ({ page }) => {
  const res = await page.goto("/lesson/99999");
  expect(res?.status()).toBe(404);
});
