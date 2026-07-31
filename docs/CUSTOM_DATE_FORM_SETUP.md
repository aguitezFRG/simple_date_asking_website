# Custom Date Form Feature Setup

This guide explains the infrastructure and configuration required to make the custom date-form builder work successfully on the `agent/custom-date-form-builder` branch.

## 1. Check out the feature branch

```bash
git fetch origin
git switch agent/custom-date-form-builder
pnpm install
```

The feature branch contains:

- A landing page with **Make your own date form** and **View Demo** options
- A custom builder limited to 3 wizard steps and 10 total form elements
- A demo route that preserves the original date invitation
- Supabase-backed form persistence
- Unique public form links
- Server-side validation and response email delivery

## 2. Create a dedicated Supabase project

Create a new Supabase project for this app rather than reusing the LMS or Kwentong Kusina databases.

Recommended settings:

- **Project name:** `simple-date-asking-app`
- **Region:** Southeast Asia (`ap-southeast-1`)
- **Database password:** Generate and store a strong password in a password manager

Wait until the project status is healthy before continuing.

## 3. Apply the database migrations

The required SQL files are in:

```text
supabase/migrations/
```

Apply them in chronological order using either the Supabase CLI or the Supabase SQL Editor.

### Supabase CLI approach

Install and authenticate the CLI, then link the project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### SQL Editor approach

Open the Supabase dashboard, go to **SQL Editor**, and run each migration file in filename order.

The resulting `public.date_forms` table includes:

- `id` — UUID primary key
- `public_id` — unique, non-guessable public identifier
- `configuration` — validated JSONB form definition
- `created_at` — creation timestamp
- `expires_at` — optional expiration timestamp
- `is_active` — form availability flag

The migrations also enable Row Level Security and deny direct anonymous table access. Public form reads go through trusted server routes rather than direct browser queries.

## 4. Obtain the Supabase credentials

In the Supabase dashboard, open **Project Settings → API**.

Copy:

- The project URL
- A server-side secret key

Use a modern Supabase secret key when available. A legacy `service_role` key also works, but it must remain server-only.

Never expose the secret key in browser code or in an environment variable beginning with `NEXT_PUBLIC_`.

## 5. Configure local environment variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Set the following variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SUPABASE_SECRET

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
DATE_RESPONSE_FROM_EMAIL=your-email@example.com
```

### Gmail SMTP notes

For Gmail:

1. Enable two-step verification on the Google account.
2. Create an App Password.
3. Use the App Password as `SMTP_PASS`; do not use the normal account password.
4. Set `SMTP_USER` to the authenticated Gmail address.
5. Set `DATE_RESPONSE_FROM_EMAIL` to an address allowed by that SMTP account.

The form builder's configurable `sender` field is used as the reply/contact address in the generated message. The actual SMTP `From` identity remains `DATE_RESPONSE_FROM_EMAIL` to avoid sender spoofing and delivery failures.

## 6. Run the local checks

```bash
pnpm check
```

This runs the test suite, TypeScript checking, linting, and the production build.

You may also run the commands separately:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Do not deploy until all commands pass.

## 7. Test the feature locally

Start the app:

```bash
pnpm dev
```

Verify these routes:

- `/` — shows the two entry options
- `/demo` — shows the original default invitation
- `/create` — opens the custom form builder

Create a form and verify that:

1. A fourth wizard step cannot be added.
2. An eleventh form element cannot be added.
3. Email configuration contains only sender and recipient.
4. Finalizing the builder creates a URL similar to `/form/f_...`.
5. Opening the generated link loads the stored configuration.
6. Submitting the form sends the response email.
7. Invalid, inactive, missing, and expired form IDs are rejected.

## 8. Configure Vercel environment variables

In Vercel, open the `simple-date-asking-website` project and add these variables to **Production**, **Preview**, and **Development** as appropriate:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
DATE_RESPONSE_FROM_EMAIL
```

Important:

- Mark `SUPABASE_SECRET_KEY` and `SMTP_PASS` as sensitive/encrypted.
- Do not rename `SUPABASE_SECRET_KEY` to include `NEXT_PUBLIC_`.
- Redeploy after adding or changing environment variables.

## 9. Optional deployment-hook secret

The branch includes a GitHub Actions checking and redeployment workflow. To let the workflow explicitly trigger Vercel after checks pass:

1. Create a Vercel Deploy Hook for the appropriate branch/project.
2. Add the hook URL to the GitHub repository as an Actions secret named:

```text
VERCEL_DEPLOY_HOOK_URL
```

Without this secret, Vercel's Git integration may still deploy pushes automatically, but the explicit redeployment step will be skipped or unavailable.

## 10. Deploy the feature branch safely

Keep the feature on `agent/custom-date-form-builder` until it is fully configured and tested.

Recommended deployment flow:

1. Push changes to the feature branch.
2. Confirm the branch preview deployment succeeds.
3. Test form creation and retrieval against the configured Supabase project.
4. Confirm response email delivery.
5. Review Supabase security and performance advisors.
6. Open a pull request into `main` only after the feature is production-ready.

## 11. Supabase security verification

After applying migrations, check the Supabase advisors and confirm:

- Row Level Security is enabled on `public.date_forms`.
- Anonymous and authenticated roles cannot directly enumerate records.
- Form creation uses only trusted server-side credentials.
- The Supabase secret key is not present in browser bundles, logs, or committed files.
- Public IDs are random and non-sequential.

## 12. Troubleshooting

### `Date-form storage is not configured`

One or both of these variables is missing or invalid:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY
```

Add them in the current environment and restart or redeploy the app.

### Form finalization returns a database error

Confirm that:

- The migrations were applied to the same Supabase project referenced by the environment variables.
- The `date_forms` table exists.
- The secret key is active.
- The project is not paused.

### Generated form link returns not found

Confirm that the row:

- Exists with the generated `public_id`
- Has `is_active = true`
- Has no expired `expires_at` value

### Email delivery fails

Confirm that:

- SMTP credentials are correct.
- Gmail is using an App Password.
- `SMTP_PORT=465` is paired with secure SMTP.
- `DATE_RESPONSE_FROM_EMAIL` is allowed by the SMTP provider.
- The provider has not blocked the sign-in attempt.

### GitHub Actions does not redeploy

Confirm that:

- The workflow exists on the branch being tested.
- Repository Actions are enabled.
- `VERCEL_DEPLOY_HOOK_URL` exists as a repository secret.
- The check job completed successfully before the deployment job.
