-- Remove Mikaela from all saved floating assignments.
-- Future automatic and manual floating assignment selection is blocked in app/edit/floating.tsx.

begin;

with rebuilt as (
  select
    s.id,
    coalesce(
      jsonb_object_agg(
        slot_entry.key,
        coalesce(
          (
            select jsonb_object_agg(room_entry.key, room_entry.value)
            from jsonb_each(
              case
                when jsonb_typeof(slot_entry.value) = 'object' then slot_entry.value
                else '{}'::jsonb
              end
            ) as room_entry
            where coalesce(room_entry.value #>> '{}', '') not in (
              '2c00094c-4a46-43fd-b5b8-de891bf5a7e3',
              '20'
            )
          ),
          '{}'::jsonb
        )
      ),
      '{}'::jsonb
    ) as cleaned_floating
  from public.schedules s
  cross join lateral jsonb_each(
    case
      when jsonb_typeof(s.snapshot::jsonb -> 'floatingAssignments') = 'object'
        then s.snapshot::jsonb -> 'floatingAssignments'
      else '{}'::jsonb
    end
  ) as slot_entry
  group by s.id
)
update public.schedules s
set snapshot = jsonb_set(
  coalesce(s.snapshot::jsonb, '{}'::jsonb),
  '{floatingAssignments}',
  rebuilt.cleaned_floating,
  true
)
from rebuilt
where s.id = rebuilt.id
  and s.schedule_date >= (now() at time zone 'Australia/Sydney')::date
  and (s.snapshot::jsonb -> 'floatingAssignments')::text like any (array[
    '%2c00094c-4a46-43fd-b5b8-de891bf5a7e3%',
    '%"20"%'
  ]);

commit;

-- Expected result after the cleanup: 0.
select count(*) as remaining_mikaela_floating_assignments
from public.schedules s
where s.schedule_date >= (now() at time zone 'Australia/Sydney')::date
  and (s.snapshot::jsonb -> 'floatingAssignments')::text like any (array[
    '%2c00094c-4a46-43fd-b5b8-de891bf5a7e3%',
    '%"20"%'
  ]);
