# ADR 0015: immutable release pipeline

Status: accepted.
Implementation: complete.

A stable release may publish only from a CI-green commit on `main`. Source and distribution tags are protected, GitHub Releases are immutable, the publisher is idempotent after partial failure, and the generated distribution accepts writes only from that publisher. Public image signing, SBOM and provenance remain deferred until the project distributes container images rather than source snapshots.

The workflow verifies every required job in one complete `main` push run for the exact tagged SHA. It uses a protected `distribution` environment containing only the deploy key and publishes the distribution branch and annotated tag atomically. A separate `packagist` environment contains only the SAFE token used to request an update and wait until the public metadata maps the release tag to the exact distribution commit. A manual job can repair the Packagist index for an existing immutable release after verifying both repositories; that job has no Git write path or deploy key. Source and distribution rulesets block tag deletion or replacement, and GitHub makes newly published releases immutable.
