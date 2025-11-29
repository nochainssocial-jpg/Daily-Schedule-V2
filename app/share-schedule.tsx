// app/share-schedule.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import { useAccessControl } from '@/hooks/access-control';
import { useNotifications } from '@/hooks/notifications';
import Footer from '@/components/Footer';
import { loadScheduleFromSupabase } from '@/lib/loadSchedule';

const MAX_WIDTH = 880;

export default function ShareScheduleScreen() {
  const {
    meta,
    shareCode,
    updateSchedule,
    hydrateFromSnapshot,
    loadSnapshot,
  } = useSchedule() as any;

  const { mode, setB2ReadOnly, setAdminMd, setAdminBruno } = useAccessControl();
  const { push } = useNotifications();

  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');

const MD_ADMIN_PIN = '7474'; // Dalida (MD)
const BRUNO_ADMIN_PIN = '0309'; // Bruno (AA)

  const showWebBranding = Platform.OS === 'web';

  // Derive initial code from state, with localStorage fallback on web
  const initialCode = (() => {
    const fromState =
      (meta && typeof meta.shareCode === 'string' && meta.shareCode) ||
      shareCode ||
      '';
    if (fromState) return fromState;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('nc_share_code');
        return stored || '';
      }
    } catch (err) {
      console.warn('[ShareSchedule] failed to read localStorage share code:', err);
    }
    return '';
  })();

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (initialCode && initialCode !== code) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    // Keep meta.shareCode in sync whenever code changes
    updateSchedule?.((prev: any) => {
      const snap = typeof prev === 'function' ? prev() : prev;
      if (!snap) return prev;

      return {
        ...snap,
        meta: {
          ...(snap.meta || {}),
          shareCode: code || null,
        },
      } as any;
    });

    // Also persist to localStorage on web
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (code) {
          window.localStorage.setItem('nc_share_code', String(code));
        } else {
          window.localStorage.removeItem('nc_share_code');
        }
      }
    } catch (err) {
      console.warn(
        '[ShareSchedule] failed to persist shareCode in localStorage:',
        err,
      );
    }
  }, [code, updateSchedule]);

  const smsHref = useMemo(() => {
    if (!code) return null;

    const body = encodeURIComponent(
      `Today's No Chains Daily Schedule share code is: ${code}\n\nOpen the Daily Schedule app and enter this code to view today's schedule.`,
    );

    if (Platform.OS === 'ios') {
      return `sms:&body=${body}`;
    }

    return Platform.select({
      android: `sms:?body=${body}`,
      default: `sms:?body=${body}`,
    });
  }, [code]);

  const handleAdminAccess = () => {
    if (!adminPin.trim()) {
      setPinError('Please enter a PIN');
      return;
    }

    if (adminPin === MD_ADMIN_PIN) {
      setAdminMd();
      setPinError('');
      setAdminPin('');
      push('Admin Mode Enabled - Full Access', 'general');
      return;
    }

    if (adminPin === BRUNO_ADMIN_PIN) {
      setAdminBruno();
      setPinError('');
      setAdminPin('');
      push('Admin Mode Enabled - Full Access', 'general');
      return;
    }

    setPinError('Incorrect PIN');
  };

  const handleB2Access = () => {
    setB2ReadOnly();
    setPinError('');
    setAdminPin('');
    push('B2 Mode Enabled - Read-Only (NO EDITING ALLOWED)', 'general');
  };

  const handleShareSms = async () => {
    try {
      const ok = await Linking.canOpenURL(smsHref || 'sms:');
      if (!ok) throw new Error('SMS not available');
      await Linking.openURL(smsHref || 'sms:');
    } catch {
      Alert.alert('Share', 'Unable to open SMS composer on this device.');
    }
  };

  const handleImport = async () => {
    const trimmed = code.trim();

    if (!trimmed || trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      Alert.alert(
        'Import code',
        'Please enter a valid 6-digit share code before importing.',
      );
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await loadScheduleFromSupabase(trimmed);

      if (error || !data) {
        console.error('Import share code: failed', error);
        Alert.alert(
          'Import code',
          'Unable to import schedule. Please check the code and try again.',
        );
        return;
      }

      const { snapshot, scheduleDate } = data;

      await hydrateFromSnapshot(snapshot as any, {
        scheduleDate,
        shareCode: trimmed,
      });

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('nc_share_code', String(trimmed));
        }
      } catch (err) {
        console.warn(
          '[ShareSchedule] failed to store imported shareCode in localStorage:',
          err,
        );
      }

      Alert.alert(
        'Import code',
        'Schedule imported successfully. You can now view and edit today’s schedule.',
      );
    } catch (err) {
      console.error('Import share code: unexpected error', err);
      Alert.alert(
        'Import code',
        'Something went wrong while importing the schedule. Please try again.',
      );
    } finally {
      setImporting(false);
    }
  };

  const handleLoadToday = async () => {
    setLoading(true);
    try {
      const result = await loadSnapshot('B2');

      if (!result || !result.snapshot) {
        Alert.alert(
          'Load today',
          'No schedule found for today. Create a schedule first.',
        );
        return;
      }

      await hydrateFromSnapshot(result.snapshot as any, {
        scheduleDate: result.scheduleDate,
        shareCode: result.snapshot?.meta?.shareCode ?? null,
      });
    } catch (err) {
      console.error('Share screen: failed to load today snapshot', err);
      Alert.alert(
        'Load today',
        'Something went wrong while loading today’s schedule. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Large washed-out background logo – web only */}
      {showWebBranding && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <Stack.Screen options={{ title: "Share Today's Schedule" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          {/* Section 1: Today's share code */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today&apos;s share code</Text>
            <Text style={styles.cardDescription}>
              This 6-digit code is generated automatically when you press Finish at the end of the
              Create Schedule flow. Share it with staff so they can view today&apos;s Daily
              Schedule on their own device.
            </Text>
            <View style={styles.row}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Section 2: Share via SMS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Share via SMS</Text>
            <Text style={styles.cardDescription}>
              Open your SMS app with a pre-filled message containing today&apos;s share code.
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={handleShareSms}
                style={[styles.button, styles.btnPink]}
                activeOpacity={0.9}
                disabled={!smsHref}
              >
                <Text style={styles.btnText}>Open Messages</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 3: Import code */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Import code to access today&apos;s schedule
            </Text>
            <Text style={styles.cardDescription}>
              Enter a valid 6-digit code to load today&apos;s Daily Schedule associated with that
              code.
            </Text>
            <View style={styles.row}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                style={styles.input}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                onPress={handleImport}
                style={[styles.button, styles.btnDeepPink]}
                activeOpacity={0.9}
                disabled={importing}
              >
                <Text style={styles.btnText}>
                  {importing ? 'Importing…' : 'Import'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 4: Device access mode */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Device access</Text>
            <Text style={styles.cardDescription}>
              Switch this device between full ADMIN mode and B2 read-only mode. Use Admin mode only
              on trusted devices.
            </Text>

            <Text style={styles.label}>Admin PIN (MD / Bruno)</Text>
            <TextInput
              value={adminPin}
              onChangeText={(text) => {
                setAdminPin(text);
                if (pinError) setPinError('');
              }}
              secureTextEntry
              keyboardType="number-pad"
              placeholder="Enter admin PIN"
              style={styles.input}
            />
            {pinError ? (
              <Text style={styles.errorText}>{pinError}</Text>
            ) : null}

            <View style={styles.row}>
              <TouchableOpacity
                onPress={handleAdminAccess}
                style={[styles.button, styles.btnLavender]}
                activeOpacity={0.9}
              >
                <Text style={styles.btnText}>Admin access (enable editing)</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>{content}</View>
      </ScrollView>
      
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
    position: 'relative',
    overflow: 'hidden',
  },
  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingBottom: 160,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
    gap: 16,
  },
  // Large washed-out background logo
  bgLogo: {
    position: 'absolute',
    right: -120,
    bottom: -80,
    width: 400,
    height: 400,
    opacity: 0.05,
    zIndex: -1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#332244',
  },
  cardDescription: {
    fontSize: 14,
    color: '#4c3b5c',
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    columnGap: 12,
  },
    label: {
    marginBottom: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5deef',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8f4fb',
    fontSize: 16,
    color: '#332244',
    marginBottom: 20,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: {
    color: '#332244',
    fontWeight: '700',
    fontSize: 14,
  },
  btnPink: {
    backgroundColor: '#fbcfe8',
  },
  btnLavender: {
    backgroundColor: '#e5deef',
  },
  btnDeepPink: {
    backgroundColor: '#f472b6',
  },
});
