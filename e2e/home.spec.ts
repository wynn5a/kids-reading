import { test, expect } from "@playwright/test";

test("home starts empty, reading a lesson updates progress + streak", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/读完 0 \//)).toBeVisible();
  await expect(page.getByText("继续阅读")).toBeVisible();

  // open the next-up lesson via its grid/continue link, then finish it
  await page.locator('a[href="/lesson/1"]').first().click();
  await expect(page).toHaveURL(/\/lesson\/1$/);
  await page.getByRole("button", { name: "读完了" }).click();

  // back home: completion advanced, today counted toward the streak
  await page.goto("/");
  await expect(page.getByText(/读完 1 \//)).toBeVisible();
  await expect(page.getByText("连续 1 天")).toBeVisible();
  // lesson 2 is now an unlocked link (appears in both ContinueCard and LessonGrid)
  await expect(page.locator('a[href="/lesson/2"]').first()).toBeVisible();
});

test("progress persists across a reload", async ({ page }) => {
  await page.goto("/lesson/1");
  await page.getByRole("button", { name: "读完了" }).click();
  await page.goto("/");
  await expect(page.getByText(/读完 1 \//)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/读完 1 \//)).toBeVisible();
});
