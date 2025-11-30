ule// app/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import {
  Home as HomeIcon,
  Edit as Edit3Icon,
  Share as Share2Icon,
  Settings as SettingsIcon,
  ShieldCheck as ShieldCheckIcon,
  HelpCircle as HelpCircleIcon,
} from 'lucide-react-native';

// 🔔 GLOBAL TOASTER
import NotificationToaster from '@/components/NotificationToaster';

const PINK = '#FF8FC5';

function HeaderTitle({
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

export default function RootLayout() {
  return (
    <>
      {/* 🔔 GLOBAL NOTIFICATION PANEL */}
      <NotificationToaster />

      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerTintColor: PINK,
          headerStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        {/* EDIT HUB — let the screen itself control the header */}
        <Stack.Screen
          name="edit"
          options={{
            headerShown: false,
          }}
        />

        {/* HOME */}
        <Stack.Screen
          name="home"
          options={{
            headerTitle: () => (
              <HeaderTitle
                icon={<HomeIcon size={24} color={PINK} />}
                label="Home"
              />
            ),
          }}
        />

        {/* SHARE */}
        <Stack.Screen
          name="share"
          options={{
            headerTitle: () => (
              <HeaderTitle
                icon={<Share2Icon size={24} color={PINK} />}
                label="Share Today's Schedule"
              />
            ),
          }}
        />

        {/* ADMIN */}
        <Stack.Screen
          name="admin/index"
          options={{
            headerTitle: () => (
              <HeaderTitle
                icon={<ShieldCheckIcon size={24} color={PINK} />}
                label="Admin Console"
              />
            ),
          }}
        />

        {/* SETTINGS */}
        <Stack.Screen
          name="settings"
          options={{
            headerTitle: () => (
              <HeaderTitle
                icon={<SettingsIcon size={24} color={PINK} />}
                label="Settings"
              />
            ),
          }}
        />

        {/* HELP */}
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
