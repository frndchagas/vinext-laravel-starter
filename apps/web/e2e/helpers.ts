import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";

import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://localhost:18025";

interface MailpitMessageSummary {
  ID: string;
  To: Array<{ Address: string }>;
}

async function findMailLink(email: string, pattern: RegExp): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const listResponse = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=20`);
    const list = (await listResponse.json()) as { messages: MailpitMessageSummary[] };
    const message = list.messages.find((candidate) =>
      candidate.To.some((recipient) => recipient.Address === email),
    );

    if (message) {
      const messageResponse = await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`);
      const body = (await messageResponse.json()) as { Text: string };
      const match = body.Text.match(pattern);

      if (match) {
        return match[0].replace(/[)\].,]+$/, "");
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`No matching email link arrived for ${email}`);
}

export function findVerificationLink(email: string): Promise<string> {
  return findMailLink(email, /https?:\/\/\S+\/api\/v1\/auth\/email\/verify\/\S+/);
}

export function findPasswordResetLink(email: string): Promise<string> {
  return findMailLink(email, /https?:\/\/\S+\/reset-password\?\S+/);
}

export async function registerVerifiedUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email$/, { timeout: 20_000 });

  const verificationLink = await findVerificationLink(email);
  await page.goto(verificationLink);
  await expect(page).toHaveURL(/\/dashboard\?verified=1$/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible({ timeout: 20_000 });
}

export function grantAdmin(email: string): void {
  execFileSync("php", ["artisan", "app:grant-admin", email], {
    cwd: fileURLToPath(new URL("../../api/", import.meta.url)),
    stdio: "pipe",
  });
}

export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const summary = results.violations.map((violation) => ({
    help: violation.help,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => ({
      details: node.any.map((check) => check.message),
      target: node.target,
    })),
    rule: violation.id,
  }));

  expect(summary, "Expected no WCAG A or AA violations").toEqual([]);
}

export function generateTotp(secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = secret.toUpperCase().replaceAll("=", "").replaceAll(/\s/g, "");
  let bits = "";

  for (const character of normalized) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error("Invalid base32 secret.");
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2);
  }

  const counter = Math.floor(now / 30_000);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", bytes).update(counterBuffer).digest();
  const offset = hash.at(-1)! & 0x0f;
  const code = (hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;

  return code.toString().padStart(6, "0");
}
