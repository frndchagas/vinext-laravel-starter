#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const PACKAGIST_UPDATE_URL = "https://packagist.org/api/update-package";
const PACKAGIST_P2_URL = "https://repo.packagist.org/p2/frndchagas/vinext-laravel-starter.json";
const PACKAGE_NAME = "frndchagas/vinext-laravel-starter";
const REPOSITORY_URL = "https://github.com/frndchagas/vinext-laravel-starter-distribution";
const PACKAGIST_USERNAME = "frndchagas";
const USER_AGENT =
  "vinext-laravel-starter-release/1.0 (+https://github.com/frndchagas/vinext-laravel-starter)";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_P2_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_POLL_TIMEOUT_MS = 20 * 60_000;

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function defaultTimeoutSignal(milliseconds) {
  return AbortSignal.timeout(milliseconds);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJson(response, description) {
  try {
    return await response.json();
  } catch {
    throw new Error(`${description} returned invalid JSON.`);
  }
}

function validateInputs(tag, reference, token) {
  if (!/^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(tag)) {
    throw new Error(`Expected a stable vMAJOR.MINOR.PATCH tag, received: ${tag || "(empty)"}.`);
  }

  if (!/^[0-9a-f]{40}$/.test(reference)) {
    throw new Error("Expected a full lowercase distribution commit SHA.");
  }

  if (typeof token !== "string" || token.length === 0) {
    throw new Error("PACKAGIST_SAFE_TOKEN is required.");
  }
}

export function parseUpdateResponse(status, payload) {
  if (status !== 202) {
    throw new Error(`Packagist rejected the update request with HTTP ${status}.`);
  }

  if (
    !isObject(payload) ||
    payload.status !== "success" ||
    !Array.isArray(payload.jobs) ||
    payload.jobs.length === 0 ||
    payload.jobs.some((job) => typeof job !== "string" || job.length === 0)
  ) {
    throw new Error("Packagist returned an invalid update response.");
  }

  return payload.jobs;
}

export function inspectP2(payload, { packageName = PACKAGE_NAME, tag, reference }) {
  const versions = isObject(payload?.packages) ? payload.packages[packageName] : undefined;

  if (!Array.isArray(versions)) {
    return { state: "pending" };
  }

  const version = versions.find((candidate) => isObject(candidate) && candidate.version === tag);

  if (version === undefined) {
    return { state: "pending" };
  }

  const actualReference = isObject(version.source) ? version.source.reference : undefined;

  if (actualReference !== reference) {
    return {
      state: "mismatch",
      actualReference: typeof actualReference === "string" ? actualReference : "(missing)",
    };
  }

  return { state: "published" };
}

export function pollDelay(millisecondsElapsed) {
  if (millisecondsElapsed < 60_000) return 5_000;
  if (millisecondsElapsed < 5 * 60_000) return 15_000;
  return 30_000;
}

export async function requestPackagistUpdate(
  {
    token,
    updateUrl = PACKAGIST_UPDATE_URL,
    repositoryUrl = REPOSITORY_URL,
    username = PACKAGIST_USERNAME,
    userAgent = USER_AGENT,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  },
  { fetchImpl = globalThis.fetch, createTimeoutSignal = defaultTimeoutSignal } = {},
) {
  let response;

  try {
    response = await fetchImpl(updateUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${username}:${token}`,
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify({ repository: repositoryUrl }),
      signal: createTimeoutSignal(requestTimeoutMs),
    });
  } catch {
    throw new Error("Packagist update request failed.");
  }

  const payload = await readJson(response, "Packagist update request");
  return parseUpdateResponse(response.status, payload);
}

export async function waitForPackagistVersion(
  {
    tag,
    reference,
    packageName = PACKAGE_NAME,
    p2Url = PACKAGIST_P2_URL,
    userAgent = USER_AGENT,
    requestTimeoutMs = DEFAULT_P2_REQUEST_TIMEOUT_MS,
    pollTimeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  },
  {
    fetchImpl = globalThis.fetch,
    sleep = defaultSleep,
    now = Date.now,
    createTimeoutSignal = defaultTimeoutSignal,
  } = {},
) {
  const startedAt = now();
  let attempt = 0;

  while (true) {
    const elapsed = now() - startedAt;

    if (elapsed >= pollTimeoutMs) {
      throw new Error(`Packagist did not publish ${tag} within ${pollTimeoutMs}ms.`);
    }

    const url = new URL(p2Url);
    url.searchParams.set("release-check", `${tag}-${attempt}-${now()}`);
    let response;

    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          "User-Agent": userAgent,
        },
        cache: "no-store",
        signal: createTimeoutSignal(requestTimeoutMs),
      });
    } catch {
      response = undefined;
    }

    if (response !== undefined) {
      if (response.status === 200) {
        const payload = await readJson(response, "Packagist P2 endpoint");
        const result = inspectP2(payload, { packageName, tag, reference });

        if (result.state === "published") return;

        if (result.state === "mismatch") {
          throw new Error(
            `Packagist published ${tag} with source reference ${result.actualReference}; expected ${reference}.`,
          );
        }
      } else if (response.status !== 429 && response.status < 500) {
        throw new Error(`Packagist P2 endpoint returned HTTP ${response.status}.`);
      }
    }

    attempt++;
    const remaining = pollTimeoutMs - (now() - startedAt);

    if (remaining <= 0) continue;

    await sleep(Math.min(pollDelay(now() - startedAt), remaining));
  }
}

export async function syncPackagist({ tag, reference, token, ...options }, dependencies = {}) {
  validateInputs(tag, reference, token);
  const jobs = await requestPackagistUpdate({ token, ...options }, dependencies);
  await waitForPackagistVersion({ tag, reference, ...options }, dependencies);
  return { jobs };
}

export async function runCli(
  {
    args = process.argv.slice(2),
    env = process.env,
    writeOutput = (message) => console.log(message),
  } = {},
  dependencies = {},
) {
  if (args.length !== 2) {
    throw new Error("Usage: node scripts/packagist-sync.mjs <vMAJOR.MINOR.PATCH> <commit-sha>");
  }

  const [tag, reference] = args;
  await syncPackagist(
    {
      tag,
      reference,
      token: env.PACKAGIST_SAFE_TOKEN,
    },
    dependencies,
  );
  writeOutput(`Packagist published ${tag} from distribution commit ${reference}.`);
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : "Packagist synchronization failed.");
    process.exitCode = 1;
  });
}
