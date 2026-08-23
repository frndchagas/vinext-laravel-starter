import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import {
  GATE_OUTPUTS,
  MAIN_SKIPPED_JOBS,
  MAIN_SUCCESS_JOBS,
  validateMainJobs,
  validateNeeds,
} from "./ci-policy.mjs";

const POLICY_PATH = fileURLToPath(new URL("./ci-policy.mjs", import.meta.url));
const CONDITIONAL_JOBS = {
  integration: "integration",
  e2e: "e2e",
  template: "template-smoke",
  distribution: "distribution-smoke",
  production: "production-smoke",
  breaking: "breaking-changes",
};

function gateOutputs(enabled = []) {
  const selected = new Set(enabled);
  return Object.fromEntries(GATE_OUTPUTS.map((name) => [name, String(selected.has(name))]));
}

function pullRequestNeeds(enabled = []) {
  const outputs = gateOutputs(enabled);
  const needs = {
    changes: { result: "success", outputs },
    verify: { result: "success", outputs: {} },
    gitleaks: { result: "success", outputs: {} },
    "dependency-review": { result: "success", outputs: {} },
  };

  for (const [output, job] of Object.entries(CONDITIONAL_JOBS)) {
    needs[job] = { result: outputs[output] === "true" ? "success" : "skipped", outputs: {} };
  }

  return needs;
}

function fullNeeds() {
  const needs = pullRequestNeeds(GATE_OUTPUTS);
  needs["dependency-review"].result = "skipped";
  needs["breaking-changes"].result = "skipped";
  return needs;
}

function mainJobs() {
  return [
    ...MAIN_SUCCESS_JOBS.map((name) => ({ name, conclusion: "success" })),
    ...MAIN_SKIPPED_JOBS.map((name) => ({ name, conclusion: "skipped" })),
  ];
}

function clone(value) {
  return structuredClone(value);
}

describe("validateNeeds", () => {
  test("accepts a documentation-only pull request", () => {
    expect(validateNeeds("pull_request", pullRequestNeeds())).toBe(true);
  });

  test("accepts a pull request with only its selected application gates", () => {
    const needs = pullRequestNeeds(["integration", "e2e", "production"]);

    expect(validateNeeds("pull_request", needs)).toBe(true);
  });

  for (const eventName of ["push", "schedule", "workflow_dispatch"]) {
    test(`requires and accepts complete gates for ${eventName}`, () => {
      expect(validateNeeds(eventName, fullNeeds())).toBe(true);
    });
  }

  test("rejects a missing gate output", () => {
    const needs = pullRequestNeeds();
    delete needs.changes.outputs.e2e;

    expect(() => validateNeeds("pull_request", needs)).toThrow(
      'changes output "e2e" must be "true" or "false", received <missing>',
    );
  });

  test("rejects a gate output that is not a boolean string", () => {
    const needs = pullRequestNeeds();
    needs.changes.outputs.template = "yes";

    expect(() => validateNeeds("pull_request", needs)).toThrow(
      'changes output "template" must be "true" or "false", received "yes"',
    );
  });

  test("rejects a selected gate that was skipped", () => {
    const needs = pullRequestNeeds(["e2e"]);
    needs.e2e.result = "skipped";

    expect(() => validateNeeds("pull_request", needs)).toThrow(
      'job "e2e" must be "success", received "skipped"',
    );
  });

  test("rejects an unselected gate that ran", () => {
    const needs = pullRequestNeeds();
    needs["template-smoke"].result = "success";

    expect(() => validateNeeds("pull_request", needs)).toThrow(
      'job "template-smoke" must be "skipped", received "success"',
    );
  });

  test("rejects a pull request without dependency review", () => {
    const needs = pullRequestNeeds();
    needs["dependency-review"].result = "skipped";

    expect(() => validateNeeds("pull_request", needs)).toThrow(
      'job "dependency-review" must be "success", received "skipped"',
    );
  });

  test("requires Docker scans to select the production job", () => {
    const needs = pullRequestNeeds(["docker"]);

    expect(() => validateNeeds("pull_request", needs)).toThrow(
      'changes output "docker" may be "true" only when "production" is "true"',
    );
  });

  test("rejects every false output during full CI", () => {
    for (const output of GATE_OUTPUTS) {
      const needs = fullNeeds();
      needs.changes.outputs[output] = "false";

      expect(() => validateNeeds("push", needs)).toThrow(
        `full CI event "push" requires changes output ${JSON.stringify(output)} to be "true"`,
      );
    }
  });

  test("rejects skipped heavy jobs during full CI", () => {
    for (const job of [
      "integration",
      "e2e",
      "template-smoke",
      "distribution-smoke",
      "production-smoke",
    ]) {
      const needs = fullNeeds();
      needs[job].result = "skipped";

      expect(() => validateNeeds("schedule", needs)).toThrow(
        `job ${JSON.stringify(job)} must be "success", received "skipped"`,
      );
    }
  });

  test("rejects failed or cancelled unconditional jobs", () => {
    for (const [job, result] of [
      ["changes", "failure"],
      ["verify", "cancelled"],
      ["gitleaks", "failure"],
    ]) {
      const needs = fullNeeds();
      needs[job].result = result;

      expect(() => validateNeeds("workflow_dispatch", needs)).toThrow(
        `job ${JSON.stringify(job)} must be "success", received ${JSON.stringify(result)}`,
      );
    }
  });

  test("rejects pull-request-only jobs that run during full CI", () => {
    for (const job of ["breaking-changes", "dependency-review"]) {
      const needs = fullNeeds();
      needs[job].result = "success";

      expect(() => validateNeeds("push", needs)).toThrow(
        `job ${JSON.stringify(job)} must be "skipped", received "success"`,
      );
    }
  });

  test("rejects unknown events and malformed needs", () => {
    expect(() => validateNeeds("release", fullNeeds())).toThrow(
      'unsupported CI event "release"',
    );
    expect(() => validateNeeds("push", null)).toThrow("needs must be an object");
  });
});

