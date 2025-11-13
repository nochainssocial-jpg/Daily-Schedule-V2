import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

const TILES = [
  { title: 'The Dream Team (Working at B2)', path: '/edit/dream-team' },
  { title: 'Attending Participants', path: '/edit/participants' },
  { title: 'Team Daily Assignments', path: '/edit/assignments' },
  { title: 'Floating Assignments (Front Room, Scotty, Twins)', path: '/edit/floating' },
  { title: 'End of Shift Cleaning Assignments', path: '/edit/cleaning' },
  { title: 'Pickups and Dropoffs with Helpers', path: '/edit/pickups-dropoffs' },
  { title: 'End of Shift Checklist', path: '/edit/checklist' },
] as const;

export default function EditHubScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit today&apos;s schedule</Text>
      <Text style={styles.subtitle}>
        Tap a category below to review and adjust details captured during the create flow.
      </Text>
      <View style={styles.grid}>
        {TILES.map((tile) => (
          <TouchableOpacity
            key={tile.path}
            style={styles.tile}
            onPress={() => router.push(tile.path)}
            activeOpacity={0.85}
          >
            <Text style={styles.tileTitle}>{tile.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  tile: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
});
