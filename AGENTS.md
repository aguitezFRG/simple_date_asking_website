<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Agent Workflow

## Project context

This repository contains the Simple Date Asking App. Keep changes focused, modular, accessible, responsive, and compatible with the existing public behavior unless the user explicitly requests a contract change.

## Required completion checks

After every implementation task:

1. Run the repository's relevant checks.
2. Rerun the GitHub Actions checking workflow.
3. Rerun the Vercel redeployment GitHub Actions workflow.
4. Report actual results; never claim an unrun check passed.

## Routes

The route selected by the user remains active for the session. Default to the Light route when none is specified.

- **Light route:** perform small, bounded tasks directly. Do not spawn subagents.
- **Medium route:** perform a broad or multi-stage task directly using `agent_docs/workflows/medium_route.md`. Do not spawn subagents.
- **Heavy route:** orchestrate specialized workers using `agent_docs/workflows/heavy_route.md`.

## Heavy-route concurrency

Never have more than **two subagents active concurrently**. Use the fewest workers needed. Keep at most one `executor_sol` active. Start with `executor_luna`; add `tester` only when independent verification or failure analysis is useful. Use `doc-writer` only for verified durable documentation changes.

## Project documentation

Durable agent state lives under `agent_docs/`:

- `project_overview.md`
- `project_core_tech.md`
- `project_structure.md`
- `project_progress.md`
- `project_diary.md`
- `latest_session_work.md`

Only edit `project_progress.md` and `latest_session_work.md` for deployment-state work or when explicitly requested. Never delete a main project document without warning and a second explicit confirmation.

## Context loading

For Light-route work, inspect only files relevant to the task. On first entering Medium or Heavy route, read overview, structure, progress, and latest-session documents in one bounded read-only stage, then inspect the smallest relevant source and test surface.

## Tool execution

Batch independent read-only inspection and isolated checks where practical. Keep dependent operations, overlapping writes, Git mutations, shared-state builds/tests, worker lifecycle actions, and deployment actions sequential.

## End-of-session handoff

Run the handoff only when the user says `end this session`. Reconcile verified progress, update durable documents where warranted, preserve a clear continuation point, and commit meaningful changes.