# Simple Date Asking App

A small Next.js App Router site for building or viewing a shareable date invitation. `/` offers a custom builder and the original demo. Legacy dates remain available in the `MM-DD-YYYY` format:

- `/?date=MM-DD-YYYY`
- `/date=MM-DD-YYYY`

The original response form posts to `/api/submit-date`. Custom forms are built at `/create`, stored in Supabase Postgres, shared as `/form/f_<opaque-id>`, and submit through their identifier-scoped response route. Both modes send confirmation email through SMTP.

## Getting Started

Requirements: Node.js `>=22.22.2` locally and pnpm `10.34.5`.

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. For a local email-enabled setup, copy `.env.example` to `.env.local` and fill in the SMTP settings described below. Never commit `.env.local` or expose its values.

## Environment

The API reads these server-side variables:

- `SUPABASE_CONNECTION_STRING`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `DATE_RESPONSE_FROM_EMAIL`

Do not publish the values. The connection string must use the dedicated Supabase project's pooled Postgres endpoint. The Supabase Data API and browser-side database keys are not used.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

`pnpm check` runs Vitest, lint, typecheck, and build. There is no formatter or configured end-to-end runner; browser and deployment smoke checks are run separately.

## Deployment

The workflow at `.github/workflows/check-and-vercel-redeploy.yml` runs checks for pull requests targeting `main`. Production redeployment is started with `workflow_dispatch` from `main` only, after the check job succeeds. The GitHub repository must provide `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and sensitive `SUPABASE_CONNECTION_STRING` secrets. The workflow synchronizes the connection string to Vercel Production and Preview before building; SMTP variables remain configured directly in Vercel.

Vercel's Git integration may already deploy a merge to `main`. The manual workflow intentionally performs a final checked CLI deployment from the merged commit, waits for readiness, and smoke-checks `/` and `/date=07-13-2026`.
After that workflow passes, verify the same routes on the stable production alias before declaring deployment complete.
