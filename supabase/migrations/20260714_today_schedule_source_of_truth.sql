-- Daily Schedule source-of-truth upgrade
-- Apply to the TEST/PREVIEW Supabase project first.
-- This migration archives duplicate daily rows before enforcing one row per house/date.

begin;

create extension if not exists pgcrypto;

-- Keep the migration compatible with older schedules schemas.
alter table public.schedules
  add column if not exists schedule_date date,
  add column if not exists updated_at timestamptz;

update public.schedules
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

-- 1. Ensure schedule_date is populated using the snapshot date first, then Sydney created date.
update public.schedules
set schedule_date = coalesce(
  nullif(left(snapshot ->> 'date', 10), ''),
  to_char(created_at at time zone 'Australia/Sydney', 'YYYY-MM-DD')
)::date
where schedule_date is null;

-- 2. Archive any duplicate rows before removing them.
-- The archive intentionally carries no copied primary-key/unique constraints.
-- Duplicate source rows must all be retainable for rollback/audit purposes.
create table if not exists public.schedule_duplicates_archive as
select
  s.*,
  now()::timestamptz as archived_at,
  null::text as archive_reason
from public.schedules s
with no data;

alter table public.schedule_duplicates_archive
  add column if not exists archived_at timestamptz not null default now(),
  add column if not exists archive_reason text;

with ranked as (
  select
    id,
    row_number() over (
      partition by house, schedule_date
      order by updated_at desc nulls last,
               created_at desc nulls last,
               id desc
    ) as row_rank
  from public.schedules
  where schedule_date is not null
), duplicates as (
  select s.*
  from public.schedules s
  join ranked r on r.id = s.id
  where r.row_rank > 1
)
insert into public.schedule_duplicates_archive
select d.*, now(), 'Duplicate house + schedule_date archived during source-of-truth migration'
from duplicates d
where not exists (
  select 1
  from public.schedule_duplicates_archive archived
  where archived.id = d.id
);

with ranked as (
  select
    id,
    row_number() over (
      partition by house, schedule_date
      order by updated_at desc nulls last,
               created_at desc nulls last,
               id desc
    ) as row_rank
  from public.schedules
  where schedule_date is not null
)
delete from public.schedules s
using ranked r
where s.id = r.id
  and r.row_rank > 1;

-- 3. Enforce one operational schedule per location/date.
create unique index if not exists schedules_house_schedule_date_unique
  on public.schedules (house, schedule_date)
  where schedule_date is not null;

-- 4. Keep updated_at reliable for optimistic/scoped saves.
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function public.set_updated_at_timestamp();

-- 5. Atomic top-level JSON patch used by Save & Exit and checklist auto-save.
create or replace function public.patch_daily_schedule_snapshot(
  p_schedule_id text,
  p_house text,
  p_schedule_date date,
  p_patch jsonb
)
returns setof public.schedules
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  update public.schedules
  set
    snapshot = coalesce(snapshot, '{}'::jsonb)
      || coalesce(p_patch, '{}'::jsonb)
      || jsonb_build_object('date', to_char(p_schedule_date, 'YYYY-MM-DD')),
    schedule_date = p_schedule_date
  where id::text = p_schedule_id
    and house = p_house
    and schedule_date = p_schedule_date
  returning *;
end;
$$;

grant execute on function public.patch_daily_schedule_snapshot(text, text, date, jsonb)
  to anon, authenticated;

-- 6. Outings are independent from daily schedule creation.
create table if not exists public.daily_outings (
  id uuid primary key default gen_random_uuid(),
  house text not null,
  outing_date date not null,
  outings jsonb not null default '[]'::jsonb,
  auto_reset_enabled boolean not null default true,
  last_auto_reset_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_outings_house_date_unique unique (house, outing_date)
);

drop trigger if exists daily_outings_set_updated_at on public.daily_outings;
create trigger daily_outings_set_updated_at
before update on public.daily_outings
for each row execute function public.set_updated_at_timestamp();

-- Preserve any outings already saved inside the canonical legacy schedule snapshot.
-- Future writes go only to daily_outings.
with legacy_outings as (
  select
    house,
    schedule_date as outing_date,
    case
      when jsonb_typeof(snapshot::jsonb -> 'outingGroups') = 'array'
        then snapshot::jsonb -> 'outingGroups'
      when snapshot::jsonb -> 'outingGroup' is not null
        and snapshot::jsonb -> 'outingGroup' <> 'null'::jsonb
        then jsonb_build_array(snapshot::jsonb -> 'outingGroup')
      else '[]'::jsonb
    end as outings,
    coalesce((snapshot::jsonb ->> 'outingAutoResetEnabled')::boolean, true)
      as auto_reset_enabled,
    nullif(snapshot::jsonb ->> 'outingLastAutoResetDate', '')::date
      as last_auto_reset_date
  from public.schedules
  where schedule_date is not null
), meaningful_legacy_outings as (
  select *
  from legacy_outings
  where jsonb_typeof(outings) = 'array'
    and jsonb_array_length(outings) > 0
)
insert into public.daily_outings (
  house,
  outing_date,
  outings,
  auto_reset_enabled,
  last_auto_reset_date
)
select
  house,
  outing_date,
  outings,
  auto_reset_enabled,
  last_auto_reset_date
from meaningful_legacy_outings
on conflict (house, outing_date) do update
set
  outings = excluded.outings,
  auto_reset_enabled = excluded.auto_reset_enabled,
  last_auto_reset_date = excluded.last_auto_reset_date,
  updated_at = now();

alter table public.daily_outings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_outings'
      and policyname = 'daily_outings_select'
  ) then
    create policy daily_outings_select on public.daily_outings
      for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_outings'
      and policyname = 'daily_outings_insert'
  ) then
    create policy daily_outings_insert on public.daily_outings
      for insert to anon, authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_outings'
      and policyname = 'daily_outings_update'
  ) then
    create policy daily_outings_update on public.daily_outings
      for update to anon, authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_outings'
      and policyname = 'daily_outings_delete'
  ) then
    create policy daily_outings_delete on public.daily_outings
      for delete to anon, authenticated using (true);
  end if;
end
$$;

grant select, insert, update, delete on public.daily_outings to anon, authenticated;

commit;
