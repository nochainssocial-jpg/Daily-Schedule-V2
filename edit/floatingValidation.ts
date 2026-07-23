export type FloatingRoomKey = "frontRoom" | "scotty" | "twins";

export type FloatingConflict = {
  slotId: string;
  staffId: string;
  rooms: FloatingRoomKey[];
};

const ROOM_KEYS: FloatingRoomKey[] = ["frontRoom", "scotty", "twins"];
const IGNORED_ASSIGNMENT_IDS = new Set(["__OFFSITE__"]);

export function findFloatingAssignmentConflicts(
  assignments: Record<string, Partial<Record<FloatingRoomKey, string>>> | null | undefined,
): FloatingConflict[] {
  const conflicts: FloatingConflict[] = [];

  Object.entries(assignments || {}).forEach(([slotId, row]) => {
    const roomsByStaff = new Map<string, FloatingRoomKey[]>();

    ROOM_KEYS.forEach((room) => {
      const staffId = row?.[room] ? String(row[room]) : "";
      if (!staffId || IGNORED_ASSIGNMENT_IDS.has(staffId)) return;
      roomsByStaff.set(staffId, [...(roomsByStaff.get(staffId) || []), room]);
    });

    roomsByStaff.forEach((rooms, staffId) => {
      if (rooms.length > 1) conflicts.push({ slotId, staffId, rooms });
    });
  });

  return conflicts;
}

export function conflictCellKey(slotId: string, room: FloatingRoomKey): string {
  return `${slotId}:${room}`;
}
