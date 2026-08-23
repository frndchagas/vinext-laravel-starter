# Security policy

## Configure reporting before launch

This application snapshot does not choose a security contact for your product. Before exposing it to users, configure a private reporting channel, state which deployed versions receive fixes and replace this section with the response policy your team can support.

Do not ask reporters to open a public issue. GitHub private vulnerability reporting is a suitable default when it is enabled for the application repository. Reports must never include real credentials, personal data or production records.

## Starter and application reports

The application owner is responsible for vulnerabilities introduced after installation, deployment configuration and product data. Do not send those reports or records to the starter maintainers.

If a vulnerability is reproducible in an unmodified snapshot, report it privately to [Vinext Laravel Starter](https://github.com/frndchagas/vinext-laravel-starter/security). Include the values from `.source-tag` and `.source-commit`, the impact, minimal reproduction steps and any suggested mitigation. Remove application credentials and data first.

Upstream framework or dependency vulnerabilities should also be reported to the affected project. Report an integration issue to the starter only when the unchanged snapshot exposes or amplifies it.
