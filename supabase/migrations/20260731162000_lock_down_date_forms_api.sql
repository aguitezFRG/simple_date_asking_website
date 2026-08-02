revoke all on table public.date_forms from anon, authenticated;

drop policy if exists "Public can read active unexpired forms" on public.date_forms;

comment on table public.date_forms is
  'Validated date-form configurations. Public access is mediated by trusted Next.js server routes that look up a non-guessable public_id and reject inactive or expired rows. Direct Data API access is denied to anon and authenticated roles.';
