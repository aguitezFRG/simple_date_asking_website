# Medium Route

Use this route only when the user explicitly selects the Medium route. Sol performs the work directly; Medium never spawns Luna or any other subagent.

## Stages

1. Load `project_overview.md`, `project_structure.md`, `project_progress.md`, and `latest_session_work.md` in one bounded read-only context stage, then read the relevant core-technology and diary entries. Do not edit the two status documents for ordinary work.
2. Inspect the smallest relevant source, configuration, workflow, and documentation surface. If changing Next.js code or configuration, read the relevant guidance under `node_modules/next/dist/docs/` first.
3. Implement the bounded request directly, preserving routes, SMTP variable names, accessibility, and unrelated user changes.
4. Run the relevant local checks. For application or package changes, use `pnpm check` unless a narrower check is justified; report the actual result.
5. Publish through a pull request when requested and require the check job in `.github/workflows/check-and-vercel-redeploy.yml` to pass before merge. When deployment is in scope, dispatch its production job from merged `main` and perform live verification. Sol owns every external workflow, deployment, and live-verification action.
6. Review the final diff and confirm that protected artifacts, status docs, and unrelated files were not changed.

Batch independent read-only inspection and isolated checks where practical. Keep dependent edits, overlapping writes, Git mutations, shared-state builds/checks, and deployment actions sequential.

Keep changes focused and never disguise partial work as completion. Update durable documentation only for verified architecture, workflow, public behavior, structure, decisions, or usage changes. `project_progress.md` and `latest_session_work.md` remain Sol-owned status records.

Sol owns technical implementation, validation, Git state, PRs, merges, secrets, deployment, live verification, and the completion decision. Workers are not used on this route.

Run the end-of-session handoff only when the user says `end this session`. Preserve verified status, blockers, pending work, and a clear continuation point under Sol's authority.
