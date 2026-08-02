# Project Core Technology

## Stack and runtime

- Next.js `16.2.9` with the App Router.
- React and React DOM `19.2.4`.
- TypeScript `5`.
- Tailwind CSS `4` through the Tailwind PostCSS integration.
- Nodemailer `8` for SMTP delivery from the Node.js API runtime.
- Postgres.js `3` for server-only pooled connections to Supabase Postgres.
- Supabase JS `2.111.0` and Supabase SSR `0.12.4` for trusted cookie-based creator email verification.
- Vitest `4`, jsdom, and Testing Library for schema, UI, route, and storage regression tests.
- pnpm `10.34.5`; local Node.js is `>=22.22.2`, while CI uses Node.js `22`.

The application is server-rendered through App Router pages, with the invitation and builder interactions implemented as client components. Database and email route handlers explicitly use the Node.js runtime.

## Public and operational contracts

Date tokens use `MM-DD-YYYY`. Valid calendar dates are formatted for display; invalid or missing tokens use the default display date. The demo is presentation-only and its shared configuration can be cloned into the builder.

Custom form definitions are version 2 JSONB rows in `public.date_forms`. Private columns associate a verified Supabase Auth user/email and immutable three-day expiration. Direct `anon` and `authenticated` access remains denied; Next.js server routes mediate public rendering and submission. `pg_cron` invokes a private hourly cleanup function. SMTP delivers one response to the private creator destination; respondent email is body and Reply-To data, never a destination chosen by the browser.

The package scripts are `dev`, `build`, `start`, `lint`, `typecheck`, `test`, and `check`. `pnpm check` runs Vitest, lint, typecheck, and build. There is no formatter or configured end-to-end runner; browser smoke evidence remains separate.

## CI and deployment

`.github/workflows/check-and-vercel-redeploy.yml` installs with the locked pnpm version and frozen lockfile, then runs `pnpm check` on pull requests targeting `main`. A manual `workflow_dispatch` from `main` runs the same check before production deployment. Deployment also synchronizes the pooled connection, Supabase project URL, and publishable Auth key to Vercel Production and Preview, then performs one non-mutating generated-URL smoke check.

Protected technical contracts and foundational technology decisions belong here. Edit only when explicitly requested and only with verified repository evidence.
