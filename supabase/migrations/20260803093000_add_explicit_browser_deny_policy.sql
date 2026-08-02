drop policy if exists "No direct browser access" on public.date_forms;

create policy "No direct browser access"
  on public.date_forms
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on policy "No direct browser access" on public.date_forms is
  'Defense in depth: browser roles have no table grants and are also denied by RLS. Trusted server connections use a privileged Postgres role.';
