import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  errorMessage?: string | null;
  loading?: boolean;
};

export function NoSchedulePanel({ errorMessage, loading = false }: Props) {
  const isError = Boolean(errorMessage);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={[styles.iconBubble, isError && styles.iconBubbleError]}>
          <Ionicons
            name={isError ? 'cloud-offline-outline' : loading ? 'sync-outline' : 'calendar-outline'}
            size={52}
            color={isError ? '#B91C1C' : '#6B7280'}
          />
        </View>
        <Text style={styles.title}>
          {isError
            ? 'Unable to Load Today’s Schedule'
            : loading
              ? 'Loading Today’s Schedule'
              : 'No Schedule Created Yet'}
        </Text>
        <Text style={styles.subtitle}>
          {isError
            ? errorMessage
            : loading
              ? 'Checking the current Sydney-date schedule for this location.'
              : 'Today’s schedule will appear automatically once it has been created.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    minHeight: 300,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 44,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  iconBubble: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginBottom: 22,
  },
  iconBubbleError: {
    backgroundColor: '#FEE2E2',
  },
  title: {
    color: '#374151',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    maxWidth: 580,
    color: '#6B7280',
    fontSize: 19,
    lineHeight: 28,
    textAlign: 'center',
  },
});
