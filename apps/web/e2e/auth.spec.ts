import { expect, test } from "@playwright/test";

import {
  expectNoAccessibilityViolations,
  findPasswordResetLink,
  findVerificationLink,
  generateTotp,
  grantAdmin,
  registerVerifiedUser,
} from "./helpers";

test("hide registration when the deployment disables it", async ({ page }) => {
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ registration: false }),
    });
  });

  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Create account" })).toHaveCount(0);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Registration unavailable" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("register, verify email, use the private channel, sign out and sign in again", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const uniqueEmail = `e2e-${Date.now()}@example.com`;
  const password = "e2e-secret-password";

  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/verify-email$/, { timeout: 20_000 });
  await expect(page.getByText(uniqueEmail)).toBeVisible();

  const verificationLink = await findVerificationLink(uniqueEmail);
  await page.goto(verificationLink);

  await expect(page).toHaveURL(/\/dashboard\?verified=1$/, { timeout: 20_000 });
  await expect(page.getByText("Email verified")).toBeVisible();
  await expect(page.getByText("member")).toBeVisible();
  await expect(page.getByText(/Subscribed to users\./)).toBeVisible({ timeout: 15_000 });
  await expectNoAccessibilityViolations(page);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByText(/Subscribed to users\./)).toBeVisible({ timeout: 15_000 });
});

test("rejects invalid credentials with a stable field error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toContainText(/credentials/i);
  await expect(page).toHaveURL(/\/login$/);
});

test("reset a password through the link delivered by email", async ({ page }) => {
  test.setTimeout(120_000);

  const uniqueEmail = `e2e-reset-${Date.now()}@example.com`;
  const originalPassword = "original-e2e-password";
  const newPassword = "new-e2e-password";

  await page.goto("/register");
  await page.getByLabel("Name").fill("Password Reset User");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password", { exact: true }).fill(originalPassword);
  await page.getByLabel("Confirm password").fill(originalPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email$/, { timeout: 20_000 });

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/reset link is on its way/i)).toBeVisible();

  const resetLink = await findPasswordResetLink(uniqueEmail);
  await page.goto(resetLink);
  await expect(page.getByLabel("Email")).toHaveValue(uniqueEmail);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });

  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/verify-email$/, { timeout: 20_000 });
});

