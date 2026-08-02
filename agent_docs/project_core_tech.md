# Project Core Technology

## Stack and runtime

- Next.js `16.2.9` with the App Router.
- React and React DOM `19.2.4`.
- TypeScript `5`.
- Tailwind CSS `4` through the Tailwind PostCSS integration.
- Nodemailer `8` for SMTP delivery from the Node.js API runtime.
- pnpm `10.34.5`; local Node.js is `>=20.9`, while CI uses Node.js `22`.

The application is server-rendered through App Router pages, with the invitation interaction implemented as a client component. `POST /api/submit-date` explicitly uses the Node.js runtime because it sends email with Nodemailer.

## Public and operational contracts

Date tokens use `MM-DD-YYYY`. Valid calendar dates are formatted for display; invalid or missing tokens use the default display date. The response API accepts recipient email, respondent email, lunch place, and activity, validates required fields, and sends two messages through SMTP.

SMTP configuration uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `DATE_RESPONSE_FROM_EMAIL`. Values are secrets and must never appear in source, documentation, logs, or reports.

The package scripts are `dev`, `build`, `start`, `lint`, `typecheck`, and `check`. `pnpm check` runs lint, typecheck, and build. There is no formatter and no automated test suite; documentation must report that limitation honestly.

## CI and deployment

`.github/workflows/check-and-vercel-redeploy.yml` installs with the locked pnpm version and frozen lockfile, then runs `pnpm check` on pull requests targeting `main`. A manual `workflow_dispatch` from `main` runs the same check before production deployment. Deployment requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets and performs a generated-URL smoke check.

Protected technical contracts and foundational technology decisions belong here. Edit only when explicitly requested and only with verified repository evidence.
