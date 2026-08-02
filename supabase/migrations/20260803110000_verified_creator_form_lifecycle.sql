create extension if not exists pg_cron with schema pg_catalog;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.date_forms
  add column if not exists creator_user_id uuid,
  add column if not exists creator_email text;

alter table public.date_forms
  drop constraint if exists date_forms_configuration_version_check,
  drop constraint if exists date_forms_expiry_after_creation;

update public.date_forms
set
  configuration = configuration - 'email',
  expires_at = created_at + interval '3 days',
  is_active = false
where configuration @> '{"version": 1}'::jsonb;

alter table public.date_forms
  alter column expires_at set not null;

alter table public.date_forms
  add constraint date_forms_creator_user_id_fkey
    foreign key (creator_user_id)
    references auth.users(id)
    on delete cascade,
  add constraint date_forms_creator_email_shape_check
    check (
      creator_email is null
      or (
        creator_email = lower(btrim(creator_email))
        and char_length(creator_email) between 3 and 254
        and position('@' in creator_email) > 1
      )
    ),
  add constraint date_forms_exact_expiration_check
    check (expires_at = created_at + interval '3 days'),
  add constraint date_forms_configuration_version_check
    check (
      jsonb_typeof(configuration) = 'object'
      and jsonb_typeof(configuration -> 'steps') = 'array'
      and jsonb_array_length(configuration -> 'steps') between 1 and 3
      and not (configuration ? 'email')
      and (
        (
          configuration @> '{"version": 1}'::jsonb
          and is_active = false
          and creator_user_id is null
          and creator_email is null
        )
        or (
          configuration @> '{"version": 2}'::jsonb
          and creator_user_id is not null
          and creator_email is not null
        )
      )
    );

create or replace function private.enforce_date_form_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := transaction_timestamp();
    new.expires_at := new.created_at + interval '3 days';
  else
    new.created_at := old.created_at;
    new.expires_at := old.expires_at;
    new.creator_user_id := old.creator_user_id;
    new.creator_email := old.creator_email;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_date_form_lifecycle on public.date_forms;
create trigger enforce_date_form_lifecycle
before insert or update on public.date_forms
for each row execute function private.enforce_date_form_lifecycle();

create index if not exists date_forms_expires_at_idx
  on public.date_forms (expires_at);

create table if not exists private.date_form_cleanup_runs (
  id bigint generated always as identity primary key,
  executed_at timestamptz not null default now(),
  deleted_count bigint not null check (deleted_count >= 0)
);

revoke all on table private.date_form_cleanup_runs from public, anon, authenticated;
revoke all on sequence private.date_form_cleanup_runs_id_seq from public, anon, authenticated;

create or replace function private.cleanup_expired_date_forms()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed_count bigint;
begin
  delete from public.date_forms
  where expires_at <= transaction_timestamp();

  get diagnostics removed_count = row_count;

  insert into private.date_form_cleanup_runs (executed_at, deleted_count)
  values (transaction_timestamp(), removed_count);

  return removed_count;
end;
$$;

revoke all on function private.enforce_date_form_lifecycle() from public, anon, authenticated;
revoke all on function private.cleanup_expired_date_forms() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'cleanup-expired-date-forms-hourly';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'cleanup-expired-date-forms-hourly',
    '0 * * * *',
    'select private.cleanup_expired_date_forms();'
  );
end;
$$;

revoke all on table public.date_forms from anon, authenticated;

drop policy if exists "No direct browser access" on public.date_forms;
create policy "No direct browser access"
  on public.date_forms
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on column public.date_forms.creator_user_id is
  'Verified Supabase Auth owner. Set only by the trusted publication route.';
comment on column public.date_forms.creator_email is
  'Private verified delivery destination. Never returned by public form queries.';
comment on column public.date_forms.expires_at is
  'Immutable trusted expiration exactly three days after created_at.';
comment on function private.cleanup_expired_date_forms() is
  'Hourly pg_cron cleanup. Successful executions are recorded in private.date_form_cleanup_runs; failures remain visible in cron.job_run_details.';
