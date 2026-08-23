import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import {
  inspectP2,
  parseUpdateResponse,
  pollDelay,
  requestPackagistUpdate,
  runCli,
  syncPackagist,
  waitForPackagistVersion,
} from "./packagist-sync.mjs";

const tag = "v1.0.4";
const reference = "1ea6743242e40b6908fe49c6a26ef0f508d18499";
const token = "safe-token-that-must-not-leak";
const packageName = "frndchagas/vinext-laravel-starter";
const scriptPath = fileURLToPath(
  new URL("./packagist-sync.mjs", import.meta.url),
);
const workflowPath = fileURLToPath(
  new URL("../.github/workflows/publish-distribution.yml", import.meta.url),
);

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function p2(...versions) {
  return { packages: { [packageName]: versions }, minified: "composer/2.0" };
}

function publishedVersion(version = tag, sourceReference = reference) {
  return {
    version,
    source: {
      type: "git",
      reference: sourceReference,
    },
  };
}

describe("Packagist update response", () => {
  test("accepts the documented asynchronous success response", () => {
    expect(
      parseUpdateResponse(202, { status: "success", jobs: ["job-id"] }),
    ).toEqual(["job-id"]);
  });

  test("rejects HTTP and body-level failures", () => {
    expect(() =>
      parseUpdateResponse(403, {
        status: "error",
        message: "invalid credentials",
      }),
    ).toThrow("HTTP 403");
    expect(() =>
      parseUpdateResponse(202, { status: "success", jobs: [] }),
    ).toThrow("invalid update response");
    expect(() =>
      parseUpdateResponse(202, { status: "success", jobs: [null] }),
    ).toThrow("invalid update response");
  });

  test("sends the token only in the Bearer header and applies an AbortSignal timeout", async () => {
    const timeoutSignal = { source: "test-timeout" };
    let capturedUrl;
    let capturedOptions;

    const jobs = await requestPackagistUpdate(
      { token },
      {
        fetchImpl: async (url, options) => {
          capturedUrl = url;
          capturedOptions = options;
          return jsonResponse(202, {
            status: "success",
            jobs: ["job-id"],
            type: "manual",
          });
        },
        createTimeoutSignal: (milliseconds) => {
          expect(milliseconds).toBe(30_000);
          return timeoutSignal;
        },
      },
    );

    expect(jobs).toEqual(["job-id"]);
    expect(capturedUrl).toBe("https://packagist.org/api/update-package");
    expect(capturedOptions.method).toBe("POST");
    expect(capturedOptions.headers.Authorization).toBe(
      `Bearer frndchagas:${token}`,
    );
    expect(capturedOptions.body).toBe(
      JSON.stringify({
        repository:
          "https://github.com/frndchagas/vinext-laravel-starter-distribution",
      }),
    );
    expect(capturedOptions.signal).toBe(timeoutSignal);
    expect(capturedUrl).not.toContain(token);
    expect(capturedOptions.body).not.toContain(token);
  });

  test("never includes the token in failures", async () => {
    let failure;

    try {
      await requestPackagistUpdate(
        { token },
        {
          fetchImpl: async () =>
            jsonResponse(403, {
              status: "error",
              message: `reflected credential: ${token}`,
            }),
          createTimeoutSignal: () => undefined,
        },
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).not.toContain(token);
  });
});

describe("Packagist P2 verification", () => {
  test("distinguishes pending, published and mismatched versions", () => {
    expect(inspectP2(p2(), { tag, reference })).toEqual({ state: "pending" });
    expect(inspectP2(p2(publishedVersion()), { tag, reference })).toEqual({
      state: "published",
    });
    expect(
      inspectP2(
        p2(publishedVersion(tag, "0000000000000000000000000000000000000000")),
        {
          tag,
          reference,
        },
      ),
    ).toEqual({
      state: "mismatch",
      actualReference: "0000000000000000000000000000000000000000",
    });
  });

  test("uses progressively slower polling intervals", () => {
    expect(pollDelay(0)).toBe(5_000);
    expect(pollDelay(59_999)).toBe(5_000);
    expect(pollDelay(60_000)).toBe(15_000);
    expect(pollDelay(299_999)).toBe(15_000);
    expect(pollDelay(300_000)).toBe(30_000);
  });

  test("polls without network and accepts only the exact source reference", async () => {
    let currentTime = 10_000;
    const sleeps = [];
    const requests = [];
    const responses = [
      jsonResponse(200, p2(publishedVersion("v1.0.3", "old-reference"))),
      jsonResponse(200, p2(publishedVersion())),
    ];

    await waitForPackagistVersion(
      { tag, reference },
      {
        fetchImpl: async (url, options) => {
          requests.push({ url: String(url), options });
          return responses.shift();
        },
        sleep: async (milliseconds) => {
          sleeps.push(milliseconds);
          currentTime += milliseconds;
        },
        now: () => currentTime,
        createTimeoutSignal: (milliseconds) => ({ milliseconds }),
      },
    );

    expect(requests).toHaveLength(2);
    expect(requests[0].url).toContain("release-check=v1.0.4-0-10000");
    expect(requests[0].options.headers.Authorization).toBeUndefined();
    expect(requests[0].options.signal).toEqual({ milliseconds: 15_000 });
    expect(sleeps).toEqual([5_000]);
  });

  test("fails immediately when Packagist maps the tag to another commit", async () => {
    let slept = false;

    await expect(
      waitForPackagistVersion(
        { tag, reference },
        {
          fetchImpl: async () =>
            jsonResponse(
              200,
              p2(
                publishedVersion(
                  tag,
                  "0000000000000000000000000000000000000000",
                ),
              ),
            ),
          sleep: async () => {
            slept = true;
          },
          now: () => 0,
          createTimeoutSignal: () => undefined,
        },
      ),
    ).rejects.toThrow(/published v1\.0\.4 with source reference 0000/);
    expect(slept).toBeFalse();
  });

  test("fails closed when the polling deadline expires", async () => {
    let currentTime = 0;

    await expect(
      waitForPackagistVersion(
        { tag, reference, pollTimeoutMs: 10_000 },
        {
          fetchImpl: async () => jsonResponse(503, { status: "unavailable" }),
          sleep: async (milliseconds) => {
            currentTime += milliseconds;
          },
          now: () => currentTime,
          createTimeoutSignal: () => undefined,
        },
      ),
    ).rejects.toThrow("did not publish v1.0.4 within 10000ms");
  });
});

describe("Packagist synchronization CLI", () => {
  test("runs as a Node entrypoint without making a request for invalid arguments", () => {
    const result = Bun.spawnSync(["node", scriptPath], {
      env: process.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout.toString()).toBe("");
    expect(result.stderr.toString()).toContain(
      "Usage: node scripts/packagist-sync.mjs <vMAJOR.MINOR.PATCH> <commit-sha>",
    );
  });

  test("requires the token from PACKAGIST_SAFE_TOKEN", async () => {
    await expect(
      runCli(
        {
          args: [tag, reference],
          env: {},
          writeOutput: () => {},
        },
        { fetchImpl: async () => jsonResponse(500, {}) },
      ),
    ).rejects.toThrow("PACKAGIST_SAFE_TOKEN is required");
  });

  test("runs end to end with injected dependencies and prints no token", async () => {
    const output = [];
    let request = 0;

    const result = await runCli(
      {
        args: [tag, reference],
        env: { PACKAGIST_SAFE_TOKEN: token },
        writeOutput: (message) => output.push(message),
      },
      {
        fetchImpl: async () => {
          request++;
          return request === 1
            ? jsonResponse(202, { status: "success", jobs: ["job-id"] })
            : jsonResponse(200, p2(publishedVersion()));
        },
        now: () => 0,
        sleep: async () => {},
        createTimeoutSignal: () => undefined,
      },
    );

    expect(result).toBeUndefined();
    expect(request).toBe(2);
    expect(output).toEqual([
      `Packagist published ${tag} from distribution commit ${reference}.`,
    ]);
    expect(output.join("\n")).not.toContain(token);
  });

  test("the orchestration hides tokens reflected by a failing transport", async () => {
    let failure;

    try {
      await syncPackagist(
        { tag, reference, token },
        {
          fetchImpl: async () => {
            throw new Error(`transport echoed ${token}`);
          },
          createTimeoutSignal: () => undefined,
        },
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toBe("Packagist update request failed.");
    expect(failure.message).not.toContain(token);
  });
});

describe("Packagist repair workflow", () => {
  test("separates Git publication from Packagist credentials", async () => {
    const workflow = Bun.YAML.parse(await Bun.file(workflowPath).text());
    const publisher = workflow.jobs.distribution;
    const packagist = workflow.jobs["publish-packagist"];
    const verification = workflow.jobs.verify_packagist_repair;
    const repair = workflow.jobs["repair-packagist"];
    const verificationText = JSON.stringify(verification);
    const repairText = JSON.stringify([verification, repair]);
    const publisherCheckout = publisher.steps.find((step) =>
      step.uses?.startsWith("actions/checkout@"),
    );
    const verificationCheckout = verification.steps.find((step) =>
      step.uses?.startsWith("actions/checkout@"),
    );
    const repairCheckout = repair.steps.find((step) =>
      step.uses?.startsWith("actions/checkout@"),
    );
    const source = verification.steps.find(
      (step) => step.name === "Verify the existing stable release",
    );
    const distribution = verification.steps.find(
      (step) => step.name === "Verify the existing distribution tag",
    );
    const update = repair.steps.find(
      (step) => step.name === "Update and verify Packagist",
    );

    expect(workflow.on.workflow_dispatch.inputs.tag).toMatchObject({
      required: true,
      type: "string",
    });
    expect(workflow.permissions).toEqual({ actions: "read", contents: "read" });
    expect(publisher.if).toContain("github.event_name == 'release'");
    expect(publisher.environment).toBe("distribution");
    expect(publisherCheckout.with["persist-credentials"]).toBeFalse();
    expect(packagist.needs).toBe("distribution");
    expect(packagist.environment).toBe("packagist");
    expect(JSON.stringify(packagist)).not.toContain("DISTRIBUTION_DEPLOY_KEY");

    expect(verification.if).toContain(
      "github.event_name == 'workflow_dispatch'",
    );
    expect(verification.if).not.toContain("github.ref == 'refs/heads/main'");
    expect(verification.environment).toBeUndefined();
    expect(verificationCheckout.with.ref).toBe("${{ github.sha }}");
    expect(verificationCheckout.with["persist-credentials"]).toBeFalse();
    expect(source.run).toContain('test "$GITHUB_REF" = refs/heads/main');
    expect(source.run).toContain('git cat-file -t "refs/tags/${SOURCE_TAG}"');
    expect(source.run).toContain("git merge-base --is-ancestor");
    expect(source.run).toContain(
      'gh api "repos/${GITHUB_REPOSITORY}/releases/tags/${SOURCE_TAG}"',
    );
    expect(source.run).toContain("(.immutable == true)");
    expect(source.run).toContain(
      'bash scripts/verify-main-ci.sh "$source_commit"',
    );
    expect(distribution.run).toContain(
      "https://github.com/frndchagas/vinext-laravel-starter-distribution.git",
    );
    expect(distribution.run).toContain(
      'git cat-file -t "refs/tags/${SOURCE_TAG}"',
    );
    expect(distribution.run).toContain("git merge-base --is-ancestor");
    expect(distribution.run).toContain(
      'git show "${SOURCE_TAG}:.source-commit"',
    );
    expect(distribution.run).toContain('git show "${SOURCE_TAG}:.source-tag"');
    expect(verificationText).not.toContain("PACKAGIST_SAFE_TOKEN");

    expect(repair.needs).toBe("verify_packagist_repair");
    expect(repair.environment).toBe("packagist");
    expect(repairCheckout.with.ref).toBe("${{ github.sha }}");
    expect(repairCheckout.with["persist-credentials"]).toBeFalse();
    expect(update.env.DISTRIBUTION_COMMIT).toBe(
      "${{ needs.verify_packagist_repair.outputs.distribution_commit }}",
    );
    expect(update.run).toBe(
      'node scripts/packagist-sync.mjs "$SOURCE_TAG" "$DISTRIBUTION_COMMIT"',
    );

    for (const forbidden of [
      "DISTRIBUTION_DEPLOY_KEY",
      "git push",
      "git tag ",
      "gh release",
      "sync-distribution.sh",
    ]) {
      expect(repairText).not.toContain(forbidden);
    }
  });
});
