// app/admin/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import NotificationToaster from '@/components/NotificationToaster';

const PINK = '#FF8FC5';
const DARK_GREY = '#444444';

function AdminHeaderTitle({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ShieldCheck size={24} color={PINK} />
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
    <>
      {/* 🔔 Notifications appear in all Admin screens */}
      <NotificationToaster />

      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: DARK_GREY },
          headerTintColor: PINK,
        }}
      >
        {/* MAIN ADMIN HOME */}
        <Stack.Screen
          name="index"
          options={{
            headerTitle: () => <AdminHeaderTitle label="Admin" />,
          }}
        />

        {/* TEAM DAILY ASSIGNMENTS REPORT */}
        <Stack.Screen
          name="daily-assignments"
          options={{
            headerTitle: () => (
              <AdminHeaderTitle label="Team Daily Assignment – Weekly Report" />
            ),
          }}
        />

        {/* CLEANING REPORT */}
        <Stack.Screen
          name="cleaning-assignments"
          options={{
            headerTitle: () => (
              <AdminHeaderTitle label="Cleaning – Weekly Report" />
            ),
          }}
        />

        {/* TEAM DAILY TRACKER */}
        <Stack.Screen
          name="daily-assignments-tracker"
          options={{
            headerTitle: () => (
              <AdminHeaderTitle label="Team Daily Assignments Tracker" />
            ),
          }}
        />

        {/* CLEANING TRACKER */}
        <Stack.Screen
          name="daily-cleaning-tracker"
          options={{
            headerTitle: () => (
              <AdminHeaderTitle label="Cleaning Assignments Tracker" />
            ),
          }}
        />
      </Stack>
    </>
  );
}
