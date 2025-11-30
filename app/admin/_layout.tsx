// app/admin/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import {
  ChartBarStacked,
  Broom,
  ShieldCheck,
  AccountGroup,
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
  const pathname = usePathname();

  // Determine which screen we're on (dynamic, always correct)
  function getHeader() {
    if (pathname.endsWith('/admin')) {
      return {
        icon: <ShieldCheck size={24} color={PINK} />,
        label: 'Admin',
      };
    }

    if (pathname.includes('daily-assignments') && !pathname.includes('tracker')) {
      return {
        icon: <ChartBarStacked size={24} color={PINK} />,
        label: 'Team Daily Assignment – Weekly Report',
      };
    }

    if (pathname.includes('cleaning-assignments') && !pathname.includes('tracker')) {
      return {
        icon: <ChartBarStacked size={24} color={PINK} />,
        label: 'Cleaning – Weekly Report',
      };
    }

    if (pathname.includes('dailyAssignmentsTracker') || pathname.includes('daily-assignments-tracker')) {
      return {
        icon: <AccountGroup size={24} color={PINK} />,
        label: 'Team Daily Assignments Tracker',
      };
    }

    if (pathname.includes('dailyCleaningTracker') || pathname.includes('daily-cleaning-tracker')) {
      return {
        icon: <Broom size={24} color={PINK} />,
        label: 'Cleaning Assignments Tracker',
      };
    }

    // Fallback — shouldn't ever hit
    return {
      icon: <ShieldCheck size={24} color={PINK} />,
      label: 'Admin',
    };
  }

  const header = getHeader();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: PINK,
        headerStyle: { backgroundColor: WHITE },
        headerTitle: () => <AdminHeaderTitle icon={header.icon} label={header.label} />,
      }}
    >
      {/* We do not need per-screen definitions anymore */}
      <Stack.Screen name="index" />
      <Stack.Screen name="daily-assignments" />
      <Stack.Screen name="cleaning-assignments" />
      <Stack.Screen name="dailyAssignmentsTracker" />
      <Stack.Screen name="dailyCleaningTracker" />
      {/* These ensure any filename variant still works */}
      <Stack.Screen name="daily-assignments-tracker" />
      <Stack.Screen name="daily-cleaning-tracker" />
    </Stack>
  );
}
