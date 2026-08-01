# Heavy Route

Use this route only when the user explicitly selects the Heavy route.

## Main-agent ownership

The main agent owns planning, work-package boundaries, integration, Git state, `agent_docs/project_progress.md`, and `agent_docs/latest_session_work.md`. Delegate bounded implementation, testing, and durable documentation without duplicating exhaustive worker analysis.

## Delegation

Use the fewest workers needed. Never have more than **two active subagents concurrently**.

- `executor_luna`: default implementation worker.
- `executor_sol`: exceptional cross-cutting work only; at most one active.
- `tester`: independent testing and defect analysis.
- `doc-writer`: verified durable documentation only.

Start with `executor_luna`. Add `tester` after an implementation handoff unless parallel test research is clearly independent. Add `doc-writer` only after verification. Do not maximize concurrency for its own sake.

Each task capsule must be self-contained and bounded. Include task ID, outcome, ownership, acceptance criteria, source paths, validation, protected areas, and return format. Subagents must not edit Git state or the two main-owned status files.

## Worker lifecycle

Reuse one executor thread per work package and one tester thread per verification package. Production defects found by the tester return to the same executor, then return to the same tester. Replace a worker after two consecutive evidence-free turns. Report blockers with concrete evidence.

## Execution and verification

1. Executor implements a coherent increment and runs the smallest relevant check.
2. Executor repairs scoped failures until self-validation passes or a genuine blocker is evidenced.
3. Tester runs focused checks and the required regression scope.
4. Tester fixes only test or fixture defects; production defects return to the executor.
5. Main agent integrates, reviews critical boundaries, and ensures repository checks run after the final change.
6. Rerun the GitHub Actions checking workflow and Vercel redeployment workflow.

Never weaken assertions, hide failures, or claim an unrun check passed.

## Documentation

Update durable documents only with verified facts. Keep temporary reasoning and raw logs out of `agent_docs/`. At the end, report which specialized workers were called and how many times.

## End-of-session handoff

Run only when the user says `end this session`. Reconcile progress, verification, blockers, pending work, and the next entry point. Commit meaningful changes after final checks.