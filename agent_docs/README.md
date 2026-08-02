# Project-Scoped Agent Documentation

These documents are the repository's durable context for the Simple Date Asking App. They describe verified architecture, public routes, protected contracts, work-route behavior, and delegation boundaries. Keep them factual and bounded; temporary reasoning and raw command logs do not belong here.

## Route model

Light and Medium work stays with Sol and does not spawn subagents. Heavy work is available only after explicit user delegation and remains under Sol's authority; its bounded Luna assistance is described in [`workflows/heavy_route.md`](workflows/heavy_route.md).

## Native Luna and fallback

Prefer native Luna when the runtime allows the model and effort to be selected. When native selection is unavailable, Sol may use an ephemeral, non-nesting `codex exec` subprocess with an explicit model, effort, sandbox, approval mode, `--ignore-user-config`, and `--ephemeral`; enable live search only when the task needs it. If selection is rejected, Sol works directly.

Do not add persistent Luna TOML configuration to this repository or assume that user-level configuration is activated by committing project files. Every Luna task must have a bounded capsule, exact paths, protected areas, acceptance criteria, validation expectations, and a required return format. Sol independently reviews every Luna report or diff and reruns applicable checks.

## Durable context

- [`project_overview.md`](project_overview.md): verified goals, workflows, architecture, and decisions.
- [`project_core_tech.md`](project_core_tech.md): versions, runtime, contracts, environment names, and CI/deployment facts.
- [`project_structure.md`](project_structure.md): verified layout and ownership boundaries.
- [`project_diary.md`](project_diary.md): verified durable decisions and lessons.
- [`workflows/medium_route.md`](workflows/medium_route.md): Sol-only multi-stage work.
- [`workflows/heavy_route.md`](workflows/heavy_route.md): bounded Luna assistance under Sol authority.
- [`task-template.md`](task-template.md): task capsule format.

`project_progress.md` and `latest_session_work.md` remain Sol-owned status documents. Luna may suggest wording but may not edit them or declare a phase complete.

## Git and release path

Sol fetches `origin`, starts or updates an `agent/<short-kebab-description>` branch from current `main`, stages only intended paths, and publishes through a pull request. The PR check must pass before integration. Production work then uses the main-only manual workflow and verifies its generated deployment URL plus the stable aliases.
