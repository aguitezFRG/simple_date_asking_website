# Agent Artifact: Custom Date Form Builder

## Branch and purpose

The genuine task branch is:

```text
agent/custom-date-form-builder
```

It was identified from its 25 feature commits, custom routes, migrations, tests, and this task artifact, then updated non-destructively from the validated `main` workflow bootstrap.

## Implemented surface

- `/` — exactly two primary choices: **Make Your Own Date Form** and **View Demo**.
- `/demo` — the original invitation without custom configuration or database creation.
- `/create` — editor for adding, editing, removing, reordering, and assigning elements across steps.
- `/form/[publicId]` — stored public wizard with unavailable/error states.
- `/api/date-forms` — server-validated creation.
- `/api/date-forms/[publicId]` — active, unexpired retrieval.
- `/api/date-forms/[publicId]/responses` — stored-schema answer validation and SMTP delivery.

The builder enforces three steps, ten total elements, twelve options per select/radio element, unique identifiers, supported element types, and exactly `sender` plus `recipient` email configuration. A valid preview is required before finalization.

## Persistence and access

The dedicated Supabase Postgres project is accessed through server-only `SUPABASE_CONNECTION_STRING` using Postgres.js. The Data API remains disabled. The pooled client uses at most one connection per serverless instance, disables prepared statements for transaction-pooler compatibility, and applies idle/connect timeouts.

Migrations in `supabase/migrations/` create and harden `public.date_forms`. Definitions are immutable through the public application, stored as validated schema-version-1 JSONB, and revalidated on read. RLS is enabled and direct `anon`/`authenticated` privileges are revoked.

Public identifiers are 18 random bytes encoded as 24 base64url characters with an `f_` prefix. Database UUIDs are never exposed. The URL route parameter is authoritative; client-supplied identifier headers are ignored.

The data model includes `is_active` and optional `expires_at`, and retrieval rejects disabled or expired records. No administration UI is included.

## Environment

Runtime:

```text
SUPABASE_CONNECTION_STRING
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
DATE_RESPONSE_FROM_EMAIL
```

GitHub deployment:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SUPABASE_CONNECTION_STRING
```

Never expose or log values. No browser-side Supabase key and no deploy-hook secret are required.

## Validation

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm check
git diff --check
```

Vitest covers schema limits, email restrictions, invalid definitions and answers, creation and retrieval routes, opaque identifiers, saved-form rendering, builder operations, demo/default regressions, storage configuration, and database access-control migration intent. Browser and live database checks remain separate evidence.

See `docs/CUSTOM_DATE_FORM_SETUP.md` for the ordered setup, migration, validation, and deployment procedure.
