# Heavy Route

Use this route only when the user explicitly delegates the Heavy route. Heavy is an orchestration mode, not a transfer of authority: Sol remains the owner of the plan, integration, validation, Git state, deployment, and completion decision.

## Sol authority

Sol exclusively owns technical, application, infrastructure, package, workflow, test, validation, Git, secrets, deployment, live-verification, and completion decisions. Luna can explore, research, synthesize, review, or draft durable documentation. Luna can edit documentation only when the task explicitly assigns an isolated low-risk documentation change.

Luna never owns application implementation, packages or lockfiles, Actions, deployment configuration, environment variables, test fixes, validation, Git/PR/merge, secrets, deployment, smoke tests, phase completion, `project_progress.md`, or `latest_session_work.md`.

Begin with one bounded read-only context stage for `project_overview.md`, `project_structure.md`, `project_progress.md`, and `latest_session_work.md`, then inspect only the smallest relevant source surface. Do not edit the two status documents for ordinary work.

## Bounded Luna assistance

- Use the fewest Luna tasks needed and never more than two concurrently. Normally, only independent read-only tasks run concurrently; a writable documentation assignment runs alone with exact, non-overlapping paths.
- Prefer read-only exploration, research, synthesis, log summarization, task-capsule drafting, or advisory review. A documentation edit must be isolated, explicitly assigned, and limited to exact paths.
- Each capsule must include task ID, outcome, Luna effort and justification, sandbox and approval mode, exact writable paths, acceptance criteria, protected areas, validation expectations, and return format.
- Select effort proportionately: Low for mechanical summaries, Medium for ordinary isolated analysis, High for cross-cutting work, and Max only for unusually complex, contradictory, or security-sensitive evidence. Luna supports efforts through Max, but Max is never the default.
- Prefer native Luna when model and effort can be selected. Otherwise use an ephemeral, non-nesting `codex exec` fallback with explicit model, effort, sandbox, approval, `--ignore-user-config`, and `--ephemeral`; use live search only when needed.
- Do not create persistent Luna TOML configuration. If selection is rejected, Sol works directly.

Sol dispatches a bounded capsule, receives a report or diff, independently reviews it, and decides whether to integrate it. Luna may run a small self-check inside its capsule, but that evidence remains advisory. Luna reports uncertainty, blockers, touched paths, and evidence; silence or an unverified claim is not completion. Failure-analysis assignments remain read-only by default, and Sol diagnoses the evidence independently, implements every fix, and reruns affected checks.

## Verification and handoff

Sol runs the applicable repository checks after integration and reports actual results. For application or package changes, `pnpm check` runs lint, typecheck, and build. There is no formatter and no automated test suite. When publication is requested, Sol requires the pull-request check to pass before merge; when deployment is in scope, Sol dispatches the production workflow from merged `main` and performs live verification.

Luna does not validate deployments, run smoke tests as owner, edit Git state, stage or commit files, open or merge PRs, or update the Sol-owned status documents. Sol reviews every Luna report/diff and makes the phase and completion decisions.

Keep shared-state edits, checks, Git mutations, workflow runs, and deployment actions sequential. Preserve unrelated work and stop at the assigned boundary.

## Protected areas

Preserve `.env*`, `.next/`, `node_modules/`, `next-env.d.ts`, `*.tsbuildinfo`, generated assets, `pnpm-lock.yaml` unless dependencies change, and all unrelated or untracked user files. Next.js code or configuration changes require reading the relevant local guidance under `node_modules/next/dist/docs/` first.

## End of session

Run the handoff only when the user says `end this session`. Reconcile verified progress, verification evidence, blockers, pending work, and the next entry point. Commit meaningful changes only under Sol's authority.
