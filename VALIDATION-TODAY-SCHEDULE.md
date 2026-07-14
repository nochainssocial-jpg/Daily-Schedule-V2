# Validation Report — Today Schedule Source of Truth

## Completed checks

- `git diff --check`: passed.
- ESLint on every changed/new TypeScript file: **0 errors** (existing warnings remain).
- Babel/Expo syntax transformation on all changed/new TypeScript files: passed.
- Sydney date tests passed across standard-time and daylight-saving boundaries.
- Scoped snapshot tests passed and confirmed outings are excluded from daily schedule creation.
- Every Edit Hub `Save & Exit` screen is mapped to a recognised scoped save.
- Search confirmed no operational screen calls `fetchLatestScheduleForHouse()` or the old insert helper.
- Legacy share-code API and loader were removed.

## Existing baseline limitations

A complete `tsc --noEmit` is still not clean because the supplied baseline already contains broad TypeScript issues in dashboard data typing, typed routes, legacy copy files and several unrelated screens. The malformed unused `create-schedule.styles.ts` file that originally stopped parsing was repaired as part of this branch.

The newly introduced repository, Sydney-date, outing, scoped-save, checklist, Edit Layout and missing-state files report no TypeScript errors. Dashboard and Edit Hub index errors shown by `tsc` are the same baseline classes of errors present before this upgrade.

## Expo export

`expo export -p web` was attempted in the artifact environment. Metro reached 43.7% without reporting a compile error, but the environment timed out before bundling completed. The Vercel branch preview must therefore be treated as the authoritative full production-style build check.

## Database validation still required

The SQL was not executed against any Supabase project from this artifact environment. Run the included read-only preflight first, review its output, then apply the migration only to a test/preview database or after a verified backup.
