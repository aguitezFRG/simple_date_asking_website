# Simple Date Asking App

A small Next.js App Router site for sharing a date invitation. The invitation is available at `/`, with optional date links in the `MM-DD-YYYY` format:

- `/?date=MM-DD-YYYY`
- `/date=MM-DD-YYYY`

The response form posts to `/api/submit-date` and sends confirmation email through SMTP.

## Getting Started

Requirements: Node.js `>=20.9` locally and pnpm `10.34.5`.

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. For a local email-enabled setup, copy `.env.example` to `.env.local` and fill in the SMTP settings described below. Never commit `.env.local` or expose its values.

## Environment

The API reads these server-side variables:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `DATE_RESPONSE_FROM_EMAIL`

Do not publish the values. The SMTP variables must also be configured in the production environment for deployed email delivery.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm check
```

`pnpm check` runs lint, typecheck, and build. There is no formatter and no automated test suite in this repository, so no test or formatter result should be claimed.

## Deployment

The workflow at `.github/workflows/check-and-vercel-redeploy.yml` runs checks for pull requests targeting `main`. Production redeployment is started with `workflow_dispatch` from `main` only, after the check job succeeds. The GitHub repository must provide `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets, and production SMTP variables must be configured in Vercel.

Vercel's Git integration may already deploy a merge to `main`. The manual workflow intentionally performs a final checked CLI deployment from the merged commit, waits for readiness, and smoke-checks `/` and `/date=07-13-2026`.
After that workflow passes, verify the same routes on the stable production alias before declaring deployment complete.
