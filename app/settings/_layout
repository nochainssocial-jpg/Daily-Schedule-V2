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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          backgroundColor: WHITE,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <MaterialCommunityIcons name={iconName} size={20} color={PINK} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: PINK,
        }}
      >
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
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: PINK,
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      {/* Settings hub (matches Admin Hub style) */}
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => (
            <SettingsHeaderTitle
              iconName="cog-outline"
              label="Settings"
            />
          ),
        }}
      />

      {/* Staff settings */}
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

      {/* Participants settings */}
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

      {/* Cleaning tasks / chores */}
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

      {/* Final checklist */}
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
