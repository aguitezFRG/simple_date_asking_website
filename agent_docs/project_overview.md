# Project Overview

The Simple Date Asking App is a small web application for creating and sharing a date-asking experience. The base page offers the original invitation as a no-configuration demo or a builder for persisted custom wizard forms.

## Verified workflow

1. `/` offers **Make Your Own Date Form** and **View Demo**.
2. `/demo` renders the original invitation without creating a database row. A `date` query passed through `/`, or the `/date=MM-DD-YYYY` segment route, retains the legacy display-date behavior.
3. `/demo` is presentation-only. **Use Demo Form** deep-clones the shared preset into `/create` without publishing or mutating the source.
4. `/create` edits up to three steps and ten configurable elements, permanently previews the separate required respondent-email field, and requires a verified Supabase Auth email before publishing.
5. `POST /api/date-forms` derives the verified creator ID/email from the trusted session, validates a public-only version 2 definition, and stores it with an opaque identifier and immutable three-day expiration.
6. `/form/[publicId]` retrieves active public data only. Its response route validates respondent email and answers, then privately looks up the verified creator destination for one SMTP delivery.

Invalid or missing date tokens fall back to the default display date. Submitted answers are delivered by email and are not stored. Expired forms return an explicit expired state and are deleted hourly. Generated URLs cannot be recovered if lost; there is deliberately no creator dashboard or history.

Preserve these routes and the email-response behavior unless a user explicitly requests a public contract change. Keep this document updated only with verified goals, major workflows, architecture, and project decisions.
