# Project Overview

The Simple Date Asking App is a small web application for creating and sharing a date-asking experience. Its public interaction is an invitation screen, a response form, and a success screen.

## Verified workflow

1. `/` renders the invitation using the default display date.
2. The `date` query form `/?date=MM-DD-YYYY` or the `/date=MM-DD-YYYY` segment route can provide a valid display date.
3. The visitor selects Yes, enters respondent and recipient email addresses, and chooses a lunch place and a pre-going-home activity. Each choice also supports an Other value with custom text.
4. The browser posts the response to `POST /api/submit-date`.
5. The Node.js API validates the payload and sends one confirmation to the recipient and one copy to the respondent through SMTP. A successful response shows the success screen.

Invalid or missing date tokens fall back to the default display date. The application does not persist date responses in a database; the response is delivered by email.

Preserve these routes and the email-response behavior unless a user explicitly requests a public contract change. Keep this document updated only with verified goals, major workflows, architecture, and project decisions.
