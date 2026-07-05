import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Footer from '@/components/Footer';
import { getLocationForPin } from '@/lib/locations';
import { ROUTES } from '@/constants/ROUTES';

const MAX_WIDTH = 720;

export default function LocationAccessScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const pinRef = useRef<TextInput | null>(null);
  const showWebBranding = Platform.OS === 'web';

  useEffect(() => {
    pinRef.current?.focus?.();
  }, []);

  const handleSubmit = () => {
    const location = getLocationForPin(pin);

    if (!location) {
      setError('Incorrect location PIN');
      return;
    }

    setError('');
    setPin('');
    router.replace(`${ROUTES.DASHBOARD}?locationId=${encodeURIComponent(location.id)}` as any);
  };

  return (
    <View style={styles.screen}>
      {showWebBranding && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Location access</Text>
          <Text style={styles.title}>Enter Location PIN</Text>
          <Text style={styles.description}>
            Enter the location PIN to open the correct dashboard schedule for this site.
          </Text>

          <TextInput
            ref={pinRef}
            value={pin}
            onChangeText={(text) => {
              setPin(text.replace(/[^0-9]/g, ''));
              if (error) setError('');
            }}
            placeholder="4-digit PIN"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.primaryButton}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryLabel}>Open Location Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace(ROUTES.HOME)}
            style={styles.secondaryButton}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryLabel}>Back to Home</Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 140,
  },
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#ead6f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  eyebrow: {
    color: '#F54FA5',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    color: '#332244',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    color: '#6b5b78',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d8c6e4',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#332244',
    backgroundColor: '#fffafd',
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#F54FA5',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#F54FA5',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryLabel: {
    color: '#F54FA5',
    fontSize: 15,
    fontWeight: '700',
  },
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.1,
    left: -600,
    top: 10,
    pointerEvents: 'none',
  },
});
