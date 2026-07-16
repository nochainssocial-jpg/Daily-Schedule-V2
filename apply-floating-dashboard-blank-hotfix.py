#!/usr/bin/env python3
"""Apply the Floating dashboard blank-page guard to app/dashboard.tsx.

Run from the repository root:
    python apply-floating-dashboard-blank-hotfix.py
"""
from __future__ import annotations

from pathlib import Path
import shutil
import sys

TARGET = Path("app/dashboard.tsx")
BACKUP = Path("app/dashboard.tsx.before-floating-blank-hotfix")

HELPER_MARKER = 'const FLOATING_ROOM_KEYS = ["frontRoom", "scotty", "twins"] as const;'
DERIVED_MARKER = "const showFloatingPanel = floatingIsOperational && hasFloatingAssignments;"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} marker, found {count}.")
    return text.replace(old, new, 1)


def main() -> int:
    if not TARGET.exists():
        print(f"ERROR: {TARGET} was not found. Run this script from the repository root.")
        return 1

    original = TARGET.read_text(encoding="utf-8")

    if HELPER_MARKER in original and DERIVED_MARKER in original:
        print("Hotfix is already applied. No changes made.")
        return 0

    text = original

    helper_anchor = '''function getPreviewTimeParam(): string | null {
'''
    helper = '''const FLOATING_ROOM_KEYS = ["frontRoom", "scotty", "twins"] as const;

function hasAssignedFloatingStaff(value: any): boolean {
  if (!value || typeof value !== "object") return false;

  // Compatibility with the older direct room shape.
  if (FLOATING_ROOM_KEYS.some((room) => Boolean(value?.[room]))) return true;

  // Current shape: time-slot id -> room assignments.
  return Object.values(value).some(
    (row: any) =>
      row &&
      typeof row === "object" &&
      FLOATING_ROOM_KEYS.some((room) => Boolean(row?.[room])),
  );
}

function getPreviewTimeParam(): string | null {
'''
    text = replace_once(text, helper_anchor, helper, "preview helper")

    slots_anchor = '''const displayTimeSlots =
(timeSlots && timeSlots.length ? timeSlots : TIME_SLOTS) || [];
'''
    if slots_anchor not in text:
        slots_anchor = '''const displayTimeSlots =
  (timeSlots && timeSlots.length ? timeSlots : TIME_SLOTS) || [];
'''

    derived = slots_anchor + '''
const hasFloatingAssignments = useMemo(
() => hasAssignedFloatingStaff(floatingAssignments),
[floatingAssignments],
);
const showFloatingPanel = floatingIsOperational && hasFloatingAssignments;
'''
    text = replace_once(text, slots_anchor, derived, "displayTimeSlots")

    page_count = text.count('add("floating", floatingIsOperational);')
    if page_count < 1:
        raise RuntimeError(
            'Could not find add("floating", floatingIsOperational); in app/dashboard.tsx.'
        )
    text = text.replace(
        'add("floating", floatingIsOperational);',
        'add("floating", showFloatingPanel);',
    )

    dependency_count = text.count("floatingIsOperational,")
    if dependency_count != 1:
        raise RuntimeError(
            f"Expected one floatingIsOperational dependency, found {dependency_count}."
        )
    text = text.replace("floatingIsOperational,", "showFloatingPanel,", 1)

    banner_anchor = '''      <FloatingRotationBanner
        displayTimeSlots={displayTimeSlots}
        floatingAssignments={floatingAssignments}
        staffById={staffById}
        currentMinutes={currentMinutes}
      />'''
    if banner_anchor not in text:
        banner_anchor = '''<FloatingRotationBanner
        displayTimeSlots={displayTimeSlots}
        floatingAssignments={floatingAssignments}
        staffById={staffById}
        currentMinutes={currentMinutes}
      />'''

    banner_replacement = '''      {hasFloatingAssignments ? (
        <FloatingRotationBanner
          displayTimeSlots={displayTimeSlots}
          floatingAssignments={floatingAssignments}
          staffById={staffById}
          currentMinutes={currentMinutes}
        />
      ) : null}'''
    text = replace_once(text, banner_anchor, banner_replacement, "floating banner")

    if text == original:
        raise RuntimeError("No changes were produced.")

    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
    TARGET.write_text(text, encoding="utf-8")

    print(f"Updated: {TARGET}")
    print(f"Backup:  {BACKUP}")
    print(f"Replaced {page_count} Floating page-rotation condition(s).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
