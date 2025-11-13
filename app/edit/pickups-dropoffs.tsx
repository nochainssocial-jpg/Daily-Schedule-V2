// app/edit/pickups-dropoffs.tsx
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSchedule } from '@/hooks/schedule-store';
import {
  STAFF as STATIC_STAFF,
  PARTICIPANTS as STATIC_PARTICIPANTS,
} from '@/constants/data';
import Chip from '@/components/Chip';

type ID = string;

export default function EditPickupsDropoffsScreen() {
  const {
    staff: scheduleStaff,
    participants: scheduleParts,
    workingStaff,
    attendingParticipants,
    pickupParticipants,
    helperStaff,
    dropoffAssignments,
    updateSchedule,
  } = useSchedule();

  const staff = (scheduleStaff && scheduleStaff.length ? scheduleStaff : STATIC_STAFF) as typeof STATIC_STAFF;
  const participants = (scheduleParts && scheduleParts.length ? scheduleParts : STATIC_PARTICIPANTS) as typeof STATIC_PARTICIPANTS;

  const staffById = new Map(staff.map((s) => [s.id, s]));
  const participantById = new Map(participants.map((p) => [p.id, p]));

  // Participants who are attending AND not pickup (so they need a dropoff staff)
  const dropoffCandidates = useMemo(
    () =>
      participants.filter(
        (p) =>
          attendingParticipants.includes(p.id) &&
          !pickupParticipants.includes(p.id),
      ),
    [participants, attendingParticipants, pickupParticipants],
  );

  // Participants being picked up by third party (for display only here)
  const pickupList = useMemo(
    () => participants.filter((p) => pickupParticipants.includes(p.id)),
    [participants, pickupParticipants],
  );

  // Helper staff = staff (not working) selected as helpers
  const nonWorkingStaff = useMemo(
    () => staff.filter((s) => !workingStaff.includes(s.id)),
    [staff, workingStaff],
  );

  const helpers = useMemo(
    () => nonWorkingStaff.filter((s) => helperStaff.includes(s.id)),
    [nonWorkingStaff, helperStaff],
  );

  // Dropoff staff = working staff + helpers
  const dropoffStaffIds: ID[] = useMemo(
    () => Array.from(new Set([...workingStaff, ...helperStaff])),
    [workingStaff, helperStaff],
  );

  const dropoffStaff = dropoffStaffIds
    .map((id) => staffById.get(id))
    .filter(Boolean) as typeof staff;

  // Compute unassigned participants (for dropoffs)
  const assignedSet = new Set<ID>();
  Object.values(dropoffAssignments || {}).forEach((pids) =>
    (pids || []).forEach((pid) => assignedSet.add(pid)),
  );
  const unassignedParticipants = dropoffCandidates.filter((p) => !assignedSet.has(p.id));

  // Inline "modal" state for picking staff for an unassigned participant
  const [modalParticipantId, setModalParticipantId] = useState<ID | null>(null);
  const [modalStaffId, setModalStaffId] = useState<ID | null>(null);

  const modalParticipant = modalParticipantId
    ? participantById.get(modalParticipantId)
    : null;

  const openStaffPicker = (participantId: ID) => {
    setModalParticipantId(participantId);
    // Default to first dropoff staff if available
    setModalStaffId(dropoffStaffIds[0] || null);
  };

  const closeStaffPicker = () => {
    setModalParticipantId(null);
    setModalStaffId(null);
  };

  const confirmStaffPicker = () => {
    if (!modalParticipantId || !modalStaffId) {
      closeStaffPicker();
      return;
    }

    const pid = modalParticipantId;
    const sid = modalStaffId;

    // Remove this participant from all staff dropoff lists first
    const current = dropoffAssignments || {};
    const next: Record<ID, ID[]> = {};
    Object.entries(current).forEach(([staffId, pids]) => {
      const cleaned = (pids || []).filter((id) => id !== pid);
      next[staffId as ID] = cleaned;
    });

    // Add to chosen staff
    const existing = next[sid] || [];
    next[sid] = [...existing, pid];

    updateSchedule({ dropoffAssignments: next });
    closeStaffPicker();
  };

  const toggleHelper = (staffId: ID) => {
    const current = helperStaff || [];
    const isHelper = current.includes(staffId);
    const nextHelpers = isHelper
      ? current.filter((id) => id !== staffId)
      : [...current, staffId];

    updateSchedule({ helperStaff: nextHelpers });
  };

  const unassignFromStaff = (staffId: ID, participantId: ID) => {
    const current = dropoffAssignments || {};
    const next: Record<ID, ID[]> = {};

    Object.entries(current).forEach(([sid, pids]) => {
      if (sid === staffId) {
        next[sid as ID] = (pids || []).filter((id) => id !== participantId);
      } else {
        next[sid as ID] = pids || [];
      }
    });

    updateSchedule({ dropoffAssignments: next });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Pickups &amp; Dropoffs</Text>
          <Text style={styles.subtitle}>
            Review which participants are picked up by third parties, who is helping with
            dropoffs, and which staff are responsible for each dropoff at the end of the day.
          </Text>

          {/* Pickups section */}
          <Text style={styles.sectionTitle}>Pickups (Third Party)</Text>
          {pickupList.length === 0 ? (
            <Text style={styles.empty}>
              No participants marked for third-party pickup in this schedule.
            </Text>
          ) : (
            pickupList.map((p) => (
              <Text key={p.id} style={styles.rowText}>
                • {p.name}
              </Text>
            ))
          )}

          {/* Helpers section */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Helpers</Text>
          <Text style={styles.helperText}>
            Helpers are staff who are not working at B2 but are supporting with dropoffs.
            Tap to add or remove helpers.
          </Text>
          <View style={styles.chipRow}>
            {nonWorkingStaff.length === 0 ? (
              <Text style={styles.empty}>
                All staff are currently marked as working at B2.
              </Text>
            ) : (
              nonWorkingStaff.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={helperStaff.includes(s.id)}
                  onPress={() => toggleHelper(s.id)}
                  style={styles.staffChip}
                />
              ))
            )}
          </View>

          {/* Dropoffs section */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Dropoffs</Text>
          {dropoffStaff.length === 0 ? (
            <Text style={styles.empty}>
              No dropoff staff available. Add working staff and/or helpers to manage dropoffs.
            </Text>
          ) : (
            dropoffStaff.map((s) => {
              const pids = dropoffAssignments?.[s.id] || [];
              const drops = pids
                .map((id) => participantById.get(id))
                .filter(Boolean) as typeof participants;

              return (
                <View key={s.id} style={styles.staffBlock}>
                  <Text style={styles.staffTitle}>{s.name}</Text>
                  {drops.length === 0 ? (
                    <Text style={styles.emptySmall}>No dropoffs assigned yet.</Text>
                  ) : (
                    drops.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.assignedRow}
                        onPress={() => unassignFromStaff(s.id, p.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.rowText}>{p.name}</Text>
                        <Text style={styles.unassignHint}>Tap to unassign</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              );
            })
          )}

          {/* Unassigned section */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Unassigned</Text>
          <Text style={styles.helperText}>
            These participants are attending and require a dropoff, but do not yet have a staff
            member assigned. Tap to select who will drop them off.
          </Text>
          {unassignedParticipants.length === 0 ? (
            <Text style={styles.empty}>No unassigned participants for dropoffs.</Text>
          ) : (
            unassignedParticipants.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.unassignedRow}
                onPress={() => openStaffPicker(p.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.rowText}>{p.name}</Text>
                <Text style={styles.assignHint}>Tap to assign staff</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Inline "modal" staff picker */}
      {modalParticipant && dropoffStaff.length > 0 && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Who will drop off {modalParticipant.name}?
            </Text>
            <View style={styles.chipRow}>
              {dropoffStaff.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={modalStaffId === s.id}
                  onPress={() => setModalStaffId(s.id)}
                  style={styles.staffChip}
                />
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={closeStaffPicker}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={confirmStaffPicker}
              >
                <Text style={styles.modalButtonPrimaryText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const MAX_WIDTH = 880;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
  },
  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: '#332244',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 16,
    color: '#5a486b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#3c234c',
  },
  rowText: {
    fontSize: 14,
    color: '#4c3b5c',
  },
  helperText: {
    fontSize: 12,
    opacity: 0.8,
    color: '#7a688c',
    marginBottom: 6,
  },
  empty: {
    fontSize: 13,
    opacity: 0.75,
    color: '#7a688c',
  },
  emptySmall: {
    fontSize: 12,
    opacity: 0.75,
    color: '#7a688c',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  staffChip: {
    marginBottom: 8,
  },
  staffBlock: {
    marginBottom: 8,
  },
  staffTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#3c234c',
  },
  assignedRow: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fbe4f0',
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  unassignHint: {
    fontSize: 11,
    color: '#7a4860',
    marginLeft: 8,
  },
  unassignedRow: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4d7f0',
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assignHint: {
    fontSize: 11,
    color: '#e91e63',
    marginLeft: 8,
  },
  // Inline "modal" styles
  modalBackdrop: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0, top: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#e5d9f2',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: '#3c234c',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  modalButtonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  modalButtonSecondaryText: {
    fontSize: 13,
    color: '#4c3b5c',
  },
  modalButtonPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e91e63',
  },
  modalButtonPrimaryText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
});
