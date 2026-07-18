import React, { useEffect, useRef, useState } from 'react';

import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAccessControl } from '@/hooks/access-control';
import { useNotifications } from '@/hooks/notifications';
import Footer from '@/components/Footer';
import { ROUTES } from '@/constants/ROUTES';

const MAX_WIDTH = 880;

export default function AdminAccessScreen() {
  const {
    mode,
    setB2ReadOnly,
    setAdminMd,
    setAdminBruno,
    setAdminJessica,
  } = useAccessControl();
  const { push } = useNotifications();

  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  const adminPinRef = useRef<TextInput | null>(null);

  const MD_ADMIN_PIN = '7474';
  const BRUNO_ADMIN_PIN = '0309';
  const JESSICA_ADMIN_PIN = '0812';

  useEffect(() => {
    adminPinRef.current?.focus?.();
  }, []);

  const finishLogin = () => {
    setPinError('');
    setAdminPin('');
    router.replace(ROUTES.HOME);
  };

  const handleAdminAccess = () => {
    if (!adminPin.trim()) {
      setPinError('Please enter a PIN');
      return;
    }

    if (adminPin === MD_ADMIN_PIN) {
      setAdminMd();
      push('Admin Mode Enabled - Full Access', 'general');
      finishLogin();
      return;
    }

    if (adminPin === BRUNO_ADMIN_PIN) {
      setAdminBruno();
      push('Admin Mode Enabled - Full Access', 'general');
      finishLogin();
      return;
    }

    if (adminPin === JESSICA_ADMIN_PIN) {
      setAdminJessica();
      push('Admin Mode Enabled - Full Access', 'general');
      finishLogin();
      return;
    }

    setPinError('Incorrect PIN');
  };

  const handleReadOnly = () => {
    setB2ReadOnly();
    setPinError('');
    setAdminPin('');
    push('Read-only Mode - NO EDITING ALLOWED', 'general');
    router.replace(ROUTES.HOME);
  };

  return (
    <View style={styles.screen}>
      {Platform.OS === 'web' ? (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin Access</Text>
            <Text style={styles.cardDescription}>
              Enter an authorised PIN to enable schedule creation and editing on
              this device.
            </Text>

            <Text style={styles.modeLabel}>
              Current mode:{' '}
              {mode === 'b2-readonly' ? 'B2 read-only' : 'Administrator'}
            </Text>

            <Text style={styles.label}>Admin PIN</Text>

            <View style={styles.row}>
              <TextInput
                ref={adminPinRef}
                value={adminPin}
                onChangeText={(text) => {
                  setAdminPin(text);
                  if (pinError) setPinError('');
                }}
                secureTextEntry
                keyboardType="number-pad"
                placeholder="Enter admin PIN"
                maxLength={4}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={handleAdminAccess}
                style={styles.input}
              />

              <TouchableOpacity
                onPress={handleAdminAccess}
                style={[styles.button, styles.adminButton]}
                activeOpacity={0.9}
              >
                <Text style={styles.buttonText}>Enable Admin Access</Text>
              </TouchableOpacity>
            </View>

            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

            <TouchableOpacity
              onPress={handleReadOnly}
              style={[styles.button, styles.readOnlyButton]}
              activeOpacity={0.9}
            >
              <Text style={styles.readOnlyButtonText}>Read-only Mode</Text>
            </TouchableOpacity>
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
    backgroundColor: '#FAF7FB',
    position: 'relative',
    overflow: 'hidden',
  },
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.08,
    left: -600,
    top: 10,
    pointerEvents: 'none',
  },
  scroll: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingBottom: 160,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    color: '#332244',
    fontSize: 26,
    fontWeight: '800',
  },
  cardDescription: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
  },
  modeLabel: {
    marginTop: 18,
    color: '#7C3AED',
    fontWeight: '700',
  },
  label: {
    marginTop: 22,
    marginBottom: 8,
    color: '#374151',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    flexGrow: 1,
    minWidth: 220,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButton: {
    backgroundColor: '#16A34A',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  readOnlyButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: '#DC2626',
  },
  readOnlyButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  errorText: {
    marginTop: 10,
    color: '#B91C1C',
    fontWeight: '700',
  },
});
