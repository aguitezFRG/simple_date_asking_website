# Project Diary

## Verified decisions

- The application uses Next.js App Router pages for both the root invitation and a date-segment invitation, while the root query parameter remains supported for shareable links.
- Date parsing is centralized in `app/display-date.ts`; malformed and impossible calendar dates resolve to the default display date instead of changing the public route contract.
- The response endpoint uses the Node.js runtime and Nodemailer. It sends separate recipient and respondent messages and keeps SMTP values in environment variables.
- The project uses `pnpm check` as its consolidated validation command. It runs Vitest, lint, typecheck, and build. There is no formatter or configured end-to-end runner.
- Custom form persistence uses a dedicated Supabase Postgres project through the pooled server-only connection string. The Data API remains disabled; browsers never receive database credentials or access tables directly.
- Saved definitions use schema version 1 JSONB and random 24-character base64url identifiers prefixed with `f_`. Database UUIDs are not exposed.
- Direct `anon` and `authenticated` table privileges are revoked, RLS is enabled, and an explicit restrictive deny policy provides defense in depth; trusted Next.js server routes use the server-only pooled connection.
- Email syntax validation uses bounded linear string checks. CodeQL default setup scans JavaScript/TypeScript and Actions changes and guards `main` without applying the entire protected-main ruleset to writable `agent/*` branches.
- Pull requests to `main` run the repository check workflow. Production redeployment is a main-only manual dispatch that depends on the check job and Vercel secrets.
- Vercel repository secrets are scoped to the individual validation and CLI steps. The workflow validates and smoke-checks the generated deployment URL; Sol separately verifies the stable production alias.
- Generated Vercel deployment URLs can be protected even for production deployments. Smoke tests retrieve the configured automation-bypass value through the authenticated project API, use it only in request headers, and never print or persist it; stable production aliases are verified separately.
- Project-scoped agent documentation retains Light, Medium, and explicitly delegated Heavy routes. Light and Medium are Sol-only; Heavy permits bounded Luna assistance under Sol review. No persistent Luna TOML is stored in this repository.
- Work branches use `agent/<short-kebab-description>`, start from the latest fetched `origin/main`, and are published through pull requests rather than direct commits to `main`. Existing genuine task branches are reused and updated without discarding local work.
- Creator publication trusts Supabase Auth `getUser()` and `email_confirmed_at`; browser-supplied identity, destination, verification, and timestamps are rejected. Verified sessions are reusable and no account dashboard or URL recovery is provided.
- Schema version 2 excludes creator email from public configuration and models required respondent email separately. The demo uses the same reusable preset but remains presentation-only because it has no verified creator destination.
- Database triggers stamp exact three-day `timestamptz` expiration. A private, non-public `pg_cron` function deletes expired forms hourly, logs successful counts, and relies on cron run details for failures.

Record only verified architecture decisions, discarded approaches, and lessons here. Do not use this diary as a live status log; active state belongs in the Sol-owned status documents.