describe("validateMainJobs", () => {
  test("accepts the exact required main jobs and additional jobs", () => {
    expect(validateMainJobs({ jobs: [...mainJobs(), { name: "optional", conclusion: "success" }] })).toBe(
      true,
    );
  });

  test("requires both PHP matrix jobs exactly once", () => {
    for (const name of ["integration (8.3)", "integration (8.5)"]) {
      const missing = mainJobs().filter((job) => job.name !== name);
      expect(() => validateMainJobs(missing)).toThrow(
        `required main CI job ${JSON.stringify(name)} is missing`,
      );

      const duplicate = [...mainJobs(), { name, conclusion: "success" }];
      expect(() => validateMainJobs(duplicate)).toThrow(
        `required main CI job ${JSON.stringify(name)} must occur once, received 2 entries`,
      );
    }
  });

  test("rejects a green workflow that omitted a heavy job", () => {
    const jobs = mainJobs().filter((job) => job.name !== "production-smoke");

    expect(() => validateMainJobs(jobs)).toThrow(
      'required main CI job "production-smoke" is missing',
    );
  });

  test("rejects required jobs with the wrong conclusion", () => {
    for (const [name, conclusion, expected] of [
      ["e2e", "skipped", "success"],
      ["ci", "failure", "success"],
      ["breaking-changes", "success", "skipped"],
      ["dependency-review", "success", "skipped"],
    ]) {
      const jobs = clone(mainJobs());
      jobs.find((job) => job.name === name).conclusion = conclusion;

      expect(() => validateMainJobs(jobs)).toThrow(
        `required main CI job ${JSON.stringify(name)} must conclude ${JSON.stringify(expected)}, received ${JSON.stringify(conclusion)}`,
      );
    }
  });

  test("rejects malformed job payloads", () => {
    expect(() => validateMainJobs({ jobs: null })).toThrow(
      "jobs must be an array or an object with a jobs array",
    );
  });
});

describe("Node CLI", () => {
  test("validates needs under Node", () => {
    const result = Bun.spawnSync(["node", POLICY_PATH, "needs"], {
      env: {
        ...process.env,
        CI_EVENT_NAME: "pull_request",
        CI_NEEDS: JSON.stringify(pullRequestNeeds(["integration"])),
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("CI needs policy passed for pull_request.");
    expect(result.stderr.toString()).toBe("");
  });

  test("validates main jobs under Node", () => {
    const result = Bun.spawnSync(["node", POLICY_PATH, "main-jobs"], {
      env: {
        ...process.env,
        CI_JOBS: JSON.stringify({ jobs: mainJobs() }),
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("Full main CI job policy passed.");
    expect(result.stderr.toString()).toBe("");
  });

  test("reports policy violations and exits nonzero under Node", () => {
    const needs = pullRequestNeeds(["e2e"]);
    needs.e2e.result = "skipped";

    const result = Bun.spawnSync(["node", POLICY_PATH, "needs"], {
      env: {
        ...process.env,
        CI_EVENT_NAME: "pull_request",
        CI_NEEDS: JSON.stringify(needs),
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain(
      'job "e2e" must be "success", received "skipped"',
    );
  });
});
