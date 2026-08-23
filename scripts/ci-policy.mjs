#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const GATE_OUTPUTS = [
  "integration",
  "e2e",
  "template",
  "distribution",
  "production",
  "breaking",
  "docker",
];

export const MAIN_SUCCESS_JOBS = [
  "changes",
  "verify",
  "integration (8.3)",
  "integration (8.5)",
  "e2e",
  "template-smoke",
  "distribution-smoke",
  "production-smoke",
  "gitleaks",
  "ci",
];

export const MAIN_SKIPPED_JOBS = ["breaking-changes", "dependency-review"];

const FULL_EVENTS = new Set(["push", "schedule", "workflow_dispatch"]);
const PULL_REQUEST_EVENT = "pull_request";
const ALWAYS_SUCCESSFUL_NEEDS = ["changes", "verify", "gitleaks"];
const PULL_REQUEST_SUCCESSFUL_NEEDS = ["dependency-review"];
const PULL_REQUEST_ONLY_NEEDS = ["breaking-changes", "dependency-review"];
const OUTPUT_TO_NEED = {
  integration: "integration",
  e2e: "e2e",
  template: "template-smoke",
  distribution: "distribution-smoke",
  production: "production-smoke",
  breaking: "breaking-changes",
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function printable(value) {
  return value === undefined ? "<missing>" : JSON.stringify(value);
}

function throwViolations(violations) {
  if (violations.length === 0) return;

  throw new Error(`CI policy violations:\n${violations.map((item) => `- ${item}`).join("\n")}`);
}

function requireNeedResult(needs, name, expected, violations) {
  const actual = isRecord(needs[name]) ? needs[name].result : undefined;

  if (actual !== expected) {
    violations.push(
      `job ${JSON.stringify(name)} must be ${JSON.stringify(expected)}, received ${printable(actual)}`,
    );
  }
}

function validateGateOutputs(needs, violations) {
  const outputs = isRecord(needs.changes) && isRecord(needs.changes.outputs)
    ? needs.changes.outputs
    : {};

  for (const name of GATE_OUTPUTS) {
    const value = outputs[name];

    if (value !== "true" && value !== "false") {
      violations.push(
        `changes output ${JSON.stringify(name)} must be "true" or "false", received ${printable(value)}`,
      );
    }
  }

  return outputs;
}

export function validateNeeds(eventName, needs) {
  const violations = [];

  if (eventName !== PULL_REQUEST_EVENT && !FULL_EVENTS.has(eventName)) {
    violations.push(`unsupported CI event ${printable(eventName)}`);
  }

  if (!isRecord(needs)) {
    throw new Error(`CI policy violations:\n- needs must be an object, received ${printable(needs)}`);
  }

  const outputs = validateGateOutputs(needs, violations);

  for (const name of ALWAYS_SUCCESSFUL_NEEDS) {
    requireNeedResult(needs, name, "success", violations);
  }

  if (eventName === PULL_REQUEST_EVENT) {
    for (const name of PULL_REQUEST_SUCCESSFUL_NEEDS) {
      requireNeedResult(needs, name, "success", violations);
    }

    for (const [output, job] of Object.entries(OUTPUT_TO_NEED)) {
      if (outputs[output] === "true") {
        requireNeedResult(needs, job, "success", violations);
      } else if (outputs[output] === "false") {
        requireNeedResult(needs, job, "skipped", violations);
      }
    }

    if (outputs.docker === "true" && outputs.production !== "true") {
      violations.push('changes output "docker" may be "true" only when "production" is "true"');
    }
  } else if (FULL_EVENTS.has(eventName)) {
    for (const output of GATE_OUTPUTS) {
      if (outputs[output] !== "true") {
        violations.push(
          `full CI event ${JSON.stringify(eventName)} requires changes output ${JSON.stringify(output)} to be "true"`,
        );
      }
    }

    for (const output of ["integration", "e2e", "template", "distribution", "production"]) {
      requireNeedResult(needs, OUTPUT_TO_NEED[output], "success", violations);
    }

    for (const name of PULL_REQUEST_ONLY_NEEDS) {
      requireNeedResult(needs, name, "skipped", violations);
    }
  }

  throwViolations(violations);
  return true;
}

function jobArray(jobs) {
  if (Array.isArray(jobs)) return jobs;
  if (isRecord(jobs) && Array.isArray(jobs.jobs)) return jobs.jobs;

  throw new Error(
    `CI policy violations:\n- jobs must be an array or an object with a jobs array, received ${printable(jobs)}`,
  );
}

function requireUniqueMainJob(jobs, name, expected, violations) {
  const matches = jobs.filter((job) => isRecord(job) && job.name === name);

  if (matches.length === 0) {
    violations.push(`required main CI job ${JSON.stringify(name)} is missing`);
    return;
  }

  if (matches.length > 1) {
    violations.push(
      `required main CI job ${JSON.stringify(name)} must occur once, received ${matches.length} entries`,
    );
    return;
  }

  if (matches[0].conclusion !== expected) {
    violations.push(
      `required main CI job ${JSON.stringify(name)} must conclude ${JSON.stringify(expected)}, received ${printable(matches[0].conclusion)}`,
    );
  }
}

export function validateMainJobs(input) {
  const jobs = jobArray(input);
  const violations = [];

  for (const name of MAIN_SUCCESS_JOBS) {
    requireUniqueMainJob(jobs, name, "success", violations);
  }

  for (const name of MAIN_SKIPPED_JOBS) {
    requireUniqueMainJob(jobs, name, "skipped", violations);
  }

  throwViolations(violations);
  return true;
}

function parseJson(value, source) {
  if (!value.trim()) throw new Error(`${source} did not contain JSON.`);

  try {
    return JSON.parse(value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${source} as JSON: ${detail}`);
  }
}

function readJson(environmentName) {
  const environmentValue = process.env[environmentName];

  if (environmentValue !== undefined) return parseJson(environmentValue, environmentName);

  return parseJson(readFileSync(0, "utf8"), "standard input");
}

function isMainModule() {
  if (process.argv[1] === undefined) return false;

  return import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}

if (isMainModule()) {
  try {
    const mode = process.argv[2];

    if (mode === "needs") {
      const eventName = process.env.CI_EVENT_NAME ?? process.argv[3];
      validateNeeds(eventName, readJson("CI_NEEDS"));
      console.log(`CI needs policy passed for ${eventName}.`);
    } else if (mode === "main-jobs") {
      validateMainJobs(readJson("CI_JOBS"));
      console.log("Full main CI job policy passed.");
    } else {
      throw new Error("Usage: node scripts/ci-policy.mjs <needs|main-jobs> [event-name]");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
