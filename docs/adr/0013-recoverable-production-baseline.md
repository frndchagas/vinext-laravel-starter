# ADR 0013: recoverable production baseline

Status: accepted.
Implementation: complete.

The supported production reference must fail closed on unknown Host authorities, restrict WebSockets to the canonical host, include coherent health and readiness checks, and prove the standalone browser path. Executable PostgreSQL dump and restore scripts, an automated restore round-trip, and a managed-service recipe complete the baseline. It remains a regular Compose deployment without a zero-downtime guarantee, full observability platform or automated disaster-recovery system.