test("update account settings and complete the two-factor recovery flow", async ({ page }) => {
  test.setTimeout(120_000);

  const uniqueEmail = `e2e-settings-${Date.now()}@example.com`;
  const updatedEmail = `updated-${uniqueEmail}`;
  const originalPassword = "settings-original-password";
  const newPassword = "settings-updated-password";

  await registerVerifiedUser(page, uniqueEmail, originalPassword);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings$/);

  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();
  await expectNoAccessibilityViolations(page);
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();
  await page.waitForTimeout(200);
  await expectNoAccessibilityViolations(page);

  const profileSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Profile" }),
  });
  await profileSection.getByLabel("Name").fill("Updated E2E User");
  await profileSection.getByRole("button", { name: "Save profile" }).click();
  await expect(profileSection.getByText("Profile updated.")).toBeVisible();
  await expect(profileSection.getByRole("button", { name: "Save profile" })).toBeEnabled();
  await expect(page.locator("header").getByText("Updated E2E User", { exact: true })).toBeVisible();

  await profileSection.getByLabel("Email").fill(updatedEmail);
  await profileSection.getByLabel("Current password").fill("wrong-password");
  await profileSection.getByRole("button", { name: "Save profile" }).click();
  await expect(profileSection.getByText(/does not match/i)).toBeVisible();

  await profileSection.getByLabel("Current password").fill(originalPassword);
  await profileSection.getByRole("button", { name: "Save profile" }).click();
  await expect(page).toHaveURL(/\/verify-email$/, { timeout: 20_000 });

  const updatedVerificationLink = await findVerificationLink(updatedEmail);
  await page.goto(updatedVerificationLink);
  await expect(page).toHaveURL(/\/dashboard\?verified=1$/, { timeout: 20_000 });
  await page.getByRole("link", { name: "Settings" }).click();

  const passwordSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Password" }),
  });
  await passwordSection.getByLabel("Current password").fill(originalPassword);
  await passwordSection.getByLabel("New password", { exact: true }).fill(newPassword);
  await passwordSection.getByLabel("Confirm new password").fill(newPassword);
  await passwordSection.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/login\?password_updated=1$/);
  await expect(page.getByText("Password updated. Sign in again.")).toBeVisible();
  await page.getByLabel("Email").fill(updatedEmail);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Settings" }).click();

  const twoFactorSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Two-factor authentication" }),
  });
  await twoFactorSection.getByLabel("Current password").fill(newPassword);
  await twoFactorSection.getByRole("button", { name: "Enable two-factor authentication" }).click();

  const secretElement = twoFactorSection.getByTestId("two-factor-secret");
  await expect(secretElement).toHaveText(/^[A-Z2-7]{16,}$/);
  const secret = await secretElement.innerText();
  await twoFactorSection.getByLabel("Authentication code").fill(generateTotp(secret));
  await twoFactorSection.getByRole("button", { name: "Confirm setup" }).click();

  await expect(twoFactorSection.getByText("Active", { exact: true })).toBeVisible();
  await expect(twoFactorSection.getByRole("heading", { name: "Recovery codes" })).toBeVisible();
  const recoveryCode = await twoFactorSection.locator("li").first().textContent();
  expect(recoveryCode).toBeTruthy();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(updatedEmail);
  await page.getByLabel("Password").fill(newPassword);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/two-factor-challenge$/);
  await page.getByRole("button", { name: "Use a recovery code" }).click();
  await page.getByLabel("Recovery code").fill(recoveryCode!);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });

  await page.getByRole("link", { name: "Settings" }).click();
  const activeTwoFactorSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Two-factor authentication" }),
  });
  await activeTwoFactorSection
    .getByRole("button", { name: "Disable two-factor authentication" })
    .click();

  const disableDialog = page.getByRole("alertdialog");
  await disableDialog.getByLabel("Current password").fill(newPassword);
  await disableDialog.getByRole("button", { name: "Disable two-factor authentication" }).click();
  await expect(activeTwoFactorSection.getByText("Disabled", { exact: true })).toBeVisible();
});

test("permanently delete the current account", async ({ page }) => {
  const uniqueEmail = `e2e-delete-${Date.now()}@example.com`;
  const password = "delete-account-password";

  await registerVerifiedUser(page, uniqueEmail, password);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete account" }).click();

  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Current password").fill("wrong-password");
  await dialog.getByRole("button", { name: "Delete account" }).click();
  await expect(dialog.getByText("The password is incorrect.")).toBeVisible();

  await dialog.getByLabel("Current password").fill(password);
  await dialog.getByRole("button", { name: "Delete account" }).click();
  await expect(page).toHaveURL(/\/login\?account_deleted=1$/);
  await expect(page.getByText("Account deleted.")).toBeVisible();

  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText(/credentials/i);
});

test("manage users through the permission-gated administration surface", async ({ page }) => {
  test.setTimeout(120_000);

  const suffix = Date.now();
  const targetEmail = `e2e-managed-${suffix}@example.com`;
  const adminEmail = `e2e-admin-${suffix}@example.com`;
  const password = "admin-e2e-password";

  await registerVerifiedUser(page, targetEmail, password);
  await page.getByRole("button", { name: "Sign out" }).click();
  await registerVerifiedUser(page, adminEmail, password);

  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  grantAdmin(adminEmail);
  await page.reload();
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  await page.getByRole("link", { name: "Users" }).click();

  await page.getByLabel("Search users").fill(targetEmail);
  await page.getByRole("button", { name: "Search" }).click();
  const targetRow = page.getByRole("row", { name: new RegExp(targetEmail) });
  await expect(targetRow).toBeVisible();
  await targetRow.getByLabel(/Role for/).selectOption("admin");
  await expect(page.getByText(/is now admin/)).toBeVisible();
  await expect(targetRow.getByLabel(/Role for/)).toHaveValue("admin");

  await page.getByLabel("Search users").fill(adminEmail);
  await page.getByRole("button", { name: "Search" }).click();
  const ownRow = page.getByRole("row", { name: new RegExp(adminEmail) });
  await expect(ownRow.getByText("Current account")).toBeVisible();
  await expect(ownRow.getByLabel(/Role for/)).toBeDisabled();
});
