# Agent Artifact: Custom Date Form Builder Branch

## Branch

```text
agent/custom-date-form-builder
```

## Purpose

This branch contains the complete experimental implementation of a customizable date-invitation form builder. It is intentionally isolated from `main`, which retains the original working date-invitation application.

## What the branch adds

- A new landing page with exactly two primary actions:
  - **Make your own date form**
  - **View Demo**
- A `/demo` route that preserves the original date invitation.
- A `/create` route containing a custom form builder.
- A schema-driven public form route at `/form/[publicId]`.
- Supabase-backed persistence for finalized form configurations.
- Server-side form creation, lookup, validation, and response handling.
- Email delivery for submitted custom forms.
- Tests, type-checking, linting, build checks, and a checking/redeployment workflow.

## Core constraints

The implementation enforces the following limits in both the UI and server-side validation:

- Maximum **3 wizard steps**
- Maximum **10 total form elements** across all steps
- Maximum **12 options** for select or radio fields
- Email configuration contains exactly two properties:
  - `sender`
  - `recipient`
- Step IDs and field IDs must be unique and valid.
- Unsupported field types and extra email properties are rejected.

Supported field types:

```text
text
textarea
select
radio
date
```

## Important routes

| Route | Purpose |
|---|---|
| `/` | Two-option landing page |
| `/demo` | Original date invitation |
| `/create` | Custom date-form builder |
| `/form/[publicId]` | Public saved form wizard |
| `/api/date-forms` | Create a validated form configuration |
| `/api/date-forms/[publicId]` | Retrieve a verified active form |
| `/api/date-forms/[publicId]/responses` | Validate and email submitted answers |

## Persistence model

The branch uses Supabase Postgres and includes migrations under:

```text
supabase/migrations/
```

Primary table:

```text
public.date_forms
```

Important columns:

- `id` — UUID primary key
- `public_id` — random, unique public identifier
- `configuration` — JSONB form configuration
- `created_at` — creation timestamp
- `expires_at` — optional expiration timestamp
- `is_active` — availability flag

Direct anonymous table enumeration is denied. Browser requests use Next.js server routes, which perform database access with a server-only Supabase credential.

## Identifier behavior

Finalizing a form creates a non-guessable identifier similar to:

```text
f_L7x3pQ9mR2kV...
```

The identifier is:

- Visible in `/form/[publicId]`
- Passed to route handlers as an HTTP route parameter
- Returned by the read API through the `x-date-form-id` response header

A browser-supplied `x-date-form-id` header is not treated as authoritative. Server handlers resolve the form again using the URL parameter.

## Email behavior

The custom form configuration stores:

- `email.sender`
- `email.recipient`

The actual SMTP `From` identity remains controlled by the server through:

```text
DATE_RESPONSE_FROM_EMAIL
```

This avoids allowing arbitrary SMTP sender spoofing. The configured sender may be used as a reply/contact address.

## Required environment variables

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
DATE_RESPONSE_FROM_EMAIL
```

Optional GitHub Actions secret:

```text
VERCEL_DEPLOY_HOOK_URL
```

Never expose `SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_` variable or client component.

## Verification commands

```bash
pnpm install
pnpm check
```

`pnpm check` runs:

- Schema regression tests
- TypeScript checking
- ESLint
- Next.js production build

Individual commands are also available:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Current infrastructure state

The code and branch preview can build and deploy, but persistence and custom-form email submission require:

1. A dedicated Supabase project
2. Applied migrations
3. Supabase credentials in the deployment environment
4. Valid SMTP credentials

Without Supabase configuration, the API deliberately returns a clear storage-configuration error instead of silently failing.

## Setup documentation

Detailed human setup instructions are available at:

```text
docs/CUSTOM_DATE_FORM_SETUP.md
```

Read that file before attempting to test form finalization or deploy this branch as production.

## Main branch relationship

`main` does not contain this feature. Its file tree was restored to the state immediately before the custom-form implementation began.

Pre-feature reference commit:

```text
e415b22d7f34818f8946871216ec0a4a8935a094
```

The feature branch should only be merged after Supabase, SMTP, security checks, and end-to-end creation/submission flows have been verified.

## Recommended next-agent checklist

- [ ] Read `docs/CUSTOM_DATE_FORM_SETUP.md`
- [ ] Confirm the active branch is `agent/custom-date-form-builder`
- [ ] Provision or select a dedicated Supabase project
- [ ] Apply all migrations in chronological order
- [ ] Configure local and Vercel environment variables
- [ ] Run `pnpm check`
- [ ] Test `/`, `/demo`, and `/create` at mobile and desktop widths
- [ ] Create a form and verify the generated `/form/[publicId]` link
- [ ] Confirm inactive, expired, malformed, and missing IDs are rejected
- [ ] Confirm response email delivery
- [ ] Run Supabase security and performance advisors
- [ ] Rerun the checking and Vercel redeployment workflow
- [ ] Merge only after the full flow is verified
