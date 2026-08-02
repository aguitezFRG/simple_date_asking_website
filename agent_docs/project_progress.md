# Project Progress

## Completed package: agent workflow bootstrap

- Publication history: PR #1 added the initial project-scoped agent instructions and document skeleton. PR #2 added the developer/CI interface, PR #4 added protected generated-URL smoke support, and PR #5 finalized the verified project guidance and task capsule.
- Scope: standardize pnpm validation, add pull-request checks and main-only production redeployment, and replace the partial agent scaffolding with a Sol-owned project workflow.
- Protected behavior: no application, UI, API, email, route, database, form, or request-contract changes.
- Repository guidance: `AGENTS.md`, `agent_docs/**`, and the task capsule are intended to be versioned. `.agent-memory/**` remains ignored local planning history.
- Backup: pre-workflow tracked changes are preserved remotely at `backup/pre-workflow-local-2026-08-02` commit `81a93bed3262ce7da790a687c6b481da7a19cb4b`.
- Completion evidence: local `pnpm check`, `git diff --check`, and a fresh read-only Codex instruction-discovery check passed. PR #5's check and Vercel preview succeeded before squash integration.
- Post-integration evidence: main workflow run `30757238274` passed the check, secret validation, prebuilt production deployment, readiness, and protected generated-URL smoke steps. The public stable aliases returned HTTP 200 with the expected invitation and `/date=07-13-2026` content; the team-scoped Vercel alias remains access-protected by design.

## Completed package: custom date-form builder

- Branch: the pre-existing `agent/custom-date-form-builder`, identified from its feature history, routes, migrations, tests, and task artifact, then merged with validated `main` without rewriting its published history.
- Persistence: dedicated Supabase Postgres through server-only pooled `SUPABASE_CONNECTION_STRING`; the Data API remains disabled. Four migrations are applied.
- Verified database behavior: RLS enabled, zero direct `anon`/`authenticated` grants, explicit deny policy present, valid insert/lookup succeeded, invalid email shape hit the check constraint, and smoke rows were deleted. Supabase security and performance advisors both report zero findings.
- Local verification: 33 Vitest tests, lint, typecheck, production build, route HTTP checks, real API create/retrieve/render/invalid-ID checks, and browser builder-to-generated-link flow have passed.
- Deployment preparation: the sensitive `SUPABASE_CONNECTION_STRING` Actions secret exists by name, and the main-only workflow now synchronizes it to Vercel before build and performs temporary-form create/retrieve/cleanup smoke checks.
- Publication evidence: PR #7's required repository check and Vercel preview passed. The refreshed preview passed landing, demo, builder, legacy-date, real create/retrieve/render, opaque-ID, and invalid-ID smoke checks; its temporary row was deleted.
- Repository security: CodeQL default setup is enabled. The first feature-head scan identified two high-severity polynomial-regex findings in email validation; bounded linear checks and focused regression coverage fixed both findings. The final JavaScript/TypeScript, Actions, and CodeQL gates passed.
- Integration: PR #7 was squash-merged as `0d676e4604e66f824e3266f347470ca4d8a812b9` after the repository check, CodeQL, Vercel preview, and full preview persistence smoke passed.
- Production evidence: integrated-main workflow run `30761116303` passed 33 tests, lint, typecheck, build, sensitive Supabase environment synchronization, production deployment, readiness, temporary-form create/retrieve/render/invalid-ID smoke, and row cleanup. Generated deployment `simple-date-asking-website-3rdp74dgg-aguitezfrg-s-projects.vercel.app` became ready and stable aliases `wybmd.cntest.uk`, `wybmd.frgagz.com`, and `simple-date-asking-website.vercel.app` passed the same route and persistence smoke.
- Browser evidence: stable production passed landing choices, View Demo, builder preview, finalization, opaque generated-link rendering, and invalid-link presentation. The exact browser-created row was deleted.
