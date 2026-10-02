# ADR 0013: recoverable production baseline

Status: accepted.
Implementation: complete.

The supported production reference must fail closed on unknown Host authorities, restrict WebSockets to the canonical host, include coherent health and readiness checks, and prove the standalone browser path. Executable PostgreSQL dump and restore scripts, an automated restore round-trip, and a managed-service recipe complete the baseline. It remains a regular Compose deployment without a zero-downtime guarantee, full observability platform or automated disaster-recovery system.

The PostgreSQL runtime rebuilds upstream `gosu` with the maintained Go toolchain. Trivy scans the resulting binary without exceptions for the standard library bundled in the official image.

The production Redis runtime retains the pinned official Redis binary and Alpine base, with OpenSSL security packages updated during its build. This lets the runtime pass the same Trivy policy when upstream has not rebuilt its pinned image after an Alpine security fix.
