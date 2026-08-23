# ADR 0015: immutable release pipeline

Status: accepted.
Implementation: complete.

A stable release may publish only from a CI-green commit on `main`. Source and distribution tags are protected, GitHub Releases are immutable, the publisher is idempotent after partial failure, and the generated distribution accepts writes only from that publisher. Public image signing, SBOM and provenance remain deferred until the project distributes container images rather than source snapshots.

The workflow verifies every required job in one complete `main` push run for the exact tagged SHA. It uses a protected distribution environment and publishes the distribution branch and annotated tag atomically. It then requests an update with a Packagist SAFE token and waits until the public metadata maps the release tag to the exact distribution commit. A rerun can repair Packagist without moving either tag. Source and distribution rulesets block tag deletion or replacement, and GitHub makes newly published releases immutable.
