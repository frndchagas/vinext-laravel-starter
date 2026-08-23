# ADR 0009: profile, password and TOTP in core

Status: accepted.
Implementation: complete.

The authentication core includes profile settings, password changes, appearance preferences, User deletion and TOTP two-factor authentication with recovery codes.

Password-reset requests return the same public response for existing and unknown email addresses, with application rate limits for both cases. Changing the login email requires the current password. Laravel notifies the previous address and requires verification of the new one. A successful password change invalidates the current Laravel session before the endpoint returns.

Appearance uses browser storage and a cookie rather than persisted domain state. User deletion requires the current password and permanently removes the identity, its sessions and resources owned only by it. TOTP is available by default, but each User chooses whether to enable it. Configuration and recovery-code management require the current password. Passkeys, social login, SSO and teams remain outside the core. Laravel continues to own identity, sessions and authorization.
