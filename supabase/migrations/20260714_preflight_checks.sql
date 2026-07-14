-- Read-only checks to run before the source-of-truth migration.

-- Confirm the schedules schema expected by the migration and app.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'schedules'
  and column_name in (
    'id', 'house', 'snapshot', 'code', 'schedule_date',
    'created_at', 'updated_at'
  )
order by ordinal_position;

-- Existing duplicate daily schedules.
select house, schedule_date, count(*) as row_count
from public.schedules
where schedule_date is not null
group by house, schedule_date
having count(*) > 1
order by schedule_date desc, house;

-- Rows requiring schedule_date backfill.
select id, house, created_at, snapshot ->> 'date' as snapshot_date
from public.schedules
where schedule_date is null
order by created_at desc;

-- Legacy outing data that will be copied into daily_outings.
select
  house,
  schedule_date,
  jsonb_array_length(
    case
      when jsonb_typeof(snapshot::jsonb -> 'outingGroups') = 'array'
        then snapshot::jsonb -> 'outingGroups'
      when snapshot::jsonb -> 'outingGroup' is not null
        and snapshot::jsonb -> 'outingGroup' <> 'null'::jsonb
        then jsonb_build_array(snapshot::jsonb -> 'outingGroup')
      else '[]'::jsonb
    end
  ) as outing_count
from public.schedules
where schedule_date is not null
order by schedule_date desc, house;

-- Confirm SELECT / INSERT / UPDATE policies for the schedules table.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'schedules'
order by policyname;

-- Confirm grants visible to the application roles.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'schedules'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
