# Supabase creator verification email

The hosted Supabase Auth email bodies are stored at:

```text
supabase/templates/creator-verification.html         (Magic Link, type=magiclink)
supabase/templates/creator-verification-signup.html  (Confirm signup, type=email)
```

## Dashboard setup

Hosted Supabase does not load these files automatically. Paste each file into the dashboard manually. Open **Authentication → Email Templates** and apply:

1. **Confirm signup** — paste `creator-verification-signup.html`. Used when `signInWithOtp` creates a new creator identity.
2. **Magic Link** — paste `creator-verification.html`. Used when a returning creator requests another sign-in link.

Use this subject for both templates:

```text
Verify your email to receive date form responses
```

Both templates link directly to the app with a token hash instead of Supabase's PKCE `{{ .ConfirmationURL }}`:

```text
{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next=/create
```

(`type=email` in the Confirm signup template.) `app/auth/confirm/route.ts` verifies the hash with `verifyOtp`, so the link works when opened in another browser or device and survives email link scanners. The `?code=` PKCE branch remains for other flows.

`{{ .RedirectTo }}` is the `emailRedirectTo` sent by `app/api/creator-auth/route.ts`: the bare trusted origin of the request (no path or query). The template appends `/auth/confirm?...`, so the link opens on the origin where the creator started sign-in.

Each origin must be in the Redirect URLs allowlist below. If it is not, Supabase falls back to the dashboard **Site URL** as `{{ .RedirectTo }}`; the appended path still works, but the link points at the Site URL domain.

## Redirect URLs

Under **Authentication → URL Configuration → Redirect URLs**, include:

- `http://localhost:3000`
- `http://localhost:3000/**`
- `https://wybmd.frgagz.com`
- `https://wybmd.frgagz.com/**`
- `https://wybmd.cntest.uk`
- `https://wybmd.cntest.uk/**`
- `https://simple-date-asking-website.vercel.app`
- `https://simple-date-asking-website.vercel.app/**`

`https://host/**` may not match the bare `https://host`, so list both. If an origin is not allowlisted, Supabase falls back to the Site URL: login still works, but multi-origin is lost. Verify with a test email.

Keep provider click tracking disabled because link rewriting can interfere with authentication URLs.

## Custom SMTP

Configure the production SMTP provider under **Authentication → SMTP Settings**. The template controls the HTML body; the SMTP configuration controls delivery and sender identity. Suggested sender display name:

```text
Would you be my date?
```

After saving the templates, test both a new email address and an existing verified email address. Confirm that each message opens (also in a different browser) and redirects to `/create?auth=verified`.
