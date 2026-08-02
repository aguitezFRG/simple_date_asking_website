# Project Core Technology

## Stack and runtime

- Next.js `16.2.9` with the App Router.
- React and React DOM `19.2.4`.
- TypeScript `5`.
- Tailwind CSS `4` through the Tailwind PostCSS integration.
- Nodemailer `8` for SMTP delivery from the Node.js API runtime.
- Postgres.js `3` for server-only pooled connections to Supabase Postgres.
- Vitest `4`, jsdom, and Testing Library for schema, UI, route, and storage regression tests.
- pnpm `10.34.5`; local Node.js is `>=22.22.2`, while CI uses Node.js `22`.

The application is server-rendered through App Router pages, with the invitation and builder interactions implemented as client components. Database and email route handlers explicitly use the Node.js runtime.

## Public and operational contracts

Date tokens use `MM-DD-YYYY`. Valid calendar dates are formatted for display; invalid or missing tokens use the default display date. The response API accepts recipient email, respondent email, lunch place, and activity, validates required fields, and sends two messages through SMTP.

Custom form definitions are immutable, versioned JSONB rows in `public.date_forms`. The application reaches the dedicated Supabase project through server-only `SUPABASE_CONNECTION_STRING`; direct `anon` and `authenticated` table privileges are revoked and the Data API is not required. SMTP configuration uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `DATE_RESPONSE_FROM_EMAIL`. Values are secrets and must never appear in source, documentation, logs, or reports.

The package scripts are `dev`, `build`, `start`, `lint`, `typecheck`, `test`, and `check`. `pnpm check` runs Vitest, lint, typecheck, and build. There is no formatter or configured end-to-end runner; browser smoke evidence remains separate.

## CI and deployment

`.github/workflows/check-and-vercel-redeploy.yml` installs with the locked pnpm version and frozen lockfile, then runs `pnpm check` on pull requests targeting `main`. A manual `workflow_dispatch` from `main` runs the same check before production deployment. Deployment requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets and performs a generated-URL smoke check.

Protected technical contracts and foundational technology decisions belong here. Edit only when explicitly requested and only with verified repository evidence.
