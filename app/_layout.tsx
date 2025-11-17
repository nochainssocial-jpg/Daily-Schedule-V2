// app/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import {
  Home as HomeIcon,
  Edit3,
  Share2,
  Settings as SettingsIcon,
  HelpCircle,
} from 'lucide-react-native';

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
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: PINK,            // chevron & default icon colour
        headerStyle: { backgroundColor: '#FFFFFF' }, // white header bg
      }}
    >
      {/* EDIT STACK ROOT – header handled by app/edit/_layout.tsx */}
      <Stack.Screen
        name="edit"
        options={{
          headerShown: false, // hide the plain "edit" header
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

      {/* EDIT HUB (edit/index.tsx) – optional if using nested layout */}
      <Stack.Screen
        name="edit/index"
        options={{
          headerTitle: () => (
            <HeaderTitle
              icon={<Edit3 size={24} color={PINK} />}
              label="Edit Hub"
            />
          ),
        }}
      />

      {/* SHARE TODAY'S SCHEDULE */}
      <Stack.Screen
        name="share-schedule"
        options={{
          headerTitle: () => (
            <HeaderTitle
              icon={<Share2 size={24} color={PINK} />}
              label="Share today&apos;s schedule"
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
              icon={<HelpCircle size={24} color={PINK} />}
              label="Help"
            />
          ),
        }}
      />

      {/* Any other screens keep their default header */}
    </Stack>
  );
}
