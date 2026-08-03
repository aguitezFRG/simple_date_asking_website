# Supabase creator verification email

The canonical hosted Supabase Auth email body is stored at:

```text
supabase/templates/creator-verification.html
```

## Dashboard setup

In the Supabase dashboard, open **Authentication → Email Templates** and apply the same body to both:

1. **Confirm signup** — used when `signInWithOtp` creates a new creator identity.
2. **Magic Link** — used when a returning creator requests another verification/sign-in link.

Use this subject for both templates:

```text
Verify your email to receive date form responses
```

The template intentionally uses Supabase's generated `{{ .ConfirmationURL }}` for the primary button and fallback link. The application supplies a trusted `/auth/confirm?next=/create` redirect through `emailRedirectTo`, so the generated URL preserves the selected trusted public origin.

Do not replace the link with a hard-coded site URL. Keep provider click tracking disabled because link rewriting can interfere with Supabase authentication URLs.

## Custom SMTP

Configure the production SMTP provider under **Authentication → SMTP Settings**. The template controls the HTML body; the SMTP configuration controls delivery and sender identity. Suggested sender display name:

```text
Would you be my date?
```

After saving the templates, test both a new email address and an existing verified email address. Confirm that each message returns to the originating trusted domain and redirects to `/create?auth=verified`.
