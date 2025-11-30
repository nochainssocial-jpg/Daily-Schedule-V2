// app/admin/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import NotificationToaster from '@/components/NotificationToaster';

// Icons (Lucide)
import {
  ChartBarStacked,
  Broom,
  ShieldCheck,
  AccountGroup,
} from 'lucide-react-native';

const PINK = '#FF8FC5';
const WHITE = '#FFFFFF';

function AdminHeaderTitle({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
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

        {/* MAIN ADMIN HOME */}
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

        {/* TEAM DAILY ASSIGNMENTS REPORT */}
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

        {/* CLEANING REPORT */}
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

        {/* TEAM DAILY TRACKER */}
        <Stack.Screen
          name="daily-assignments-tracker"
          options={{
            headerTitle: () => (
              <AdminHeaderTitle
                icon={<AccountGroup size={24} color={PINK} />}
                label="Team Daily Assignments Tracker"
              />
            ),
          }}
        />

        {/* CLEANING TRACKER */}
        <Stack.Screen
          name="daily-cleaning-tracker"
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
    </>
  );
}
