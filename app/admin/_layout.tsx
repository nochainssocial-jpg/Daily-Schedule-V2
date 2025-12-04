// app/admin/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PINK = '#F54FA5';
const WHITE = '#FFFFFF';

type AdminHeaderTitleProps = {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
};

function AdminHeaderTitle({ iconName, label }: AdminHeaderTitleProps) {
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

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: WHITE,
        headerStyle: { backgroundColor: PINK },
      }}
    >
      {/* ADMIN HOME */}
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => (
            <AdminHeaderTitle iconName="shield-lock-op" label="Admin Hub" />
          ),
        }}
      />

      {/* TRACKERS */}
      <Stack.Screen
        name="daily-assignments-tracker"
        options={{
          headerTitle: () => (
            <AdminHeaderTitle
              iconName="account-group-outline"
              label="Team Daily Assignments Tracker"
            />
          ),
        }}
      />
      <Stack.Screen
        name="daily-cleaning-tracker"
        options={{
          headerTitle: () => (
            <AdminHeaderTitle
              iconName="broom"
              label="Daily Cleaning Assignment Tracker"
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
              iconName="chart-bar-stacked"
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
              iconName="chart-bar-stacked"
              label="Cleaning Assignment – Weekly Report"
            />
          ),
        }}
      />
    </Stack>
  );
}
