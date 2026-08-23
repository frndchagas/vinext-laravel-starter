# Authentication and authorization

## Current behavior

Laravel is the only identity source. Fortify handles registration, login, logout, password reset, email verification, profile settings, password changes and TOTP. Sanctum authenticates the first-party SPA with a session cookie and CSRF protection. The interface also stores a per-browser appearance preference.

The application consumes these versioned routes:

- registration, login and logout;
- forgot-password and reset-password;
- signed email verification and verification resend;
- profile, password confirmation, password update and Account deletion;
- TOTP setup, confirmation, recovery codes, disablement and login challenge;
- `GET /api/v1/auth/capabilities` for public deployment choices;
- `GET /api/v1/me` for the current User.

`GET /sanctum/csrf-cookie` is contracted but called by the session fetcher rather than a product hook. `POST /api/broadcasting/auth` is owned and called directly by Echo.

## Verification and access

Registration is controlled by `FEATURE_REGISTRATION` and defaults to disabled in the production reference. The public capabilities response keeps the login and registration screens aligned with Laravel. A newly registered User receives the `member` role and must verify their email before accessing Tasks or private channels.

Login and TOTP challenges allow five attempts per minute. Registration and password-reset requests allow five attempts per normalized email and IP, with an additional limit of twenty attempts per IP. Limited requests return a documented `429` Problem Details response with `Retry-After`.

The forgot-password endpoint returns the same `200` response for existing and unknown email addresses. Malformed addresses still return validation errors. Laravel timeboxes valid requests so the public response does not reveal whether a User exists.

The `admin` and `member` roles are persisted by an idempotent seeder and returned by `/api/v1/me`. The `users.view` and `users.manage` permissions protect the versioned User administration API. Task access remains enforced by ownership Policy.

The first admin is promoted explicitly:

```bash
cd apps/api
php artisan app:grant-admin user@example.com
```

An authorized admin can search and cursor-page through User identity and role metadata, then promote or demote another User. Admins cannot change their own role or demote the Last admin. The API does not expose TOTP details or allow one User to delete another.

Changing the login email requires the current password. Laravel notifies the previous address, stores the new address as unverified and sends a verification link to it. Name-only profile updates do not require the password.

## Sessions and realtime

Echo authorizes every private subscription through the same Laravel session. Logout disconnects Echo. Reconnection requires fresh channel authorization and then refetches persisted state.

Changing the account password logs out the Laravel guard and invalidates the current Sanctum session before the endpoint returns. The interface clears its cached identity and realtime connection, then returns the User to login with a confirmation message.

Account deletion requires the current password. It permanently removes the User, active sessions, tokens, roles, Tasks, idempotency records and pending password-reset record. The interface returns to login after completion.

## Appearance

The interface supports system, light and dark appearance. The preference is stored in localStorage for the browser and in a cookie for server rendering. It is not persisted as User or domain state.

## Two-factor authentication

Each User decides whether to enable TOTP. Enabling, viewing recovery codes, regenerating codes and disabling TOTP require the current password. Setup is not active until the User confirms a valid code from an authenticator application.

Recovery codes are shown after confirmation and can be regenerated. Each code works once. A login that returns `two_factor: true` continues through the versioned challenge endpoint with either a TOTP code or one recovery code.

Passkeys, social login, SSO and teams remain outside the core.
