import type { z } from "zod";

import { responseContracts } from "../generated/response-contracts";

type ContractSchema = z.ZodType;
type FormattableIssue = {
  code: string;
  errors?: FormattableIssue[][];
  keys?: string[];
  message: string;
  path: PropertyKey[];
};

function formatIssues(error: z.ZodError): string {
  function format(issue: FormattableIssue, parentPath: PropertyKey[] = []): string[] {
    const path = [...parentPath, ...issue.path];

    if (issue.code === "invalid_union" && issue.errors) {
      return issue.errors.flatMap((branch) => branch.flatMap((nested) => format(nested, path)));
    }
    if (issue.code === "unrecognized_keys" && issue.keys) {
      return issue.keys.map(
        (key) => `${[...path, key].join(".") || "<root>"}: Unrecognized key`,
      );
    }

    return [`${path.join(".") || "<root>"}: ${issue.message}`];
  }

  return (error.issues as FormattableIssue[]).flatMap((issue) => format(issue)).join("; ");
}

export function validateContractResponse(
  method: string,
  url: string,
  status: number,
  data: unknown,
): void {
  const path = new URL(url, "http://contract.local").pathname;
  const contract = responseContracts.find(
    (candidate) => candidate.method === method && candidate.path.test(path),
  );

  if (contract === undefined) {
    throw new Error(`No HTTP response contract for ${method} ${path}.`);
  }

  const schema = (contract.responses as Record<number, ContractSchema>)[status];

  if (schema === undefined) {
    throw new Error(
      `${contract.operationId} returned undocumented status ${status} for ${method} ${path}.`,
    );
  }

  const result = schema.safeParse(data);

  if (!result.success) {
    throw new Error(
      `${contract.operationId} returned an invalid ${status} response for ${method} ${path}: ${formatIssues(result.error)}`,
    );
  }
}
