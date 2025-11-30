// app/admin/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';

// Icons must match index tiles EXACTLY
import {
  ChartBarStacked,   // Used for both weekly reports
  Broom,              // Used for cleaning tracker tile
  ShieldCheck,        // Used for Admin home tile
  AccountGroup,       // Used for assignments tracker tile
} from 'lucide-react-native';

const PINK = '#FF8FC5';
const WHITE = '#FFFFFF';

function AdminHeaderTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text style={{ fontSize: 24, fontWeight: '600', color: PINK }}>
        {label}
      </Text>
    </View>
  );
}

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: PINK,
        headerStyle: { backgroundColor: WHITE },
      }}
    >
      {/* ADMIN HOME */}
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => (
            <AdminHeaderTitle
              icon={<ShieldCheck size={24} color={PINK} />}
              label="Admin"
            />
          ),
        }}
      />

      {/* WEEKLY REPORTS */}
      <Stack.Screen
        name="daily-assignments"
        options={{
          headerTitle: () => (
            <AdminHeaderTitle
              icon={<ChartBarStacked size={24} color={PINK} />}
              label="Team Daily Assignment – Weekly Report"
            />
          ),
        }}
      />

      <Stack.Screen
        name="cleaning-assignments"
        options={{
          headerTitle: () => (
            <AdminHeaderTitle
              icon={<ChartBarStacked size={24} color={PINK} />}
              label="Cleaning – Weekly Report"
            />
          ),
        }}
      />

      {/* DAILY TRACKERS */}
      <Stack.Screen
        name="dailyAssignmentsTracker"
        options={{
          headerTitle: () => (
            <AdminHeaderTitle
              icon={<AccountGroup size={24} color={PINK} />}
              label="Team Daily Assignments Tracker"
            />
          ),
        }}
      />

      <Stack.Screen
        name="dailyCleaningTracker"
        options={{
          headerTitle: () => (
            <AdminHeaderTitle
              icon={<Broom size={24} color={PINK} />}
              label="Cleaning Assignments Tracker"
            />
          ),
        }}
      />
    </Stack>
  );
}
