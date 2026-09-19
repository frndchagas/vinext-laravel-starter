import { expect, test } from "@playwright/test";

import { registerVerifiedUser } from "./helpers";

test("queue a task and watch it complete live on the private channel", async ({ page }) => {
  test.setTimeout(120_000);

  await registerVerifiedUser(page, `e2e-task-${Date.now()}@example.com`, "e2e-secret-password");

  await page.goto("/tasks");
  await page.getByLabel("New task input").fill("hello brave new world");
  await page.getByRole("button", { name: "Queue task" }).click();

  const card = page.locator("article", { hasText: "hello brave new world" });
  await expect(card).toBeVisible({ timeout: 10_000 });

  await expect(card.getByText("completed")).toBeVisible({ timeout: 30_000 });
  await expect(card.getByText(/4 words/)).toBeVisible();
  await expect(card.getByText(/dlrow wen evarb olleh/)).toBeVisible();

  await page.reload();
  await expect(
    page.locator("article", { hasText: "hello brave new world" }).getByText("completed"),
  ).toBeVisible({
    timeout: 10_000,
  });
});

test("repeated submissions with distinct keys create distinct tasks", async ({ page }) => {
  test.setTimeout(120_000);

  await registerVerifiedUser(page, `e2e-task-${Date.now()}-b@example.com`, "e2e-secret-password");

  await page.goto("/tasks");

  for (let index = 0; index < 2; index += 1) {
    await page.getByLabel("New task input").fill(`double submit ${index}`);
    await page.getByRole("button", { name: "Queue task" }).click();
    await expect(page.locator("article", { hasText: `double submit ${index}` })).toBeVisible({
      timeout: 10_000,
    });
  }

  await expect(page.locator("article")).toHaveCount(2);
});

test("recover the persisted task state after the realtime connection returns", async ({
  context,
  page,
}) => {
  test.setTimeout(120_000);

  await registerVerifiedUser(
    page,
    `e2e-reconnect-${Date.now()}@example.com`,
    "e2e-secret-password",
  );

  await page.goto("/tasks");
  await page.getByLabel("New task input").fill("finish while disconnected");
  await page.getByRole("button", { name: "Queue task" }).click();

  const card = page.locator("article", { hasText: "finish while disconnected" });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await context.setOffline(true);
  await page.waitForTimeout(2_500);
  await context.setOffline(false);

  await expect(card.getByText("completed")).toBeVisible({ timeout: 45_000 });
  await expect(card.getByText(/3 words/)).toBeVisible();
});

test("complete a task when WebSocket delivery is unavailable", async ({ page }) => {
  await page.routeWebSocket("**/ws/**", (socket) => socket.close());
  await registerVerifiedUser(
    page,
    `e2e-no-socket-${Date.now()}@example.com`,
    "e2e-secret-password",
  );
  await page.getByRole("link", { name: "Tasks", exact: true }).click();
  await page.getByLabel("New task input").fill("persisted state wins");
  await page.getByRole("button", { name: "Queue task" }).click();
  const card = page.locator("article", { hasText: "persisted state wins" });
  await expect(card.getByText("completed")).toBeVisible({ timeout: 30_000 });
  await expect(card.getByText(/3 words/)).toBeVisible();
});

test("switch accounts without rendering the previous User's cached Tasks", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const suffix = Date.now();
  const password = "e2e-secret-password";
  const nextEmail = `e2e-cache-b-${suffix}@example.com`;
  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    await registerVerifiedUser(otherPage, nextEmail, password);
  } finally {
    await otherContext.close();
  }

  await registerVerifiedUser(page, `e2e-cache-a-${suffix}@example.com`, password);
  await page.getByRole("link", { name: "Tasks", exact: true }).click();
  const privateInput = `private task from first user ${suffix}`;
  await page.getByLabel("New task input").fill(privateInput);
  await page.getByRole("button", { name: "Queue task" }).click();
  await expect(
    page.locator("article", { hasText: privateInput }).getByText("completed"),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(nextEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  let release!: () => void;
  const delayedResponse = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/tasks", async (route) => {
    await delayedResponse;
    await route.continue();
  });
  try {
    await page.getByRole("link", { name: "Tasks", exact: true }).click();
    await expect(page.getByText("Loading tasks…")).toBeVisible();
    await expect(page.getByText(privateInput, { exact: true })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByText(/No tasks yet/)).toBeVisible();
});
