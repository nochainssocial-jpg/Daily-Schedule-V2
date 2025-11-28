// app/admin/index.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsAdmin } from '@/hooks/access-control';

export default function AdminHomeScreen() {
  const router = useRouter();
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    // Safety: if someone somehow lands here without admin mode
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Admin area</Text>
          <Text style={styles.subtitle}>
            Please enable Admin Mode with your PIN on the Share screen to access reports.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Reports</Text>
        <Text style={styles.subtitle}>
          Review weekly assignments and cleaning distribution to keep things fair and transparent.
        </Text>

        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/admin/daily-assignments')}
          activeOpacity={0.8}
        >
          <Text style={styles.itemTitle}>Team Daily Assignment – Weekly Report</Text>
          <Text style={styles.itemText}>
            View a full week of daily assignments to see who worked where each day.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/admin/cleaning-assignments')}
          activeOpacity={0.8}
        >
          <Text style={styles.itemTitle}>Cleaning – Weekly Report</Text>
          <Text style={styles.itemText}>
            Review how cleaning tasks have been distributed across the week.
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 880,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    color: '#332244',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 20,
    color: '#5a486b',
  },
  item: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1F2933',
  },
  itemText: {
    fontSize: 13,
    color: '#4B5563',
  },
});
