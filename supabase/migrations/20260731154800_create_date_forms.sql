create extension if not exists pgcrypto;

create table if not exists public.date_forms (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique
    check (public_id ~ '^f_[A-Za-z0-9_-]{20,64}$'),
  configuration jsonb not null
    check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  constraint date_forms_expiry_after_creation
    check (expires_at is null or expires_at > created_at)
);

create index if not exists date_forms_public_lookup_idx
  on public.date_forms (public_id)
  where is_active = true;

alter table public.date_forms enable row level security;

revoke all on table public.date_forms from anon, authenticated;
grant select on table public.date_forms to anon, authenticated;

create policy "Public can read active unexpired forms"
  on public.date_forms
  for select
  to anon, authenticated
  using (
    is_active = true
    and (expires_at is null or expires_at > now())
  );

comment on table public.date_forms is
  'Validated, immutable public date-form configurations. Inserts are performed only by trusted server-side code using the Supabase secret key.';
