import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { ROUTES } from '@/constants/ROUTES';
import { initScheduleForToday } from '@/hooks/schedule-store';
import { fetchScheduleForHouseAndDate } from '@/lib/saveSchedule';
import { getSydneyDateKey } from '@/lib/sydneyDate';

type Status = 'loading' | 'ready' | 'missing' | 'error';

type Props = {
  locationId: string;
  locationName: string;
};

function formatAusDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export default function LocationScheduleStatusBanner({
  locationId,
  locationName,
}: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [opening, setOpening] = useState(false);
  const todayKey = getSydneyDateKey();
  const formattedDate = formatAusDate(todayKey);

  const refreshStatus = useCallback(async () => {
    setStatus('loading');

    const result = await fetchScheduleForHouseAndDate(locationId, todayKey);

    if (!result.ok) {
      setStatus('error');
      return;
    }

    setStatus(result.data ? 'ready' : 'missing');
  }, [locationId, todayKey]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void refreshStatus().catch(() => {
        if (active) setStatus('error');
      });

      return () => {
        active = false;
      };
    }, [refreshStatus]),
  );

  const openEditHub = async () => {
    if (opening) return;

    setOpening(true);
    try {
      await initScheduleForToday(locationId);
      router.push(ROUTES.EDIT);
    } catch (error) {
      console.error(`Unable to open ${locationName} schedule`, error);
      setStatus('error');
    } finally {
      setOpening(false);
    }
  };

  const isReady = status === 'ready';
  const isMissing = status === 'missing';
  const isError = status === 'error';

  const iconName: keyof typeof Ionicons.glyphMap = isReady
    ? 'checkmark-circle-outline'
    : isError
      ? 'alert-circle-outline'
      : 'calendar-outline';

  const statusText =
    status === 'loading'
      ? `Checking today's schedule – ${formattedDate}`
      : isReady
        ? `Schedule ready for today – ${formattedDate}`
        : isMissing
          ? `No schedule has been created for today – ${formattedDate}`
          : `Unable to check today's schedule – ${formattedDate}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${locationName}. ${statusText}. Open Edit Hub.`}
      onPress={openEditHub}
      style={({ pressed }) => [
        styles.banner,
        isReady && styles.bannerReady,
        isMissing && styles.bannerMissing,
        isError && styles.bannerError,
        pressed && styles.bannerPressed,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          isReady && styles.iconCircleReady,
          isMissing && styles.iconCircleMissing,
          isError && styles.iconCircleError,
        ]}
      >
        {status === 'loading' || opening ? (
          <ActivityIndicator size="small" color="#6B7280" />
        ) : (
          <Ionicons
            name={iconName}
            size={22}
            color={isReady ? '#15803D' : isError ? '#B91C1C' : '#4B5563'}
          />
        )}
      </View>

      <View style={styles.copy}>
        <Text style={styles.locationName}>{locationName}</Text>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <View style={styles.action}>
        <Text style={styles.actionText}>Open Edit Hub</Text>
        <Ionicons name="chevron-forward" size={20} color="#F54FA5" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  bannerReady: {
    backgroundColor: '#ECFDF3',
    borderColor: '#86EFAC',
  },
  bannerMissing: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  bannerPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.995 }],
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleReady: {
    backgroundColor: '#DCFCE7',
  },
  iconCircleMissing: {
    backgroundColor: '#E5E7EB',
  },
  iconCircleError: {
    backgroundColor: '#FEE2E2',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#332244',
    marginBottom: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B5563',
    flexShrink: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  actionText: {
    color: '#F54FA5',
    fontWeight: '700',
    fontSize: 13,
  },
});
