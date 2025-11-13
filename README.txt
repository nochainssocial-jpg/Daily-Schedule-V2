Cleaned Daily-Schedule front-end skeleton
=========================================

This ZIP contains a *clean* front-end structure for the Daily Schedule app, with:

- Canonical routes
- Single source of truth Zustand schedule store
- Minimal create wizard (3 steps)
- Edit Hub with 7 categories
- Simple, compile-friendly components only
- No backend / API

How to use
----------

1. Create a new Expo Router / React Native web project (or clone your existing repo).
2. Drop these folders into the project root, replacing older versions:

   - app/
   - components/
   - constants/
   - hooks/

3. Ensure your tsconfig / metro config allow "@/..." path aliases mapped to the project root.
4. `npm install` / `yarn` as usual, then run / deploy via Vercel.

Flow
----

- Home (/home) -> "Create Schedule"
- Create wizard (/create-schedule) with 3 steps:

  1. The Dream Team (Working at B2)
  2. Attending Participants
  3. End of Shift Checklist (select who is last to leave)

- Press "Finish & Go to Edit Hub" to:

  - Build a ScheduleSnapshot via `persistFinish`
  - Store it in Zustand via `createSchedule`
  - Navigate to the Edit Hub (/edit)

- Edit Hub tiles navigate to:

  - /edit/dream-team
  - /edit/participants
  - /edit/assignments
  - /edit/floating
  - /edit/cleaning
  - /edit/pickups-dropoffs
  - /edit/checklist

From here you can incrementally add more complex UI and logic without fighting
old patch files, duplicate screens, or mismatched store keys.
