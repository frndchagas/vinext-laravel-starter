"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  confirmPassword,
  deleteCurrentUser,
  disableTwoFactor,
  getGetMeQueryKey,
  getGetRecoveryCodesQueryKey,
  regenerateRecoveryCodes,
  useConfirmTwoFactor,
  useEnableTwoFactor,
  useGetRecoveryCodes,
  useGetTwoFactorQrCode,
  useGetTwoFactorSecretKey,
  useUpdatePassword,
  useUpdateProfile,
} from "@vinext-laravel-starter/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppearanceSelector } from "@/components/appearance-selector";
import { useAuthenticatedUser } from "@/components/authenticated-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordActionDialog } from "@/components/ui/password-action-dialog";
import { disconnectEcho } from "@/lib/echo";
import { formValue } from "@/lib/form";
import { problemDetail, validationErrors } from "@/lib/problem";
import { useHydrated } from "@/lib/use-hydrated";

async function confirmCurrentPassword(password: string): Promise<string | undefined> {
  const response = await confirmPassword({ password });

  if (response.status === 201) return undefined;
  if (response.status === 422) {
    return validationErrors(response.data)["password"]?.[0] ?? "Check your password.";
  }

  return problemDetail(response.data, "The password could not be confirmed.");
}

export default function SettingsPage() {
  const me = useAuthenticatedUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const profileMutation = useUpdateProfile();
  const passwordMutation = useUpdatePassword();
  const enableMutation = useEnableTwoFactor();
  const confirmTwoFactorMutation = useConfirmTwoFactor();
  const [profileMessage, setProfileMessage] = useState<string>();
  const [profileEmail, setProfileEmail] = useState(me.email);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string>();
  const [twoFactorPasswordError, setTwoFactorPasswordError] = useState<string>();
  const [recoveryPasswordError, setRecoveryPasswordError] = useState<string>();
  const [showSetup, setShowSetup] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  const setupActive = showSetup && !me.two_factor_confirmed;
  const qrQuery = useGetTwoFactorQrCode({ query: { enabled: setupActive } });
  const secretQuery = useGetTwoFactorSecretKey({ query: { enabled: setupActive } });
  const recoveryQuery = useGetRecoveryCodes({ query: { enabled: showRecoveryCodes } });
  const changingEmail = profileEmail.trim().toLowerCase() !== me.email.toLowerCase();

  async function startTwoFactorSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTwoFactorMessage(undefined);
    setTwoFactorPasswordError(undefined);

    const form = new FormData(event.currentTarget);
    const confirmationError = await confirmCurrentPassword(formValue(form, "current_password"));

    if (confirmationError) {
      setTwoFactorPasswordError(confirmationError);
      return;
    }

    if (!me?.two_factor_enabled) {
      const response = await enableMutation.mutateAsync();
      if (response.status !== 200) {
        setTwoFactorMessage(problemDetail(response.data, "Two-factor setup could not start."));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    }

    setShowSetup(true);
  }

  function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(undefined);
    const form = new FormData(event.currentTarget);
    const email = formValue(form, "email");

    profileMutation.mutate(
      {
        data: {
          name: formValue(form, "name"),
          email,
          ...(changingEmail ? { current_password: formValue(form, "current_password") } : {}),
        },
      },
      {
        onSuccess: async (response) => {
          if (response.status !== 200) return;
          setProfileMessage("Profile updated.");
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          if (changingEmail) router.push("/verify-email");
        },
      },
    );
  }

  function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    passwordMutation.mutate(
      {
        data: {
          current_password: formValue(form, "current_password"),
          password: formValue(form, "password"),
          password_confirmation: formValue(form, "password_confirmation"),
        },
      },
      {
        onSuccess: (response) => {
          if (response.status === 200) {
            disconnectEcho();
            queryClient.clear();
            window.location.assign("/login?password_updated=1");
          }
        },
      },
    );
  }

  function confirmTwoFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTwoFactorMessage(undefined);
    setRecoveryPasswordError(undefined);
    const form = new FormData(event.currentTarget);

    confirmTwoFactorMutation.mutate(
      { data: { code: formValue(form, "code") } },
      {
        onSuccess: async (response) => {
          if (response.status !== 200) return;
          setShowSetup(false);
          setShowRecoveryCodes(true);
          setTwoFactorMessage("Two-factor authentication is active. Save the recovery codes.");
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
      },
    );
  }

  async function showCodes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTwoFactorMessage(undefined);
    const form = new FormData(event.currentTarget);
    const confirmationError = await confirmCurrentPassword(formValue(form, "recovery_password"));

    if (confirmationError) {
      setRecoveryPasswordError(confirmationError);
      return;
    }

    setShowRecoveryCodes(true);
  }

  async function regenerateCodes(password: string): Promise<string | undefined> {
    const confirmationError = await confirmCurrentPassword(password);
    if (confirmationError) return confirmationError;

    const response = await regenerateRecoveryCodes();
    if (response.status !== 200) {
      return problemDetail(response.data, "Recovery codes could not be regenerated.");
    }

    setShowRecoveryCodes(true);
    await queryClient.invalidateQueries({ queryKey: getGetRecoveryCodesQueryKey() });
    setTwoFactorMessage("New recovery codes generated. Previous codes no longer work.");
    return undefined;
  }

  async function disable(password: string): Promise<string | undefined> {
    const confirmationError = await confirmCurrentPassword(password);
    if (confirmationError) return confirmationError;

    const response = await disableTwoFactor();
    if (response.status !== 200) {
      return problemDetail(response.data, "Two-factor authentication could not be disabled.");
    }

    setShowSetup(false);
    setShowRecoveryCodes(false);
    setTwoFactorMessage("Two-factor authentication disabled.");
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    return undefined;
  }

  async function deleteAccount(password: string): Promise<string | undefined> {
    const response = await deleteCurrentUser({ password });

    if (response.status === 204) {
      queryClient.clear();
      window.location.assign("/login?account_deleted=1");
      return undefined;
    }

    if (response.status === 422) {
      return validationErrors(response.data)["password"]?.[0] ?? "Check your password.";
    }

    return problemDetail(response.data, "The account could not be deleted.");
  }

  const profileErrors =
    profileMutation.data?.status === 422 ? validationErrors(profileMutation.data.data) : {};
  const passwordErrors =
    passwordMutation.data?.status === 422 ? validationErrors(passwordMutation.data.data) : {};
  const twoFactorErrors =
    confirmTwoFactorMutation.data?.status === 422
      ? validationErrors(confirmTwoFactorMutation.data.data)
      : {};
  const qr = qrQuery.data?.status === 200 ? qrQuery.data.data : undefined;
  const secret = secretQuery.data?.status === 200 ? secretQuery.data.data.secretKey : undefined;
  const recoveryCodes = recoveryQuery.data?.status === 200 ? recoveryQuery.data.data : undefined;

  return (
    <>
      <header className="border-b border-border pb-6">
        <div>
          <p className="text-sm text-muted-foreground">Account</p>
          <h1 className="mt-1 font-[family-name:var(--font-app-display)] text-4xl text-balance">
            Settings
          </h1>
        </div>
      </header>

      <section aria-labelledby="profile-heading" className="rounded-xl border border-border p-6">
        <h2 id="profile-heading" className="text-xl font-semibold text-balance">
          Profile
        </h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Changing the email address requires your current password and verification again.
        </p>
        <form
          className="mt-5 flex flex-col gap-4"
          key={`${me.id}:${me.name}:${me.email}`}
          onSubmit={updateProfile}
        >
          <Field
            defaultValue={me.name}
            errors={profileErrors["name"]}
            label="Name"
            name="name"
            required
          />
          <Field
            autoComplete="email"
            errors={profileErrors["email"]}
            label="Email"
            name="email"
            onChange={(event) => setProfileEmail(event.target.value)}
            required
            type="email"
            value={profileEmail}
          />
          {changingEmail ? (
            <Field
              autoComplete="current-password"
              errors={profileErrors["current_password"]}
              label="Current password"
              name="current_password"
              required
              type="password"
            />
          ) : null}
          <div className="flex items-center gap-3">
            <Button disabled={!hydrated || profileMutation.isPending} type="submit">
              {profileMutation.isPending ? "Saving…" : "Save profile"}
            </Button>
            {profileMessage ? (
              <output className="text-sm text-primary">{profileMessage}</output>
            ) : null}
          </div>
        </form>
      </section>

      <section aria-labelledby="appearance-heading" className="rounded-xl border border-border p-6">
        <h2 id="appearance-heading" className="text-xl font-semibold text-balance">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Use the system preference or choose a theme for this browser.
        </p>
        <div className="mt-5">
          <AppearanceSelector />
        </div>
      </section>

      <section aria-labelledby="password-heading" className="rounded-xl border border-border p-6">
        <h2 id="password-heading" className="text-xl font-semibold text-balance">
          Password
        </h2>
        <form className="mt-5 flex flex-col gap-4" onSubmit={updatePassword}>
          <Field
            autoComplete="current-password"
            errors={passwordErrors["current_password"]}
            label="Current password"
            name="current_password"
            required
            type="password"
          />
          <Field
            autoComplete="new-password"
            errors={passwordErrors["password"]}
            label="New password"
            name="password"
            required
            type="password"
          />
          <Field
            autoComplete="new-password"
            errors={passwordErrors["password_confirmation"]}
            label="Confirm new password"
            name="password_confirmation"
            required
            type="password"
          />
          <Button
            className="self-start"
            disabled={!hydrated || passwordMutation.isPending}
            type="submit"
          >
            {passwordMutation.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </section>

      <section aria-labelledby="two-factor-heading" className="rounded-xl border border-border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="two-factor-heading" className="text-xl font-semibold text-balance">
              Two-factor authentication
            </h2>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              Use a TOTP authenticator and keep the recovery codes offline.
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
            {me.two_factor_confirmed
              ? "Active"
              : me.two_factor_enabled
                ? "Setup incomplete"
                : "Disabled"}
          </span>
        </div>

        {twoFactorMessage ? (
          <output className="mt-4 block text-sm text-pretty text-primary" aria-live="polite">
            {twoFactorMessage}
          </output>
        ) : null}

        {!me.two_factor_confirmed && !showSetup ? (
          <form className="mt-5 flex max-w-sm flex-col gap-4" onSubmit={startTwoFactorSetup}>
            <Field
              id="two-factor-current-password"
              autoComplete="current-password"
              errors={twoFactorPasswordError ? [twoFactorPasswordError] : undefined}
              label="Current password"
              name="current_password"
              required
              type="password"
            />
            <Button disabled={enableMutation.isPending} type="submit">
              {me.two_factor_enabled ? "Continue setup" : "Enable two-factor authentication"}
            </Button>
          </form>
        ) : null}

        {setupActive ? (
          <div className="mt-5 grid gap-6 md:grid-cols-[12rem_1fr]">
            <div className="flex size-48 items-center justify-center rounded-lg border border-border bg-white p-2">
              {qr ? (
                // oxlint-disable-next-line nextjs/no-img-element -- The Fortify QR code is an SVG data URL and must not use an image optimizer.
                <img
                  alt="QR code for the authenticator application"
                  className="size-full"
                  src={`data:image/svg+xml,${encodeURIComponent(qr.svg)}`}
                />
              ) : (
                <output className="text-sm text-muted-foreground">Loading QR code…</output>
              )}
            </div>
            <div>
              <p className="text-sm text-pretty text-muted-foreground">
                Scan the QR code, or enter this key manually:
              </p>
              <code
                className="mt-2 block rounded-lg bg-muted p-3 text-sm break-all"
                data-testid="two-factor-secret"
              >
                {secret ?? "Loading…"}
              </code>
              <form className="mt-4 flex max-w-xs flex-col gap-3" onSubmit={confirmTwoFactor}>
                <Field
                  autoComplete="one-time-code"
                  errors={twoFactorErrors["code"]}
                  inputMode="numeric"
                  label="Authentication code"
                  name="code"
                  pattern="[0-9]*"
                  required
                />
                <Button disabled={confirmTwoFactorMutation.isPending} type="submit">
                  {confirmTwoFactorMutation.isPending ? "Confirming…" : "Confirm setup"}
                </Button>
              </form>
            </div>
          </div>
        ) : null}

        {me.two_factor_confirmed ? (
          <div className="mt-5 flex flex-col gap-5">
            {!showRecoveryCodes ? (
              <form className="flex max-w-sm flex-col gap-3" onSubmit={showCodes}>
                <Field
                  id="recovery-code-password"
                  autoComplete="current-password"
                  errors={recoveryPasswordError ? [recoveryPasswordError] : undefined}
                  label="Current password"
                  name="recovery_password"
                  required
                  type="password"
                />
                <Button type="submit" variant="outline">
                  Show recovery codes
                </Button>
              </form>
            ) : null}

            {recoveryCodes ? (
              <div>
                <h3 className="font-semibold text-balance">Recovery codes</h3>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">
                  Each code works once. Store them away from this device.
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {recoveryCodes.map((code) => (
                    <li className="rounded-lg bg-muted px-3 py-2 font-mono text-sm" key={code}>
                      {code}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <PasswordActionDialog
                actionLabel="Generate new codes"
                description="The current recovery codes will stop working immediately."
                onConfirm={regenerateCodes}
                passwordId="regenerate-codes-password"
                title="Generate new recovery codes?"
                triggerLabel="Regenerate codes"
              />
              <PasswordActionDialog
                destructive
                actionLabel="Disable two-factor authentication"
                description="Future sign-ins will require only the account password."
                onConfirm={disable}
                passwordId="disable-two-factor-password"
                title="Disable two-factor authentication?"
                triggerLabel="Disable two-factor authentication"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="delete-account-heading"
        className="rounded-xl border border-destructive/30 p-6"
      >
        <h2
          id="delete-account-heading"
          className="text-xl font-semibold text-balance text-destructive"
        >
          Delete account
        </h2>
        <p className="mt-1 max-w-xl text-sm text-pretty text-muted-foreground">
          Permanently delete your identity, Tasks and account data. This action cannot be undone.
        </p>
        <div className="mt-5">
          <PasswordActionDialog
            destructive
            actionLabel="Delete account"
            description="Your identity, Tasks and account data will be permanently deleted. This cannot be undone."
            onConfirm={deleteAccount}
            passwordId="delete-account-password"
            title="Delete your account?"
            triggerLabel="Delete account"
          />
        </div>
      </section>
    </>
  );
}
