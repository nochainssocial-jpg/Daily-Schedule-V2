import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function AdminIndexScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Reports</Text>
        <Text style={styles.subtitle}>
          Review weekly assignments and cleaning distribution to keep things fair.
        </Text>

        {/* TEAM DAILY TRACKER */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/admin/daily-assignments-tracker')}
          activeOpacity={0.8}
        >
          <Text style={styles.itemTitle}>Team Daily Assignments – Tracker</Text>
          <Text style={styles.itemText}>
            Live Mon–Fri overview for the current week.
          </Text>
        </TouchableOpacity>

        {/* CLEANING TRACKER */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/admin/daily-cleaning-tracker')}
          activeOpacity={0.8}
        >
          <Text style={styles.itemTitle}>Cleaning – Tracker</Text>
          <Text style={styles.itemText}>
            Live cleaning duties checklist for the current week.
          </Text>
        </TouchableOpacity>

        {/* WEEKLY REPORTS */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/admin/daily-assignments')}
          activeOpacity={0.8}
        >
          <Text style={styles.itemTitle}>Team Daily Assignment – Weekly Report</Text>
          <Text style={styles.itemText}>
            View a full week of daily assignments.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push('/admin/cleaning-assignments')}
          activeOpacity={0.8}
        >
          <Text style={styles.itemTitle}>Cleaning – Weekly Report</Text>
          <Text style={styles.itemText}>
            Full weekly cleaning distribution.
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#F5F3FF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#562C61',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  item: {
    marginBottom: 20,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#562C61',
  },
  itemText: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
});
