// app/admin/index.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsAdmin } from '@/hooks/access-control';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Footer from '@/components/Footer';

const showWebBranding = Platform.OS === 'web';

type AdminTileProps = {
  title: string;
  subtitle: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
};

const AdminTile: React.FC<AdminTileProps> = ({
  title,
  subtitle,
  iconName,
  onPress,
}) => (
  <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.tileInner}>
      <View style={styles.tileIconWrapper}>
        <MaterialCommunityIcons name={iconName} size={26} color="#374151" />
      </View>
      <View style={styles.tileTextWrapper}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSubtitle}>{subtitle}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function AdminHomeScreen() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const insets = useSafeAreaInsets();

  const goToStaffTracker = () => router.push('/admin/daily-assignments-tracker');
  const goToCleaningTracker = () => router.push('/admin/daily-cleaning-tracker');
  const goToFloatingTracker = () => router.push('/admin/floating-assignments-tracker');

  const content = isAdmin ? (
    <>
      <Text style={styles.title}>Admin</Text>
      <Text style={styles.subtitle}>
        Weekly trackers to review team assignments, cleaning and floating
        distribution clearly and fairly.
      </Text>

      {/* TRACKER SECTION */}
      <Text style={styles.sectionHeader}>Weekly trackers</Text>
      <View style={styles.grid}>
        <AdminTile
          title="Team Daily Assignments Tracker"
          subtitle="Mon–Fri staff & participants for the current week."
          iconName="account-group-outline"
          onPress={goToStaffTracker}
        />
        <AdminTile
          title="Daily Cleaning Assignment Tracker"
          subtitle="Mon–Fri cleaning duties for the current week."
          iconName="broom"
          onPress={goToCleaningTracker}
        />
        <AdminTile
          title="Floating Assignments Tracker"
          subtitle="Weekly fairness overview based on onsite staff availability."
          iconName="account-clock"
          onPress={goToFloatingTracker}
        />
      </View>
    </>
  ) : (
    <>
      <Text style={styles.title}>Admin area</Text>
      <Text style={styles.subtitle}>
        Please enable Admin Mode with your PIN on the Share screen to access
        weekly trackers.
      </Text>
    </>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* 🔥 MATCHING WEB BACKGROUND BRANDING (same as Edit Hub) */}
      {showWebBranding && (
        <Image
          source={require('@/assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>{content}</View>
      </ScrollView>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E0E7FF',
  },

  // 🔥 Same washed-out logo style used in Edit Hub
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.1,
    left: -600,
    top: 10,
    pointerEvents: 'none',
    zIndex: 0,
  },

  scroll: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingBottom: 160,
  },

  container: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    color: '#332244',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 20,
    color: '#5a486b',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  tile: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  tileInner: {
    height: 86,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tileTextWrapper: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2933',
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 12,
    color: '#4B5563',
  },
});
