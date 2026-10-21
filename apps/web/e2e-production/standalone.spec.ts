import { expect, test } from "@playwright/test";

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
  const websocketUrls: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("websocket", (socket) => {
    if (!new URL(socket.url()).pathname.startsWith("/ws/app/")) return;
    websocketUrls.push(socket.url());
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

  await page.getByText("Session details", { exact: true }).click();
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
      new URL(response.url()).pathname === "/settings" &&
      request.method() === "GET" &&
      request.headers().rsc === "1" &&
      response.headers()["content-type"]?.startsWith("text/x-component") === true
    );
  });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await rscNavigationPromise;
  await expect(page).toHaveURL(/\/settings$/);
  expect(
    await page.evaluate(() => document.documentElement.dataset.productionNavigationMarker),
  ).toBe("preserved");

  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Smoke User");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);

  expect(websocketUrls.length).toBeGreaterThanOrEqual(1);
  expect(websocketUrls.every((url) => new URL(url).pathname.startsWith("/ws/app/"))).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
