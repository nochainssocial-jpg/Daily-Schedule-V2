-- Preserve outings after the 5:00pm operational reset so historical floating
-- fairness can still account for offsite staff and participants.

alter table public.daily_outings
  add column if not exists archived_outings jsonb not null default '[]'::jsonb;

comment on column public.daily_outings.archived_outings is
  'Last non-empty outing allocation retained when the live daily outing list auto-resets.';
