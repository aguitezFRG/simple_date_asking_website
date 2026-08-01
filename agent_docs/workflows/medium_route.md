# Medium Route

Use this route only when the user explicitly selects the Medium route.

The main agent performs the work directly without spawning subagents. Divide work into bounded stages: context loading, targeted inspection, implementation, verification, and final review.

Batch independent read-only inspection and isolated validation where practical. Keep dependent edits, overlapping writes, Git mutations, and checks sharing mutable state sequential.

For durable or multi-session packages, record the bounded plan in `agent_docs/project_progress.md` and reconcile it once after verification. Update durable documentation only for verified architecture, workflow, public behavior, structure, decisions, or usage changes.

Keep changes focused, preserve unrelated work, and never disguise partial work as completion. After the final implementation change, run relevant repository checks, then rerun the GitHub Actions checking workflow and Vercel redeployment workflow.

Run the end-of-session handoff only when the user says `end this session`. Preserve verified status, blockers, pending work, and a clear continuation point.