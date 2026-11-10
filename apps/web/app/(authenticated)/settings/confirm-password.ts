import { confirmPassword } from "@vinext-laravel-starter/api-client";

import { problemDetail, validationErrors } from "@/lib/problem";

/**
 * Confirms the current password on the session (Fortify) before a sensitive action; returns the
 * error message or undefined.
 */
export async function confirmCurrentPassword(password: string): Promise<string | undefined> {
  const response = await confirmPassword({ password });

  if (response.status === 201) return undefined;
  if (response.status === 422) {
    return validationErrors(response.data)["password"]?.[0] ?? "Check your password.";
  }

  return problemDetail(response.data, "The password could not be confirmed.");
}
