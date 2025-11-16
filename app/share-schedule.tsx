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
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import Footer from '@/components/Footer';

const MAX_WIDTH = 880;

export default function ShareScheduleScreen() {
  const { shareCode, updateSchedule } = useSchedule() as any;

  const [code, setCode] = useState(shareCode || '');

  useEffect(() => {
    if (shareCode && shareCode !== code) {
      setCode(shareCode);
    }
  }, [shareCode]);

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

  const handleGenerate = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCode(newCode);
    try {
      updateSchedule && updateSchedule({ shareCode: newCode });
    } catch {}
  };

  const handleShareSms = async () => {
    try {
      const ok = await Linking.canOpenURL(smsHref || 'sms:');
      if (!ok) {
        throw new Error('SMS not available');
      }
      await Linking.openURL(smsHref || 'sms:');
    } catch {
      Alert.alert(
        'Share',
        'Unable to open SMS composer on this device.',
      );
    }
  };

  const handleImport = () => {
    const trimmed = code.trim();

    if (!/^\d{6}$/.test(trimmed)) {
      Alert.alert('Import', 'Please enter a valid 6-digit code.');
      return;
    }

    if (!shareCode) {
      Alert.alert(
        'Import',
        'No shared schedule is available on this device yet. Generate a code from the main device first.'
      );
      return;
    }

    if (trimmed !== String(shareCode)) {
      Alert.alert(
        'Import',
        'No schedule was found for that code on this device. Please check the code and try again.'
      );
      return;
    }

    // Code matches the current shared schedule — navigate to the Edit Hub
    try {
      router.push('/edit');
    } catch {
      Alert.alert('Import', 'Code accepted, but navigation failed.');
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: "Share Today's Schedule" }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          {/* Section 1: Code generator */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Generate a 6-digit code
            </Text>
            <Text style={styles.cardDescription}>
              Create a one-time code you can share with staff so
              they can view today&apos;s Daily Schedule on their
              own device.
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={handleGenerate}
                style={[styles.button, styles.btnPink]}
                activeOpacity={0.9}
              >
                <Text style={styles.btnText}>
                  Generate Code
                </Text>
              </TouchableOpacity>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                style={styles.input}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                onPress={handleShareSms}
                style={[styles.button, styles.btnLavender]}
                activeOpacity={0.9}
              >
                <Text style={styles.btnText}>
                  Share via TXT
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: Share via text */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Share code via text
            </Text>
            <Text style={styles.cardDescription}>
              Open your SMS app with a pre-filled message that
              includes the current code.
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
              Enter a valid 6-digit code to load today&apos;s
              Daily Schedule associated with that code.
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
              >
                <Text style={styles.btnText}>Import</Text>
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
  },
  scroll: {
  paddingVertical: 24,
  alignItems: 'center',
  paddingBottom: 160,   // 👈 added
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
    gap: 16,
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
