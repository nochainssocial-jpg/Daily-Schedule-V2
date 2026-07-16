export type OutingSlot = 0 | 1 | 2;

const OUTING_ID_TO_SLOT: Record<string, OutingSlot> = {
  "outing-1": 0,
  "outing-2": 1,
  "outing-3": 2,
};

export function getOutingSlot(outing: unknown, fallbackIndex = 0): OutingSlot {
  if (outing && typeof outing === "object") {
    const id = String((outing as { id?: unknown }).id ?? "")
      .trim()
      .toLowerCase();
    if (id in OUTING_ID_TO_SLOT) return OUTING_ID_TO_SLOT[id];
  }
  return Math.max(0, Math.min(2, fallbackIndex)) as OutingSlot;
}

export function getOutingBySlot<T>(
  outings: T[] | null | undefined,
  slot: OutingSlot,
): T | undefined {
  const groups = Array.isArray(outings) ? outings : [];
  return groups.find((group, index) => getOutingSlot(group, index) === slot);
}

export function isSafetyTransport(outing: unknown, fallbackIndex = 0): boolean {
  return getOutingSlot(outing, fallbackIndex) === 2;
}

type OutingTiming = {
  id?: string | null;
  linkedOutingId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  name?: string | null;
};

export function resolveOutingTiming<T extends OutingTiming>(
  outing: T,
  outings: T[] | null | undefined,
): T & { linkedOutingName?: string } {
  if (!isSafetyTransport(outing)) return outing;
  const linked = (Array.isArray(outings) ? outings : []).find(
    (candidate) => String(candidate?.id || "") === String(outing.linkedOutingId || ""),
  );
  if (!linked) return outing;
  return {
    ...outing,
    startTime: linked.startTime || "",
    endTime: linked.endTime || "",
    linkedOutingName: linked.name || undefined,
  };
}
