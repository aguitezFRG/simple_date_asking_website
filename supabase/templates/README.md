# Supabase email templates

Source-controlled HTML bodies for the hosted Supabase Auth emails:

- `creator-verification.html` — **Magic Link** template. Link uses `type=magiclink`.
- `creator-verification-signup.html` — **Confirm signup** template. Link uses `type=email`.

Both link directly to the app with a token hash, not Supabase's PKCE `{{ .ConfirmationURL }}`:

```text
{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=<magiclink|email>&amp;next=/create
```

This flow works when the link opens in a different browser or device (no `code_verifier` cookie needed) and is not consumed by email link scanners that prefetch the Supabase verify URL.

Hosted Supabase projects do not automatically load these repository files. Paste each file's contents into the matching dashboard template manually, as described in `docs/SUPABASE_AUTH_EMAIL_TEMPLATE.md`.

Authentication → URL Configuration → **Redirect URLs** must include:

- `http://localhost:3000`
- `http://localhost:3000/**`
- `https://wybmd.frgagz.com`
- `https://wybmd.frgagz.com/**`
- `https://wybmd.cntest.uk`
- `https://wybmd.cntest.uk/**`
- `https://simple-date-asking-website.vercel.app`
- `https://simple-date-asking-website.vercel.app/**`

`https://host/**` may not match the bare `https://host`, so list both.

`{{ .RedirectTo }}` is the `emailRedirectTo` passed by `app/api/creator-auth/route.ts`: the bare trusted origin of the request (no path or query). The template appends `/auth/confirm?...`, so each creator lands on the origin where sign-in started.

Each origin must be in the Redirect URLs allowlist above. If it is not, Supabase falls back to the **Site URL** as `{{ .RedirectTo }}`; the appended path still works, but the link points at the Site URL domain.
