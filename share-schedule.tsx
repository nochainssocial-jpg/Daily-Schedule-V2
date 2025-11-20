// app/share-schedule.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking, Platform, ScrollView, Image, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store.tsx';

export default function ShareScheduleScreen() {
  useSchedule(); // verify provider is wired without doing anything risky

  const { width } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && width < 768;

  const [code, setCode] = useState('');
  const smsHref = useMemo(() => {
    const body = encodeURIComponent("Here is today's Daily Schedule code: " + code);
    return Platform.select({ ios: `sms:&body=${body}`, android: `sms:?body=${body}`, default: `sms:?body=${body}` });
  }, [code]);

  const handleGenerate = () => setCode(Math.floor(100000 + Math.random() * 900000).toString());
  const handleShareSms = async () => {
    try {
      const ok = await Linking.canOpenURL(smsHref);
      if (!ok) throw new Error('SMS not available');
      await Linking.openURL(smsHref);
    } catch {
      Alert.alert('Share', 'Unable to open SMS composer on this device.');
    }
  };
  const handleImport = () => {
    if (!/^\d{6}$/.test(code.trim())) { Alert.alert('Import', 'Please enter a valid 6-digit code.'); return; }
    Alert.alert('Import', 'Demo import succeeded (stub).');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FB' }}>
      <Stack.Screen options={{ title: "Share Today's Schedule" }} />

      {/* Web‑only background branding */}
      {Platform.OS === 'web' && !isMobileWeb && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
        />
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Section 1: Code generator */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Generate a 6-digit code</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={handleGenerate} style={[styles.button, styles.btnAmber]}><Text style={styles.btnText}>Generate Code</Text></TouchableOpacity>
            <TextInput value={code} onChangeText={setCode} placeholder="6-digit code" style={styles.input} keyboardType="number-pad" />
            <TouchableOpacity onPress={handleShareSms} style={[styles.button, styles.btnGreen]}><Text style={styles.btnText}>Share via TXT</Text></TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Share via text */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Share code via text</Text>
          <TouchableOpacity onPress={handleShareSms} style={[styles.button, styles.btnGreen, { alignSelf: 'flex-start' }]}><Text style={styles.btnText}>Open Messages</Text></TouchableOpacity>
        </View>

        {/* Section 3: Import code */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import code to access today’s schedule</Text>
          <View style={styles.row}>
            <TextInput value={code} onChangeText={setCode} placeholder="Enter 6-digit code" style={styles.input} keyboardType="number-pad" />
            <TouchableOpacity onPress={handleImport} style={[styles.button, styles.btnBlue]}><Text style={styles.btnText}>Import</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, maxWidth: 1100, alignSelf: 'center' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  button: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  btnText: { color: '#0f172a', fontWeight: '700' },
  btnGreen: { backgroundColor: '#BBF7D0' },
  btnBlue: { backgroundColor: '#BFDBFE' },
  btnAmber: { backgroundColor: '#FDE68A' },
  bgLogo: {
    position: 'absolute',
    width: 900,
    height: 900,
    left: -140,
    bottom: -220,
    opacity: 0.06,
    pointerEvents: 'none',
  },
});
