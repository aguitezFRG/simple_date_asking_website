# Agent Workflow Setup

This repository adopts the project-scoped workflow pattern from `viettran-edgeAI/codex_workflows`.

The committed files configure Light, Medium, and Heavy routes and durable project documentation. The upstream specialized agent TOML files (`executor_luna`, `executor_sol`, `tester`, and `doc-writer`) are user-level Codex configuration and cannot be activated merely by committing them to this repository.

To enable those workers on a development machine, copy the upstream TOML files into `~/.codex/agents/` (or `$HOME\.codex\agents\` on Windows), then restart Codex. Do not overwrite existing agent definitions without reviewing or merging them.

Project customization: the Heavy route permits no more than two active subagents at once and keeps the one-`executor_sol` limit.