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
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fromState =
      (meta && typeof meta.shareCode === 'string' && meta.shareCode) ||
      shareCode ||
      '';
    if (fromState && fromState !== code) {
      setCode(fromState);
      return;
    }

    if (!fromState) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = window.localStorage.getItem('nc_share_code');
          if (stored && stored !== code) {
            setCode(stored);
          }
        }
      } catch (err) {
        console.warn('[ShareSchedule] failed to read localStorage share code:', err);
      }
    }
  }, [meta?.shareCode, shareCode]);

  const smsHref = useMemo(() => {
    const body = encodeURIComponent(
      "Here is today's Daily Schedule code: " + code,
    );
    return Platform.select({
      ios: `sms:&body=${body}`,
      android: `sms:?body=${body}`,
      default: `sms:?body=${body}`,
    });
  }, [code]);

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

    if (!/^\d{6}$/.test(trimmed)) {
      Alert.alert('Import', 'Please enter a valid 6-digit code.');
      return;
    }

    setImporting(true);
    try {
      // 🔥 Fetch schedule from Supabase by code
      const result = await loadScheduleFromSupabase(trimmed);

      let snapshot: any | null = null;

      if (result && result.ok && result.schedule && result.schedule.snapshot) {
        snapshot = result.schedule.snapshot;
      } else {
        // Fallback: try to load snapshot from localStorage on this device
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const raw = window.localStorage.getItem('nc_schedule_' + trimmed);
            if (raw) {
              snapshot = JSON.parse(raw);
              console.warn(
                '[ShareSchedule] using localStorage snapshot fallback for code',
                trimmed,
              );
            }
          }
        } catch (err) {
          console.warn('[ShareSchedule] failed to read localStorage snapshot:', err);
        }

        if (!snapshot) {
          Alert.alert(
            'Import',
            'No schedule was found for that code. Please check the code and try again.',
          );
          return;
        }
      }

      // 🧠 Persist the snapshot locally on this device as well (for re-import / offline)
      try {
        if (typeof window !== 'undefined' && window.localStorage && snapshot) {
          window.localStorage.setItem(
            'nc_schedule_' + String(trimmed),
            JSON.stringify(snapshot),
          );
        }
      } catch (err) {
        console.warn(
          '[ShareSchedule] failed to store imported snapshot in localStorage:',
          err,
        );
      }

      // 🔥 Hydrate store from snapshot (covers different helper names)
      try {
        if (typeof hydrateFromSnapshot === 'function') {
          hydrateFromSnapshot(snapshot);
        } else if (typeof loadSnapshot === 'function') {
          loadSnapshot(snapshot);
        } else if (typeof updateSchedule === 'function') {
          const snap = snapshot as any;
          updateSchedule({
            ...snap,
            meta: {
              ...(snap.meta || {}),
              shareCode: trimmed,
            },
          } as any);
        }
      } catch (e) {
        console.warn('[ShareSchedule] hydrate failed:', e);
      }

      // Make sure meta.shareCode in store matches imported code
      try {
        if (typeof updateSchedule === 'function') {
          const currentMeta = (meta || {}) as Record<string, any>;
          updateSchedule({
            meta: {
              ...currentMeta,
              shareCode: trimmed,
            },
          } as any);
        }
      } catch {}

      // Also persist imported code to localStorage on web
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

      // Go to Edit Hub (same route as create-schedule uses: '/edit')
      try {
        router.push('/edit');
      } catch {
        Alert.alert('Import', 'Code accepted, but navigation failed.');
      }
    } catch (e) {
      console.warn('[ShareSchedule] import error:', e);
      Alert.alert(
        'Import',
        'There was a problem loading this schedule. Please try again.',
      );
    } finally {
      setImporting(false);
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
            <Text style={styles.cardTitle}>Today's share code</Text>
            <Text style={styles.cardDescription}>
              This 6-digit code is generated automatically when you press Finish at the end of the
              Create Schedule flow. Share it with staff so they can view today's Daily Schedule on
              their own device.
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

          {/* Section 2: Share via text */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Share code via text</Text>
            <Text style={styles.cardDescription}>
              Open your SMS app with a pre-filled message that includes the current code.
            </Text>
            <TouchableOpacity
              onPress={handleShareSms}
              style={[
                styles.button,
                styles.btnLavender,
                { alignSelf: 'flex-start', marginTop: 8 },
              ]}
              activeOpacity={0.9}
            >
              <Text style={styles.btnText}>Open Messages</Text>
            </TouchableOpacity>
          </View>

          {/* Section 3: Import code */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Import code to access today&apos;s schedule
            </Text>
            <Text style={styles.cardDescription}>
              Enter a valid 6-digit code to load today&apos;s Daily Schedule associated with that code.
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
        </View>
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
    width: 1400,
    height: 1400,
    opacity: 0.1,
    left: -600,
    top: 10,
    pointerEvents: 'none',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5deef',
    padding: 16,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
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
