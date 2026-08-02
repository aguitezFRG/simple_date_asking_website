alter table public.date_forms
  drop constraint if exists date_forms_public_id_check;

alter table public.date_forms
  add constraint date_forms_public_id_check
  check (public_id ~ '^f_[A-Za-z0-9_-]{24}$');

alter table public.date_forms
  drop constraint if exists date_forms_configuration_version_check;

alter table public.date_forms
  add constraint date_forms_configuration_version_check
  check (
    jsonb_typeof(configuration) = 'object'
    and configuration @> '{"version": 1}'::jsonb
    and jsonb_typeof(configuration -> 'steps') = 'array'
    and jsonb_array_length(configuration -> 'steps') between 1 and 3
    and jsonb_typeof(configuration -> 'email') = 'object'
    and (configuration -> 'email') ?& array['sender', 'recipient']
    and ((configuration -> 'email') - 'sender' - 'recipient') = '{}'::jsonb
  );

revoke all on table public.date_forms from anon, authenticated;

comment on column public.date_forms.configuration is
  'Server-validated JSON configuration. Version 1 permits at most three wizard steps and email sender/recipient only.';
