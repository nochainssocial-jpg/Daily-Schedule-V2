import { isFsoSlot, parseTimeToMinutes, slotWindow } from "./dashboardUtils";
import type { RoomKey } from "./dashboardTypes";

export type FloatingCellVariant = "normal" | "empty" | "offsite" | "notAttending";

export type FloatingCellState = {
  label: string;
  variant: FloatingCellVariant;
  showFso: boolean;
  staffId: string | null;
  staffPerson: any | null;
};

type FloatingDisplayContext = {
  participantGroups: Record<RoomKey, string[]>;
  attendingSet: Set<string>;
  roomNotAttending: Record<RoomKey, boolean>;
  activeOutings: any[];
};

const ROOM_PARTICIPANT_NAMES: Record<RoomKey, string[]> = {
  frontRoom: ["Paul", "Jessica", "Naveed", "Tiffany", "Sumera", "Jacob"],
  scotty: ["Scott"],
  twins: ["Zara", "Zoya"],
};

function getOutingWindowMinutes(outing: any): { start: number | null; end: number | null } {
  const start = parseTimeToMinutes(outing?.startTime);
  const end = parseTimeToMinutes(outing?.endTime);
  if (start == null || end == null || end <= start) {
    return { start: null, end: null };
  }
  return { start, end };
}

function timesOverlap(
  firstStart: number | null,
  firstEnd: number | null,
  secondStart: number | null,
  secondEnd: number | null,
): boolean {
  if (firstStart == null || firstEnd == null) return false;
  if (secondStart == null || secondEnd == null) return false;
  return firstStart < secondEnd && secondStart < firstEnd;
}

function getOutingIdsForSlot(
  slot: any,
  outings: any[],
  key: "staffIds" | "participantIds",
): Set<string> {
  const ids = new Set<string>();
  const window = slotWindow(slot);

  (outings || []).forEach((outing) => {
    const outingWindow = getOutingWindowMinutes(outing);

    // If no valid outing time is entered, treat it as all-day offsite.
    const overlaps =
      outingWindow.start == null || outingWindow.end == null
        ? true
        : timesOverlap(window.start, window.end, outingWindow.start, outingWindow.end);

    if (!overlaps) return;

    ((outing?.[key] ?? []) as any[]).forEach((id) => ids.add(String(id)));
  });

  return ids;
}

function buildParticipantGroups(participantsById: Map<string, any>): Record<RoomKey, string[]> {
  const idByName = new Map<string, string>();

  participantsById.forEach((participant, id) => {
    const name = String(participant?.name || "").trim().toLowerCase();
    if (name) idByName.set(name, String(id));
  });

  const pick = (names: string[]) =>
    names
      .map((name) => idByName.get(name.trim().toLowerCase()))
      .filter(Boolean) as string[];

  return {
    frontRoom: pick(ROOM_PARTICIPANT_NAMES.frontRoom),
    scotty: pick(ROOM_PARTICIPANT_NAMES.scotty),
    twins: pick(ROOM_PARTICIPANT_NAMES.twins),
  };
}

export function buildFloatingDisplayContext({
  participantsById,
  attendingParticipants,
  activeOutings = [],
}: {
  participantsById: Map<string, any>;
  attendingParticipants: any[];
  activeOutings?: any[];
}): FloatingDisplayContext {
  const participantGroups = buildParticipantGroups(participantsById);
  const attendingSet = new Set<string>((attendingParticipants || []).map(String));

  const roomNotAttending = (Object.keys(participantGroups) as RoomKey[]).reduce(
    (result, room) => {
      const ids = participantGroups[room] || [];
      result[room] = ids.length > 0 && ids.every((id) => !attendingSet.has(String(id)));
      return result;
    },
    {} as Record<RoomKey, boolean>,
  );

  return {
    participantGroups,
    attendingSet,
    roomNotAttending,
    activeOutings: activeOutings || [],
  };
}

function isRoomOffsiteForSlot(
  room: RoomKey,
  slot: any,
  context: FloatingDisplayContext,
): boolean {
  const ids = context.participantGroups[room] || [];
  if (!ids.length) return false;

  const attendingRoomIds = ids.filter((id) => context.attendingSet.has(String(id)));
  if (!attendingRoomIds.length) return false;

  const outingParticipantIds = getOutingIdsForSlot(
    slot,
    context.activeOutings,
    "participantIds",
  );
  const offsiteCount = attendingRoomIds.filter((id) =>
    outingParticipantIds.has(String(id)),
  ).length;
  const onsiteCount = attendingRoomIds.length - offsiteCount;

  return offsiteCount > 0 && onsiteCount === 0;
}

function isStaffOffsiteForSlot(
  slot: any,
  staffId: string | null,
  context: FloatingDisplayContext,
): boolean {
  if (!staffId) return false;
  return getOutingIdsForSlot(slot, context.activeOutings, "staffIds").has(String(staffId));
}

function slotHasOuting(slot: any, activeOutings: any[]): boolean {
  const window = slotWindow(slot);

  return (activeOutings || []).some((outing) => {
    const outingWindow = getOutingWindowMinutes(outing);

    // If no valid outing time is entered, treat it as all-day offsite.
    if (outingWindow.start == null || outingWindow.end == null) return true;

    return timesOverlap(window.start, window.end, outingWindow.start, outingWindow.end);
  });
}

export function resolveFloatingCellState({
  room,
  slot,
  row,
  staffById,
  context,
}: {
  room: RoomKey;
  slot: any;
  row: any;
  staffById: Map<string, any>;
  context: FloatingDisplayContext;
}): FloatingCellState {
  const fso = room === "twins" && isFsoSlot(slot);

  if (isRoomOffsiteForSlot(room, slot, context)) {
    return {
      label: "On Outing (Offsite)",
      variant: "offsite",
      showFso: false,
      staffId: null,
      staffPerson: null,
    };
  }

  if (context.roomNotAttending[room]) {
    return {
      label: "Not attending",
      variant: "notAttending",
      showFso: false,
      staffId: null,
      staffPerson: null,
    };
  }

  const staffId = row?.[room] ? String(row[room]) : null;

  if (staffId && isStaffOffsiteForSlot(slot, staffId, context)) {
    return {
      label: "On Outing (Offsite)",
      variant: "offsite",
      showFso: false,
      staffId: null,
      staffPerson: null,
    };
  }

  const staffPerson = staffId ? staffById.get(staffId) : null;
  const name = staffPerson?.name ? String(staffPerson.name) : "—";

  if (name === "—" && slotHasOuting(slot, context.activeOutings)) {
    return {
      label: "On Outing (Offsite)",
      variant: "offsite",
      showFso: false,
      staffId: null,
      staffPerson: null,
    };
  }

  return {
    label: name,
    variant: name === "—" ? "empty" : "normal",
    showFso: fso && name !== "—",
    staffId,
    staffPerson,
  };
}
