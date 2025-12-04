// app/settings/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PINK = '#FF8FC5';
const WHITE = '#FFFFFF';

type SettingsHeaderTitleProps = {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
};

function SettingsHeaderTitle({ iconName, label }: SettingsHeaderTitleProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialCommunityIcons
        name={iconName}
        size={24}
        color={WHITE}
        style={{ marginRight: 8 }}
      />
      <Text style={{ fontSize: 24, fontWeight: '600', color: WHITE }}>
        {label}
      </Text>
    </View>
  );
}

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: WHITE,
        headerStyle: { backgroundColor: PINK },
      }}
    >
      {/* SETTINGS HOME */}
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => (
            <SettingsHeaderTitle iconName="cog-outline" label="Settings" />
          ),
        }}
      />

      {/* STAFF */}
      <Stack.Screen
        name="staff"
        options={{
          headerTitle: () => (
            <SettingsHeaderTitle
              iconName="account-group"
              label="Staff Settings"
            />
          ),
        }}
      />

      {/* PARTICIPANTS */}
      <Stack.Screen
        name="participants"
        options={{
          headerTitle: () => (
            <SettingsHeaderTitle
              iconName="account-child-outline"
              label="Participants Settings"
            />
          ),
        }}
      />

      {/* CLEANING TASKS / CHORES */}
      <Stack.Screen
        name="chores"
        options={{
          headerTitle: () => (
            <SettingsHeaderTitle
              iconName="broom"
              label="Cleaning Tasks / Chores"
            />
          ),
        }}
      />

      {/* FINAL CHECKLIST */}
      <Stack.Screen
        name="checklist"
        options={{
          headerTitle: () => (
            <SettingsHeaderTitle
              iconName="clipboard-check-outline"
              label="Final Checklist"
            />
          ),
        }}
      />
    </Stack>
  );
}
