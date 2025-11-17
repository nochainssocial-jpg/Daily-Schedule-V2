// app/edit/_layout.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Edit3 } from 'lucide-react-native';

function EditHeaderTitle({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Edit3 size={24} color="#332244" />
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#332244',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function EditLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: '#332244',
        headerStyle: { backgroundColor: '#f7f1ff' },
      }}
    >
      {/* Edit Hub main menu */}
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <EditHeaderTitle label="Edit Hub" />,
        }}
      />

      {/* Individual edit categories */}
      <Stack.Screen
        name="dream-team"
        options={{
          headerTitle: () => (
            <EditHeaderTitle label="The Dream Team" />
          ),
        }}
      />

      <Stack.Screen
        name="participants"
        options={{
          headerTitle: () => (
            <EditHeaderTitle label="Participants Attending" />
          ),
        }}
      />

      <Stack.Screen
        name="assignments"
        options={{
          headerTitle: () => (
            <EditHeaderTitle label="Team Daily Assignments" />
          ),
        }}
      />

      <Stack.Screen
        name="floating"
        options={{
          headerTitle: () => (
            <EditHeaderTitle label="Floating Assignments" />
          ),
        }}
      />

      <Stack.Screen
        name="cleaning"
        options={{
          headerTitle: () => (
            <EditHeaderTitle label="Cleaning Duties" />
          ),
        }}
      />

      <Stack.Screen
        name="pickups-dropoffs"
        options={{
          headerTitle: () => (
            <EditHeaderTitle label="Pickups & Dropoffs" />
          ),
        }}
      />

      <Stack.Screen
        name="checklist"
        options={{
          headerTitle: () => (
            <EditHeaderTitle label="Final Checklist" />
          ),
        }}
      />
    </Stack>
  );
}
