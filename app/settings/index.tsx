import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, UserCircle2, Broom, CheckSquare2 } from 'lucide-react-native';
import Footer from '@/components/Footer';

const MAX_WIDTH = 880;

export default function SettingsIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showWebBranding = Platform.OS === 'web';

  const tiles = [
    {
      key: 'staff',
      title: 'Staff',
      description: 'Manage your Dream Team details and classifications.',
      icon: Users,
      onPress: () => router.push('/settings/staff'),
    },
    {
      key: 'participants',
      title: 'Participants',
      description: 'Review and manage participant details and profiles.',
      icon: UserCircle2,
      onPress: () => router.push('/settings/participants'),
    },
    {
      key: 'chores',
      title: 'Cleaning Tasks / Chores',
      description: 'Configure end-of-day cleaning tasks for the program.',
      icon: Broom,
      onPress: () => router.push('/settings/chores'),
    },
    {
      key: 'checklist',
      title: 'End of Shift Checklist',
      description: 'Maintain the final checklist to close the house safely.',
      icon: CheckSquare2,
      onPress: () => router.push('/settings/checklist'),
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Large washed-out background logo – web only */}
      {showWebBranding && (
        <Image
          source={require('../../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Choose what you’d like to manage today.
            </Text>
          </View>

          <View style={styles.grid}>
            {tiles.map(tile => {
              const Icon = tile.icon;
              return (
                <TouchableOpacity
                  key={tile.key}
                  style={styles.card}
                  onPress={tile.onPress}
                  activeOpacity={0.9}
                >
                  <View style={styles.iconWrap}>
                    <Icon size={28} color="#ffffff" />
                  </View>
                  <Text style={styles.cardTitle}>{tile.title}</Text>
                  <Text style={styles.cardBody}>{tile.description}</Text>
                </TouchableOpacity>
              );
            })}
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
    paddingVertical: 32,
    alignItems: 'center',
    paddingBottom: 160,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 24,
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
  header: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#332244',
  },
  subtitle: {
    fontSize: 14,
    color: '#4c3b5c',
    marginTop: 4,
  },
  grid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5deef',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f472b6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#332244',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    color: '#6b5a7a',
  },
});
