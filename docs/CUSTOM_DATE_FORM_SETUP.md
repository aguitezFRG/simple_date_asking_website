# Custom Date Form Setup

## Architecture

Finalized form definitions are stored in the dedicated Supabase Postgres project. The browser calls Next.js routes; only Node.js server code opens a pooled Postgres connection. The Supabase Data API may remain disabled, and no Supabase key or connection string is sent to the browser.

The stored `configuration` is versioned JSONB. The server validates every definition before insertion and validates stored JSON again before rendering. Public links use a random identifier such as:

```text
/form/f_<24-base64url-characters>
```

The database UUID is never placed in a URL or response.

## Required environment variables

Use Node.js `>=22.22.2` and pnpm `10.34.5`.

```text
SUPABASE_CONNECTION_STRING
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
DATE_RESPONSE_FROM_EMAIL
```

`SUPABASE_CONNECTION_STRING` must be the dedicated project's pooled Postgres connection string and must remain server-only. The production and preview values belong in Vercel. Never print, commit, or prefix the connection string or SMTP credentials with `NEXT_PUBLIC_`.

The custom form's `email.sender` is a reply/contact address. SMTP `From` remains controlled by `DATE_RESPONSE_FROM_EMAIL` so a public form cannot spoof arbitrary SMTP senders.

## Database migration

Apply every SQL file in `supabase/migrations/` in filename order. With the Supabase CLI and the connection string already present in the shell:

```bash
supabase db push --db-url "$SUPABASE_CONNECTION_STRING" --include-all --dry-run
supabase db push --db-url "$SUPABASE_CONNECTION_STRING" --include-all
```

The result is `public.date_forms` with:

- a UUID internal primary key;
- a unique opaque `public_id`;
- versioned JSONB `configuration`;
- creation and optional expiration timestamps;
- an `is_active` availability flag;
- RLS enabled and all direct `anon`/`authenticated` privileges revoked.

The application implements inactive and expired lookup behavior because both states are present in the data model. It does not expose an administrative toggle UI.

## Local validation

```bash
pnpm install --frozen-lockfile
pnpm check
git diff --check
```

`pnpm check` runs Vitest, ESLint, TypeScript, and the Next.js production build. There is no formatter or configured end-to-end test runner. Use browser smoke checks separately.

Verify:

1. `/` shows **Make Your Own Date Form** and **View Demo**.
2. `/demo` loads the original invitation without creating a row.
3. `/create` prevents a fourth step and eleventh element, supports editing/removing/reordering/step assignment, and reports limit feedback.
4. Invalid email configuration, blank required values, invalid options, or missing steps cannot reach finalization.
5. Preview is required before **Finalize and create link**.
6. Finalization creates `/form/f_...`, and reopening that URL loads the stored wizard.
7. Malformed, unknown, inactive, and expired identifiers show the unavailable state.
8. Custom response submission validates answers against stored fields before SMTP delivery.

## Deployment

1. Configure all required runtime variables in Vercel without displaying their values.
2. Push the feature branch and open or update its pull request.
3. Require `pnpm check` and the Vercel preview to pass.
4. Merge through the repository's protected process.
5. Dispatch `.github/workflows/check-and-vercel-redeploy.yml` from integrated `main`.
6. Inspect the check, environment validation, deployment, readiness, and smoke logs.
7. Verify the generated deployment URL and stable public aliases.

The workflow uses `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and sensitive `SUPABASE_CONNECTION_STRING` repository secrets. It synchronizes the connection string to Vercel Production and Preview, then smoke-tests a temporary stored form and deletes it. It does not use a deploy-hook secret.

## Troubleshooting

- `Unable to save the date form.`: confirm `SUPABASE_CONNECTION_STRING`, migration history, project health, and Vercel runtime scope.
- Unavailable generated link: confirm the row exists, `is_active` is true, and `expires_at` is null or future.
- Email failure: confirm all SMTP variables and provider authorization. Visitors receive a generic error; never expose provider credentials or detailed database errors.
- Connection exhaustion: use the Supabase pooled connection string. The runtime client uses one connection per serverless instance, disables prepared statements, and closes idle connections.
