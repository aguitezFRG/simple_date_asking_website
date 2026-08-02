# Project Progress

## Package: complete agent workflow bootstrap

- Publication history: PR #1 added the initial project-scoped agent instructions and document skeleton. PR #2 added the developer/CI interface, and PR #4 added protected generated-URL smoke support.
- Scope: standardize pnpm validation, add pull-request checks and main-only production redeployment, and replace the partial agent scaffolding with a Sol-owned project workflow.
- Protected behavior: no application, UI, API, email, route, database, form, or request-contract changes.
- Repository guidance: `AGENTS.md`, `agent_docs/**`, and the task capsule are intended to be versioned. `.agent-memory/**` remains ignored local planning history.
- Backup: pre-workflow tracked changes are preserved remotely at `backup/pre-workflow-local-2026-08-02` commit `81a93bed3262ce7da790a687c6b481da7a19cb4b`.
- Required completion evidence: frozen install when dependencies need refreshing, `pnpm check`, `git diff --check`, a fresh read-only instruction-discovery check, pull-request checks, a merged-main production workflow dispatch, generated-deployment smoke checks, and stable-alias smoke checks.
- Prior external evidence: merged-main workflow run `30756533338` passed the check, prebuilt production deployment, readiness, and protected generated-URL smoke steps for commit `0c0c3eb51d38b3a35ffa1ecade073e4faa8425fb`. A later bootstrap publication must produce fresh evidence before it is declared complete.
