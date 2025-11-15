// hooks/schedule-adapter.ts
// Thin adapter so older imports keep working.
// We re-export the real hook from schedule-store.

import { useSchedule as baseUseSchedule } from "./schedule-store";

export default function useSchedule() {
  return baseUseSchedule();
}

// (Optional) also expose a named export for convenience
export { baseUseSchedule as useSchedule };
