import { expect, test } from "@playwright/test";

type TaskEvent = {
  channel: string;
  id: string;
  state: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseObject(value: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

test("exercise the standalone Node, Caddy and Reverb topology", async ({ browser, page }) => {
  const baseURL = process.env.E2E_BASE_URL;
  const email = process.env.E2E_PRODUCTION_EMAIL;
  const password = process.env.E2E_PRODUCTION_PASSWORD;

  if (!baseURL || !email || !password) {
    throw new Error("E2E_BASE_URL, E2E_PRODUCTION_EMAIL and E2E_PRODUCTION_PASSWORD must be set.");
  }

  const noJavaScriptContext = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const noJavaScriptPage = await noJavaScriptContext.newPage();
  await noJavaScriptPage.goto("/login");
  await expect(noJavaScriptPage.getByRole("button", { name: "Sign in" })).toBeDisabled();
  await noJavaScriptContext.close();

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const taskEvents: TaskEvent[] = [];
  const websocketUrls: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("websocket", (socket) => {
    if (!new URL(socket.url()).pathname.startsWith("/ws/app/")) return;
    websocketUrls.push(socket.url());
    socket.on("framereceived", ({ payload }) => {
      const message = parseObject(String(payload));
      if (message?.event !== "TaskStatusChanged" || typeof message.channel !== "string") return;
      const data =
        typeof message.data === "string"
          ? parseObject(message.data)
          : isObject(message.data)
            ? message.data
            : undefined;
      if (typeof data?.id === "string" && typeof data.state === "string") {
        taskEvents.push({ channel: message.channel, id: data.id, state: data.state });
      }
    });
  });

  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const websocketPromise = page.waitForEvent("websocket", (socket) => {
    return new URL(socket.url()).pathname.startsWith("/ws/app/");
  });
  const userAuthorizationPromise = page.waitForResponse((response) => {
    if (new URL(response.url()).pathname !== "/api/broadcasting/auth") return false;
    const channel = new URLSearchParams(response.request().postData() ?? "").get("channel_name");
    return channel?.startsWith("private-users.") ?? false;
  });

  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const websocket = await websocketPromise;
  expect(new URL(websocket.url()).pathname).toMatch(/^\/ws\/app\//);

  const subscription = page.getByText(/Subscribed to users\./);
  await expect(subscription).toBeVisible({ timeout: 20_000 });
  const userId = (await subscription.innerText()).match(/users\.([0-9a-f-]+)/)?.[1];
  expect(userId).toBeTruthy();

  const userAuthorization = await userAuthorizationPromise;
  expect(userAuthorization.status()).toBe(200);
  expect(
    new URLSearchParams(userAuthorization.request().postData() ?? "").get("channel_name"),
  ).toBe(`private-users.${userId}`);

  await page.evaluate(() => {
    document.documentElement.dataset.productionNavigationMarker = "preserved";
  });
  const rscNavigationPromise = page.waitForResponse((response) => {
    const request = response.request();
    return (
      new URL(response.url()).pathname === "/tasks" &&
      request.method() === "GET" &&
      request.headers().rsc === "1" &&
      response.headers()["content-type"]?.startsWith("text/x-component") === true
    );
  });
  await page.getByRole("link", { name: "Tasks" }).click();
  await rscNavigationPromise;
  await expect(page).toHaveURL(/\/tasks$/);
  expect(
    await page.evaluate(() => document.documentElement.dataset.productionNavigationMarker),
  ).toBe("preserved");

  const taskAuthorizationPromise = page.waitForResponse((response) => {
    if (new URL(response.url()).pathname !== "/api/broadcasting/auth") return false;
    const channel = new URLSearchParams(response.request().postData() ?? "").get("channel_name");
    return channel?.startsWith("private-tasks.") ?? false;
  });
  const taskCreationPromise = page.waitForResponse((response) => {
    const request = response.request();
    return new URL(response.url()).pathname === "/api/v1/tasks" && request.method() === "POST";
  });

  const input = "standalone production browser smoke";
  await page.getByLabel("New task input").fill(input);
  await page.getByRole("button", { name: "Queue task" }).click();
  const taskCreation = await taskCreationPromise;
  expect(taskCreation.status()).toBe(202);
  const task: unknown = await taskCreation.json();
  if (!isObject(task) || typeof task.id !== "string") {
    throw new Error("Task creation returned an invalid body.");
  }
  expect(task.id).toMatch(/^[0-9a-f-]{36}$/);

  const taskAuthorization = await taskAuthorizationPromise;
  expect(taskAuthorization.status()).toBe(200);
  expect(
    new URLSearchParams(taskAuthorization.request().postData() ?? "").get("channel_name"),
  ).toBe(`private-tasks.${task.id}`);

  await expect
    .poll(() => taskEvents.find((event) => event.id === task.id && event.state === "completed"), {
      timeout: 30_000,
    })
    .toMatchObject({
      channel: `private-tasks.${task.id}`,
      id: task.id,
      state: "completed",
    });
  await expect(page.locator("article", { hasText: input }).getByText("completed")).toBeVisible();

  expect(websocketUrls.length).toBeGreaterThanOrEqual(1);
  expect(websocketUrls.every((url) => new URL(url).pathname.startsWith("/ws/app/"))).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
