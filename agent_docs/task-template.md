# Luna Task Capsule

Use this template for a bounded Heavy-route Luna task. Sol owns dispatch, integration, validation, Git state, deployment, and completion decisions.

## Request

- Task ID: `...`
- Outcome: `...`
- Luna effort and justification: `...`
- Sandbox mode: `workspace-write` / `read-only`
- Approval: `never` / `...`
- Exact writable paths, or `none` for read-only work: `...`
- Source paths to inspect: `...`

## Acceptance criteria

- `...`
- `...`
- `...`

## Protected areas

Do not modify application code, technical or infrastructure configuration, package files, lockfiles, Actions, environment files or values, generated output, `.env*`, `.next/`, `node_modules/`, `next-env.d.ts`, `*.tsbuildinfo`, `project_progress.md`, or `latest_session_work.md` unless Sol explicitly assigns a permitted documentation scope. Preserve unrelated and untracked user files. Do not stage, commit, push, open or merge a PR, deploy, run smoke tests as owner, or declare completion.

## Validation evidence

State the checks that are in scope. Report each actual command, result, and limitation. Do not claim tests, formatting, workflow runs, deployment, or live verification unless they were actually run; Sol reruns applicable checks and owns the final evidence.

## Return format

Return a concise report containing:

1. Outcome and files changed.
2. Evidence from inspection or checks actually performed.
3. Uncertainty, blockers, and any follow-up needed from Sol.
4. A statement that the work is advisory until Sol reviews the report and diff.
