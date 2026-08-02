# Simple Date Asking App

A Next.js App Router application for previewing a date invitation and publishing a shareable custom form. The public routes are `/`, `/demo`, `/create`, `/form/[publicId]`, and the legacy `/date=MM-DD-YYYY` route. A legacy `date` query on `/` is carried into `/demo`.

The demo is presentation-only: it never sends email or creates a database row. **Use Demo Form** deep-clones the shared preset into the normal editable builder. Published custom forms require a verified Supabase Auth email, deliver responses to that private creator email, expire exactly three days after creation, and are deleted by an hourly database job.

## Local setup

Requirements: Node.js `>=22.22.2` and pnpm `10.34.5`.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. Never commit `.env.local` or print its values.

## Environment and secret boundaries

Server-only runtime values:

- `SUPABASE_CONNECTION_STRING`: privileged pooled Postgres connection used only by Next.js server code and controlled migration operations.
- `SUPABASE_PROJECT_URL`: Supabase Auth project URL. This value is not secret, but the app does not need it in the browser bundle.
- `SUPABASE_PUBLIC_KEY`: Supabase publishable/anon key used by the server-side Auth client. It is safe to expose by design, but this app deliberately has no `NEXT_PUBLIC_` Supabase variables.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `DATE_RESPONSE_FROM_EMAIL`: application response-delivery settings. Treat credentials and the configured sender as server-only.

No Supabase service-role key is required by the application or cleanup job. Never put a connection string, service-role key, SMTP password, or email-provider credential in browser code. GitHub Actions stores all deployment values as repository secrets and synchronizes the three Supabase runtime values to Vercel Production and Preview.

## Supabase Auth verification

The builder posts an email to `/api/creator-auth`. The server normalizes it and asks Supabase Auth to send a magic link. `/auth/confirm` exchanges the trusted PKCE code or verifies a supported email token, stores the Supabase session in HTTP cookies, and redirects only to `/create`. Publication calls `auth.getUser()` again and requires `email_confirmed_at`; client-provided IDs, email addresses, or verification flags are never trusted.

An existing verified session is reused. Missing or expired sessions show **Sign in again to continue**; invalid/expired links return to the builder with an expired state. The UI has a 60-second resend cooldown, and provider-side duplicate/rate-limit responses are mapped to HTTP 429.

Configure these Auth settings manually in the Supabase dashboard:

1. Enable Email authentication and magic-link/OTP sign-in.
2. Set the Site URL to the canonical production origin.
3. Add exact redirect allowlist entries for:
   - `http://localhost:3000/auth/confirm`
   - every intended production origin followed by `/auth/confirm`
   - intended Vercel preview origins only if preview verification is required.
4. Configure Supabase Auth custom SMTP for production delivery and confirm the email template uses Supabase's generated confirmation URL.
5. Test a fresh link, an expired link, a returning verified session, and sign-in after session expiry.

The verified account is only an ownership and response-delivery identity. There is no profile, form history, dashboard, recovery page, or link-retrieval feature.

## Form model and delivery

`DateFormConfiguration` schema version 2 stores only public rendering data. The system-managed required **Your email** field is rendered separately, so it cannot be removed or consume one of the ten configurable elements. The creation API allowlists configuration properties and rejects ownership, email, and timestamp fields.

Respondent submissions have the shape `{ respondentEmail, answers }`. The server validates both against the stored active form, obtains `creator_email` through a private database query, and sends one SMTP message to the creator with the respondent email in the body and `Reply-To`. The browser never supplies or receives the destination email. Submitted answers are emailed and are not stored; there are no response rows to clean up.

The reusable demo preset lives in `lib/date-forms/demo.ts`. Demo rendering, builder cloning, and tests use that source. Cloning regenerates step and field IDs and carries no owner, timestamp, submission, or metadata. Choosing **Use Demo Form** asks before replacing a meaningful session draft, then opens the editable builder without publishing.

## Exact expiration and cleanup

Migration `supabase/migrations/20260803110000_verified_creator_form_lifecycle.sql`:

- stores private `creator_user_id` and normalized `creator_email`;
- uses `timestamptz` and a trigger to set `created_at = transaction_timestamp()` and `expires_at = created_at + interval '3 days'`;
- makes ownership and timestamps immutable on update;
- indexes `expires_at`;
- keeps direct `anon` and `authenticated` table access denied by grants and restrictive RLS;
- installs `pg_cron`, creates private cleanup/logging objects, and schedules `cleanup-expired-date-forms-hourly` at `0 * * * *`.

At `expires_at <= now()`, server retrieval returns HTTP 410 with `FORM_EXPIRED`, rendering hides all fields, and direct submission is rejected. The UI formats the exact timestamp in the viewer's local timezone; the database stores absolute timezone-aware timestamps. Cleanup can physically remove an expired row up to one hour after logical expiry.

The cleanup function deletes expired `date_forms` in one transaction, is idempotent, and records successful execution time and deleted count in `private.date_form_cleanup_runs`. PostgreSQL rollback prevents partial deletion; cron failures remain in `cron.job_run_details`. The private schema and functions have no `PUBLIC`, `anon`, or `authenticated` invocation rights. Future dependent tables must reference `date_forms(id) ON DELETE CASCADE`.

Apply migrations through the project's controlled Supabase database workflow, then verify:

```sql
select jobname, schedule, command from cron.job
where jobname = 'cleanup-expired-date-forms-hourly';

select executed_at, deleted_count from private.date_form_cleanup_runs
order by executed_at desc limit 10;

select status, return_message from cron.job_run_details
order by start_time desc limit 10;
```

If the project does not permit extension creation through migrations, enable `pg_cron` in **Database → Extensions**, rerun the migration, and confirm the job owner can delete from `public.date_forms` and insert into the private log table.

## Validation and production verification

```bash
pnpm check
```

This runs Vitest, lint, typecheck, and the production build. There is no formatter or configured E2E runner. Time behavior is tested with explicit fixtures rather than waiting. Use one focused browser pass for the user journeys after the automated checks; do not duplicate smoke checks.

Pull requests targeting `main` run `.github/workflows/check-and-vercel-redeploy.yml`. After merge, dispatch that workflow from `main`; it checks, synchronizes Vercel runtime values, deploys a production build, waits for readiness, and performs a non-mutating route/Auth/security smoke on the generated URL. Supabase migrations are intentionally controlled separately and must be applied before deployment.

Production verification should cover home → demo → home, demo → editable builder, builder → home with and without changes, magic-link verification → publication, one respondent submission, active retrieval, and an expired fixture. Confirm both the workflow's generated deployment URL and the stable production alias.

## URL loss warning

Every generated URL must be copied and saved immediately. **The app cannot recover a form if its link is lost**, including through the verified creator email or Supabase account.
