import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("mobile happy path", () => {
  test.skip(
    !email || !password,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run mobile E2E tests.",
  );

  test("signs in and completes the core dashboard flow", async ({ page }) => {
    const taskTitle = `E2E task ${Date.now()}`;
    const routineTitle = `E2E routine ${Date.now()}`;

    await page.goto("/auth");
    await expect(
      page.getByRole("img", { name: "Wajib — واجب", exact: true }),
    ).toBeVisible();

    await page
      .getByLabel("Email")
      .first()
      .fill(email ?? "");
    await page
      .getByLabel("Password")
      .first()
      .fill(password ?? "");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("tab", { name: "Tasks" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Routines" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Wajib", exact: true }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Create task/i })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Create task" }),
    ).toBeVisible();
    await page.getByLabel("Title").fill(taskTitle);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    const taskCard = page
      .locator('[id^="item-"]')
      .filter({ hasText: taskTitle })
      .first();
    await taskCard.getByRole("button", { name: "Mark as complete" }).click();

    await page
      .getByRole("button", { name: /Create routine/i })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Create routine" }),
    ).toBeVisible();
    await page.getByLabel("Title").fill(routineTitle);
    await page.getByRole("button", { name: "Add routine" }).click();

    await page.getByRole("tab", { name: "Routines" }).click();
    await expect(page.getByText(routineTitle)).toBeVisible();

    await page.getByRole("tab", { name: "Insights", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Task insights" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Go to dashboard", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Today", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(page.getByText("Install app")).toBeVisible();

    await page.getByRole("combobox", { name: "Theme", exact: true }).click();
    await page.getByRole("option", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.locator('meta[name="theme-color"]').first(),
    ).toHaveAttribute("content", "#20271F");
    await page.getByRole("combobox", { name: "Theme", exact: true }).click();
    await page.getByRole("option", { name: "Light", exact: true }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(
      page.locator('meta[name="theme-color"]').first(),
    ).toHaveAttribute("content", "#F4ECDD");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
    const dock = await page.locator(".mobile-dashboard-dock").boundingBox();
    expect(dock).not.toBeNull();
    expect(Math.round(dock!.y + dock!.height)).toBe(
      page.viewportSize()!.height,
    );
  });
});
