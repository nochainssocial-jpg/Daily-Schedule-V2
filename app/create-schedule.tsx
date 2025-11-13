// app/create-schedule.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ROUTES } from '@/constants/ROUTES';
import { STAFF, PARTICIPANTS } from '@/constants/data';
import SectionHeader from '@/components/SectionHeader';
import Chip from '@/components/Chip';
import { useSchedule } from '@/hooks/schedule-store';
import { persistFinish } from '@/hooks/persist-finish';

type ID = string;

export default function CreateScheduleScreen() {
  const { createSchedule } = useSchedule();
  const [step, setStep] = useState(1);
  const [workingStaff, setWorkingStaff] = useState<ID[]>([]);
  const [attendingParticipants, setAttendingParticipants] = useState<ID[]>([]);
  const [finalChecklistStaff, setFinalChecklistStaff] = useState<ID | undefined>();

  const toggleWorking = (id: ID) => {
    setWorkingStaff((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAttending = (id: ID) => {
    setAttendingParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleNext = () => setStep((s) => Math.min(3, s + 1));
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = async () => {
    if (!finalChecklistStaff) {
      alert('Please select who will complete the End of Shift Checklist.');
      return;
    }

    await persistFinish({
      createSchedule,
      staff: STAFF,
      participants: PARTICIPANTS,
      workingStaff,
      attendingParticipants,
      assignments: {},
      finalChecklistStaff,
    });

    router.replace(ROUTES.EDIT);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <Text style={styles.title}>Create today&apos;s schedule</Text>
          <Text style={styles.stepLabel}>Step {step} of 3</Text>

          {step === 1 && (
            <View style={styles.section}>
              <SectionHeader
                title="The Dream Team (Working at B2)"
                subtitle="Tap staff to mark who is working at B2 today."
              />
              <View style={styles.chipGrid}>
                {STAFF.map((st) => (
                  <Chip
                    key={st.id}
                    label={st.name}
                    selected={workingStaff.includes(st.id)}
                    onPress={() => toggleWorking(st.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <SectionHeader
                title="Attending Participants"
                subtitle="Tap participants attending Day Program today."
              />
              <View style={styles.chipGrid}>
                {PARTICIPANTS.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={attendingParticipants.includes(p.id)}
                    onPress={() => toggleAttending(p.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.section}>
              <SectionHeader
                title="End of Shift Checklist"
                subtitle="Who is last to leave and responsible for the checklist?"
              />
              <View style={styles.chipGrid}>
                {workingStaff.length === 0 ? (
                  <Text style={styles.helperText}>
                    Please select at least one Dream Team member in Step 1.
                  </Text>
                ) : (
                  STAFF.filter((s) => workingStaff.includes(s.id)).map((st) => (
                    <Chip
                      key={st.id}
                      label={st.name}
                      selected={finalChecklistStaff === st.id}
                      onPress={() => setFinalChecklistStaff(st.id)}
                    />
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.stepControls}>
        <View style={styles.stepInner}>
          {step > 1 ? (
            <TouchableOpacity style={styles.stepButton} onPress={handleBack}>
              <Text style={styles.stepButtonLabel}>‹ Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {step < 3 ? (
            <TouchableOpacity style={styles.stepButtonPrimary} onPress={handleNext}>
              <Text style={styles.stepButtonPrimaryLabel}>Next ›</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stepButtonPrimary} onPress={handleFinish}>
              <Text style={styles.stepButtonPrimaryLabel}>
                Finish &amp; Go to Edit Hub
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
    paddingTop: 24,
    paddingBottom: 80, // leaves room above step controls
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    color: '#332244',
  },
  stepLabel: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 16,
    color: '#5a486b',
  },
  section: {
    marginBottom: 24,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  helperText: {
    fontSize: 13,
    opacity: 0.75,
    color: '#5a486b',
  },
  stepControls: {
    borderTopWidth: 1,
    borderColor: '#e4d7f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  stepInner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonLabel: {
    fontSize: 14,
    color: '#4c3b5c',
  },
  stepButtonPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#e91e63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPrimaryLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
