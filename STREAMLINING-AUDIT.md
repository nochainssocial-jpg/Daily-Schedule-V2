# Daily Schedule V2 — Streamlining Audit

Audit date: 17 July 2026  
Source reviewed: current Vercel production archive supplied by Bruno.

## Outcome

The repository has been cleaned and rebuilt successfully. The production web export passes and Expo lint now reports **zero errors and zero warnings**.

This package is intentionally a production-safe cleanup. It removes confirmed redundant material and consolidates low-risk duplication without redesigning operational behaviour.

## Important functional correction

The Floating Assignment stability/Mikaela hotfix had been committed under the incorrect route:

`app/app/edit/floating.tsx`

Expo Router uses:

`app/edit/floating.tsx`

The corrected hotfix is now in the live route and the accidental nested `app/app` folder has been removed. This means future floating generation uses the stable detection logic and excludes Mikaela.

## Removed

A total of **51 redundant files** were removed, including:

- `.env`, `.DS_Store`, `.expo` cache output and embedded ZIP archives.
- Python patch scripts and `.before-*` backup copies.
- Duplicate root-level screens outside Expo Router's `app` directory.
- The accidental nested `app/app` route.
- Retired API/share-code files.
- Duplicate hooks and unused libraries, types, styles, components and images.
- Docker/Bun files that were not part of the Vercel/Expo deployment workflow.

See `CLEANUP-REMOVED-FILES.txt` for the exact deletion list.

## Consolidated and corrected

- Four near-identical admin reporting screens now use one shared `WeeklyReportScreen` component.
- Repeated `useSchedule()` subscriptions were consolidated where safe.
- Unused variables, imports, helpers and dead status functions were removed.
- Location defaults were centralised in `constants/location.ts`:
  - location ID: `B2`
  - display name: `Day Program`
  - timezone: `Australia/Sydney`
- Missing chores/checklist fallback aliases were corrected.
- Missing Additional Transport dashboard styles were restored.
- Duplicate style definitions were removed.
- Vercel configuration now uses the Expo static export only; the retired API rewrite was removed.
- `.gitignore` now blocks Expo cache, operating-system artefacts, backup copies and ZIP archives.

## Size, dependency and quality results

| Measure | Before | Cleaned |
|---|---:|---:|
| Repository files (excluding generated dependencies/builds) | 186 | 140* |
| Repository payload | 10.75 MB | approximately 5.45 MB |
| Direct dependencies | 58 | 25 |
| Installed dependency tree | 1,263 packages | 978 packages |
| NPM audit findings | 46, including 1 critical and 18 high | 13 moderate; 0 high/critical |
| Duplicate source lines | 11.70% | 3.27% |
| Expo lint | 77 warnings | 0 warnings/errors |
| Production export | Pass | Pass |
| Exported web payload | approximately 15 MB | approximately 12 MB |

\*Includes the audit and deletion manifest added by this cleanup.

The largest real browser improvement came from resizing oversized staff/background images. Unused source files do not normally enter the browser bundle, but removing them reduces repository noise, install/deploy work, vulnerability exposure and the likelihood of future edits landing in the wrong file.

## Remaining work before multi-location

### 1. Strict TypeScript cleanup

`npm run typecheck` currently reports **70 errors**. Vercel's Expo export still passes, but the type errors reduce confidence during future architectural changes. They are concentrated in:

- `app/dashboard.tsx`
- `app/edit/assignments.tsx`
- `app/edit/participants.tsx`
- `app/settings/participants.tsx`
- `app/settings/staff.tsx`

Resolve these in a separate branch with screen-by-screen regression testing.

### 2. Break up oversized screens

The largest files remain:

- `app/edit/events-meetings-visits.tsx` — approximately 3,200 lines
- `app/edit/floating.tsx` — approximately 2,160 lines
- `components/dashboard/dashboardStyles.ts` — approximately 1,685 lines
- `app/edit/assignments.tsx` — approximately 1,420 lines
- `app/edit/outings.tsx` — approximately 1,410 lines
- `app/create-schedule.tsx` — approximately 1,390 lines

Move data access, validation, forms and reusable UI sections into dedicated modules before adding location-specific branches.

### 3. Centralise Supabase access

Supabase calls are currently spread across 18 files. Before multi-location, introduce service/repository modules so every query receives an explicit `locationId` and date. This will reduce duplicated filtering rules and the risk of one screen accidentally reading another location's data.

### 4. Review dashboard data refresh strategy

The dashboard currently uses a 30-second clock update and a periodic schedule/events refresh. This is reasonable for the existing Day Program television, but multiple locations and displays may increase repeated queries. Consider one consolidated refresh service or Supabase Realtime subscriptions after measuring actual usage.

### 5. Remove the hardcoded production Supabase fallback

`lib/supabase.ts` still contains a production fallback so this cleanup does not unexpectedly break the current deployment. After confirming Vercel Production and Preview environment variables, remove that fallback and ensure Preview deployments can connect only to staging.

### 6. Remaining duplication

The remaining 3.27% duplication is mainly shared form/UI logic between Staff and Participant settings. Consolidate this only after the strict typing pass, because these are large operational forms.

### 7. Add regression coverage and audit logging

Before multi-location, add focused tests for:

- today-only schedule retrieval
- location isolation
- floating assignment stability and Mikaela exclusion
- three outing groups, including Additional Transport
- dashboard empty state and refresh
- save identity/audit records for sensitive schedule changes

## Validation performed

- `npm ci --legacy-peer-deps` — pass
- `npm run build` — pass
- `npm run lint` — pass with zero warnings/errors
- Local import scan — zero unresolved imports
- Exact duplicate-file scan — zero duplicate files
- Archive contaminant scan — zero `.env`, backup, embedded ZIP or patch artefacts
- NPM audit — 13 moderate, zero high/critical
- `npm run typecheck` — 70 errors remain and are documented above

## Deployment note

This is a **full cleaned repository**, not an overlay patch. When applying through Git, use `git add -A` so deletions are recorded. Uploading only the replacement files through the GitHub website would leave the obsolete files behind.
