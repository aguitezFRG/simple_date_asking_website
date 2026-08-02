<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Simple Date Asking App — Agent Workflow

## Project context

This repository contains the Simple Date Asking App, a small Next.js App Router application for sharing a date invitation and emailing the response. Keep changes focused, modular, accessible, responsive, and compatible with the existing public behavior unless the user explicitly requests a contract change.

Before changing code, read `.agent-memory/plans.md`, `.agent-memory/changelog.md`, and `.agent-memory/preferences.md`. These ignored files hold local planning history and preferences; update them when plans, decisions, implemented behavior, or verification evidence changes.

Durable project context belongs in `agent_docs/`. Read the relevant overview, core technology, structure, and diary documents before broad work. `project_progress.md` and `latest_session_work.md` are Sol-owned status records.

## Routes and work routes

The user-selected work route remains active for the session; default to Light when none is specified.

- Light: Sol performs small, bounded tasks directly; do not spawn subagents.
- Medium: Sol performs broad, multi-stage work directly using `agent_docs/workflows/medium_route.md`; do not spawn subagents.
- Heavy: use only when the user explicitly delegates it, following `agent_docs/workflows/heavy_route.md`.

The public routes are `/`, `/?date=MM-DD-YYYY`, `/date=MM-DD-YYYY` through `app/[dateParam]/page.tsx`, and `POST /api/submit-date`.

## Authority and delegation

Sol exclusively owns technical, application, infrastructure, package, workflow, test, validation, Git, secrets, deployment, live-verification, and completion decisions. Luna may explore, synthesize, review, or draft documentation, and may make an explicitly assigned isolated low-risk documentation edit. Luna does not own implementation, packages or lockfiles, Actions, deployment configuration, environment variables, test fixes, validation, Git/PR/merge, secrets, deployment, smoke tests, phase completion, `project_progress.md`, or `latest_session_work.md`. Heavy-route work may have at most two active Luna tasks, normally concurrent only when both are independent and read-only.

## Validation and deployment

After every implementation task, Sol runs the relevant repository checks and reports actual results; never claim an unrun check passed. The consolidated local check is `pnpm check`, which runs lint, typecheck, and build. There is no formatter and no automated test suite.

The workflow runs checks for pull requests targeting `main`. A `workflow_dispatch` deployment is main-only, runs after checks, and requires the repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. SMTP configuration uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `DATE_RESPONSE_FROM_EMAIL`; never expose their values.

Sol owns Git state, staging, commits, branches, PRs, merges, and release/deployment actions. Stage intended paths explicitly, preserve unrelated or untracked user files, and never default to `git add -A`. Pull requests to `main` must pass the check job before merge. When deployment is in scope, dispatch the production workflow from the merged `main` branch and verify both the generated deployment URL and stable production alias.

Start work from the latest fetched `origin/main` and use `agent/<short-kebab-description>` branches. Reuse an existing genuine task branch instead of creating a duplicate. Do not commit directly to `main`; update a task branch onto current `main` without discarding uncommitted work, then publish it through a pull request.

## Protected artifacts

Preserve `.env*`, `.next/`, `node_modules/`, `next-env.d.ts`, `*.tsbuildinfo`, generated assets, and `pnpm-lock.yaml` unless dependencies change. Do not modify package metadata, the workflow, application code, environment files, generated output, or user-level configuration during documentation-only work.

When changing Next.js code or configuration, read the relevant local guidance under `node_modules/next/dist/docs/` first and follow its deprecation notices.

## Session handoff

Run the handoff only when the user says `end this session`. Reconcile verified progress, update durable documents where warranted, preserve a clear continuation point, and commit meaningful changes under Sol's authority.
