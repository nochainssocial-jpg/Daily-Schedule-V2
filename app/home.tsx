import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ROUTES } from '@/constants/ROUTES';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Daily Schedule</Text>
      <Text style={styles.subtitle}>
        Create and fine-tune today&apos;s dream team and participant plan.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push(ROUTES.CREATE)}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryLabel}>Create Schedule</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push(ROUTES.EDIT)}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryLabel}>Go to Edit Hub</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#e91e63',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginBottom: 12,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#e91e63',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  secondaryLabel: {
    color: '#e91e63',
    fontWeight: '500',
  },
});
