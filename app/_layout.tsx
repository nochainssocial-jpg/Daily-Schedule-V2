// app/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import {
  Home as HomeIcon,
  Edit as Edit3Icon,
  Share as Share2Icon,
  Settings as SettingsIcon,
  HelpCircle as HelpCircleIcon,
} from 'lucide-react-native';
import NotificationToaster from '@/components/NotificationToaster';

const PINK = '#FF8FC5';
const WHITE = '#FFFFFF';

function HeaderTitle({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

export default function RootLayout() {
  return (
    <>
      {/* 🔔 Single global toaster for non-admin / non-edit screens */}
      <NotificationToaster />

      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerTintColor: PINK,
          headerStyle: { backgroundColor: WHITE },
        }}
      >
        {/* Landing / auth screen usually hides header */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Home */}
        <Stack.Screen
          name="home"
          options={{
            headerTitle: () => (
              <HeaderTitle
                icon={<HomeIcon size={24} color={PINK} />}
                label="Daily Schedule"
              />
            ),
          }}
        />

        {/* Edit hub has its own /app/edit/_layout.tsx stack */}
        <Stack.Screen name="edit" options={{ headerShown: false }} />

        {/* Share schedule */}
        <Stack.Screen
          name="share-schedule"
          options={{
            headerTitle: () => (
              <HeaderTitle
                icon={<Share2Icon size={24} color={PINK} />}
                label="Share schedule"
              />
            ),
          }}
        />

        {/* Settings */}
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />

        {/* Admin section – header comes from /app/admin/_layout.tsx */}
        <Stack.Screen name="admin" options={{ headerShown: false }} />

        {/* Help */}
        <Stack.Screen
          name="help"
          options={{
            headerTitle: () => (
              <HeaderTitle
                icon={<HelpCircleIcon size={24} color={PINK} />}
                label="Help"
              />
            ),
          }}
        />
      </Stack>
    </>
  );
}
