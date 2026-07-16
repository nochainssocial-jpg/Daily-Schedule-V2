// app/edit/_layout.tsx
import React, { useEffect } from 'react';
import { ActivityIndicator, TouchableOpacity, View, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Edit3 } from 'lucide-react-native';

// 🔔 ADD THIS
import NotificationToaster from '@/components/NotificationToaster';
import { initScheduleForToday, useSchedule } from '@/hooks/schedule-store';

const PINK = '#F54FA5';
const DARK_GREY = '#444444';

function EditHeaderTitle({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Edit3 size={24} color={PINK} />
      <Text
        style={{
          fontSize: 24,
          fontWeight: '600',
          color: PINK,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function EditLayout() {
  const router = useRouter();
  const segments = useSegments();
  const todayScheduleStatus = useSchedule((state) => state.todayScheduleStatus);
  const scheduleLoadError = useSchedule((state) => state.scheduleLoadError);

  useEffect(() => {
    void initScheduleForToday('B2');
  }, []);

  const routeName = String(segments[1] || 'index');
  const independentRoute =
    routeName === 'index' ||
    routeName === 'outings' ||
    routeName === 'events-meetings-visits';

  if (!independentRoute && (todayScheduleStatus === 'idle' || todayScheduleStatus === 'loading')) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', gap: 12 }}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={{ color: '#4B5563', fontWeight: '600' }}>Loading today&apos;s schedule…</Text>
      </View>
    );
  }

  if (!independentRoute && todayScheduleStatus !== 'ready') {
    const isError = todayScheduleStatus === 'error';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', padding: 24 }}>
        <View style={{ maxWidth: 560, width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#374151', textAlign: 'center' }}>
            {isError ? 'Unable to Load Today’s Schedule' : 'No Schedule Created Yet'}
          </Text>
          <Text style={{ marginTop: 10, fontSize: 15, lineHeight: 22, color: '#6B7280', textAlign: 'center' }}>
            {isError
              ? scheduleLoadError || 'Please check the connection and try again.'
              : 'Create today’s schedule before editing Dream Team, assignments, floating, cleaning, transport or checklist information.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/edit')}
            style={{ marginTop: 22, backgroundColor: PINK, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 11 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Return to Edit Hub</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <NotificationToaster />

      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: DARK_GREY },
          headerTintColor: PINK,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerTitle: () => <EditHeaderTitle label="Edit Hub" />,
          }}
        />

        <Stack.Screen
          name="dream-team"
          options={{
            headerTitle: () => (
              <EditHeaderTitle label="The Dream Team" />
            ),
          }}
        />

        <Stack.Screen
          name="participants"
          options={{
            headerTitle: () => (
              <EditHeaderTitle label="Participants Attending" />
            ),
          }}
        />

        <Stack.Screen
          name="assignments"
          options={{
            headerTitle: () => (
              <EditHeaderTitle label="Team Daily Assignments" />
            ),
          }}
        />

        <Stack.Screen
          name="floating"
          options={{
            headerTitle: () => (
              <EditHeaderTitle label="Floating Assignments" />
            ),
          }}
        />

        <Stack.Screen
          name="cleaning"
          options={{
            headerTitle: () => (
              <EditHeaderTitle label="Cleaning Duties" />
            ),
          }}
        />

        <Stack.Screen
          name="pickups-dropoffs"
          options={{
            headerTitle: () => (
              <EditHeaderTitle label="Pickups & Dropoffs" />
            ),
          }}
        />
        <Stack.Screen
          name="outings"
          options={{
            headerTitle: () => (
              <EditHeaderTitle label="Drive / Outings" />
            ),
          }}
        />

        <Stack.Screen
          name="checklist"
          options={{
            headerTitle: () => (
              <EditHeaderTitle label="Final Checklist" />
            ),
          }}
        />
      </Stack>
    </>
  );
}
