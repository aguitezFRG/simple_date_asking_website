# Project Structure

The verified application and workflow layout is:

```text
app/
  page.tsx                  # two-choice landing route
  demo/                     # presentation-only shared-preset invitation and actions
  create/                   # draft-aware builder, Auth verification, preview, success
  auth/confirm/             # allowlisted Supabase Auth callback
  form/[publicId]/          # active custom wizard, success, and expired states
  [dateParam]/page.tsx      # date-segment invitation route
  date-invitation.tsx       # client invitation, form, and success flow
  date-options.ts           # lunch and activity choices
  display-date.ts           # date-token validation and formatting
  api/submit-date/route.ts  # disabled legacy demo delivery endpoint
  api/creator-auth/         # private verification status, send, and sign-out API
  api/date-forms/           # verified creation, safe retrieval, secure submission
  layout.tsx                # root metadata and document shell
  globals.css               # global styles
public/                     # checked-in public assets
lib/date-forms/             # shared v2 schema, demo preset, draft key, and storage
lib/supabase/               # server-only pooled Postgres and cookie Auth clients
supabase/migrations/        # lifecycle schema, RLS, private cleanup, and hourly cron
tests/                      # Vitest schema, UI, route, and storage coverage
.github/workflows/
  check-and-vercel-redeploy.yml
agent_docs/                 # project-scoped workflow and durable context
```

`package.json` contains the package scripts and pinned Next.js/React versions; `pnpm-lock.yaml` records dependency resolution. `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, and `postcss.config.mjs` are repository configuration. Do not change these during documentation-only work.

## Ownership boundaries

Sol owns application, infrastructure, package, workflow, test, validation, Git, secrets, deployment, live-verification, and completion decisions. Luna assistance is limited to bounded exploration, synthesis, review, and explicitly assigned low-risk documentation edits. `project_progress.md` and `latest_session_work.md` are Sol-owned status documents.

Keep this document concise and update it only when structural changes are confirmed.
