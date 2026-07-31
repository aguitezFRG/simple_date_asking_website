# Custom date-form implementation audit

## Current application shape

- `app/page.tsx` renders the default date invitation and accepts a legacy `date` query parameter.
- `app/[dateParam]/page.tsx` renders the same invitation using a path segment as the display date.
- `app/date-invitation.tsx` contains all invitation, response-form, client validation, and submission UI state.
- `app/api/submit-date/route.ts` validates the default response payload and sends two SMTP messages.
- `app/display-date.ts` normalizes legacy date values.
- `app/date-options.ts` contains the default select options.
- `app/globals.css` contains the shared animated palette and reduced-motion fallback.

## Constraints affecting the implementation

1. The base route currently opens the invitation directly, so it must become the two-choice entry experience.
2. The existing `[dateParam]` route conflicts conceptually with a public form identifier. Saved forms therefore use the explicit route `/form/[publicId]`.
3. The existing invitation component is tightly coupled to the default fields. It should remain as the demo while custom forms use a separate schema-driven renderer.
4. SMTP credentials and the Supabase secret key must remain available only in route handlers/server modules.
5. Builder limits require shared validation used by both the browser and server: at most three wizard steps and at most ten fields total.
6. The configurable email section is limited to two values: `sender` and `recipient`. No subject, SMTP sender, reply-to override, or arbitrary email header is stored in a public configuration.
7. Public saved-form reads must reject inactive and expired records.
8. A URL-derived `publicId` is the source of truth. Any internal `x-date-form-id` header must be created by trusted server code rather than accepted from the browser.

## Deployment and checks

The repository exposes `npm run lint` and `npm run build`. No test framework is currently declared in `package.json`; test coverage must be added without weakening those existing checks. Deployment is Vercel-oriented through the Next.js application and repository workflow configuration.
