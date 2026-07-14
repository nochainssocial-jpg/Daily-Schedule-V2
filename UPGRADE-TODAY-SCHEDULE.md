# Today Schedule Source-of-Truth Upgrade

## Branch

`feature/today-schedule-source-of-truth`

## Behaviour

- Daily schedules are resolved by `house + schedule_date` using the Sydney date.
- The dashboard never falls back to the most recently created schedule.
- Missing today schedule displays `No Schedule Created Yet` and keeps polling.
- Create Schedule inserts the daily record once and blocks duplicates.
- Dream Team, participants, assignments, floating, cleaning, transport and checklist patch the same daily row.
- Save & Exit remains on screen when persistence fails.
- Checklist ticks patch only checklist data.
- Outings are stored independently in `daily_outings`, including independent Save & Exit and 5:00 pm reset handling.
- Existing legacy outings are copied into `daily_outings` by the migration.
- Share-code UI, API and loader are retired. The Access screen remains for administrator PIN entry until location PIN access is introduced.

## Database order

1. Keep this code on the feature branch.
2. Use a separate TEST/PREVIEW Supabase project or take a verified production backup.
3. Run `supabase/migrations/20260714_preflight_checks.sql` in the Supabase SQL editor.
4. Review duplicate schedules, missing dates, legacy outings and `schedules` SELECT/INSERT/UPDATE policies.
5. Run `supabase/migrations/20260714_today_schedule_source_of_truth.sql`.
6. Confirm the migration created:
   - unique `house + schedule_date` protection,
   - `patch_daily_schedule_snapshot`,
   - `daily_outings`,
   - the duplicate archive and update triggers.
7. Confirm the application role can SELECT, INSERT and UPDATE `schedules`.
8. Deploy the feature branch to a Vercel preview.

## Required regression tests

1. Yesterday exists, today missing: dashboard shows only the missing state.
2. Create today: exactly one daily row is created.
3. Create today again: duplicate creation is blocked and the existing schedule is reloaded.
4. Dream Team, participants, assignments, floating, cleaning and transport update the same schedule ID.
5. Floating validation still blocks invalid saves and navigation.
6. A failed Save & Exit leaves the editor open.
7. Checklist ticks do not create new schedule rows or overwrite unrelated sections.
8. Outings save to `daily_outings`, including when today’s daily schedule is missing.
9. The 5:00 pm outing reset updates `daily_outings`, not `schedules`.
10. Dashboard auto-populates after the next refresh once the schedule is created.
11. Refresh failure never loads yesterday.
12. Sydney midnight clears the previous day and resolves the new date.
13. Existing dashboard styling, banners, pills and rotation remain unchanged when today is ready.
14. The Access screen contains no schedule share-code workflow.
15. Vercel preview build completes successfully.

## Commit after local/preview validation

```bash
git status
git add -A
git commit -m "Use current-day schedule as operational source of truth"
git push
```

Do not merge into `main` until the SQL migration and complete regression list pass in the testing environment.
