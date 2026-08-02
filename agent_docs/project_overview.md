# Project Overview

The Simple Date Asking App is a small web application for creating and sharing a date-asking experience. The base page offers the original invitation as a no-configuration demo or a builder for persisted custom wizard forms.

## Verified workflow

1. `/` offers **Make Your Own Date Form** and **View Demo**.
2. `/demo` renders the original invitation without creating a database row. A `date` query passed through `/`, or the `/date=MM-DD-YYYY` segment route, retains the legacy display-date behavior.
3. `/create` edits up to three steps and ten total elements, requires sender and recipient email configuration, and requires a valid preview before publishing.
4. `POST /api/date-forms` validates the complete versioned definition and stores it in Supabase Postgres with a random opaque public identifier.
5. `/form/[publicId]` retrieves active, unexpired stored JSON and renders the custom wizard. Its response route validates answers against that stored schema and sends email through SMTP.

Invalid or missing date tokens fall back to the default display date. Form definitions are persisted; submitted answers are delivered by email and are not stored.

Preserve these routes and the email-response behavior unless a user explicitly requests a public contract change. Keep this document updated only with verified goals, major workflows, architecture, and project decisions.
