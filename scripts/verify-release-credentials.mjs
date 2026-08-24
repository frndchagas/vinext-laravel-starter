import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const releaseCredentialRequirements = Object.freeze([
  Object.freeze({
    environment: "distribution",
    secrets: Object.freeze(["DISTRIBUTION_DEPLOY_KEY"]),
  }),
  Object.freeze({
    environment: "packagist",
    secrets: Object.freeze(["PACKAGIST_SAFE_TOKEN"]),
  }),
]);

export function parseSecretNames(output, environment) {
  let secrets;

  try {
    secrets = JSON.parse(output);
  } catch {
    throw new Error(
      `GitHub returned invalid secret metadata for ${environment}.`,
    );
  }

  if (
    !Array.isArray(secrets) ||
    secrets.some(
      (secret) =>
        typeof secret !== "object" ||
        secret === null ||
        typeof secret.name !== "string",
    )
  ) {
    throw new Error(
      `GitHub returned invalid secret metadata for ${environment}.`,
    );
  }

  return new Set(secrets.map((secret) => secret.name));
}

export function listEnvironmentSecrets(environment, spawn = spawnSync) {
  const result = spawn(
    "gh",
    ["secret", "list", "--env", environment, "--json", "name"],
    { encoding: "utf8" },
  );

  if (result.error || result.status !== 0) {
    throw new Error(`Could not inspect GitHub environment ${environment}.`);
  }

  return parseSecretNames(result.stdout, environment);
}

export function inspectReleaseCredentials(
  listSecrets = listEnvironmentSecrets,
) {
  return releaseCredentialRequirements.map(({ environment, secrets }) => {
    const actual = listSecrets(environment);
    const expected = new Set(secrets);

    return {
      environment,
      missing: secrets.filter((secret) => !actual.has(secret)),
      unexpected: [...actual].filter((secret) => !expected.has(secret)).sort(),
    };
  });
}

export function verifyReleaseCredentials(listSecrets = listEnvironmentSecrets) {
  const issues = inspectReleaseCredentials(listSecrets).filter(
    ({ missing, unexpected }) => missing.length > 0 || unexpected.length > 0,
  );

  if (issues.length > 0) {
    throw new Error(
      `Release credential layout is invalid: ${issues
        .flatMap(({ environment, missing, unexpected }) => [
          ...missing.map((secret) => `${environment} is missing ${secret}`),
          ...unexpected.map(
            (secret) => `${environment} contains unexpected ${secret}`,
          ),
        ])
        .join("; ")}.`,
    );
  }
}

export function runCli(listSecrets = listEnvironmentSecrets) {
  verifyReleaseCredentials(listSecrets);
  return "Release credential names are isolated in their expected environments; values were not inspected.";
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    console.log(runCli());
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Release credential verification failed.",
    );
    process.exitCode = 1;
  }
}
