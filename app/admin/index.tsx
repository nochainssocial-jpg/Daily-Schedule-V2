// app/admin/index.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsAdmin } from '@/hooks/access-control';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Footer from '@/components/Footer';

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

  const goToStaffTracker = () =>
    router.push('/admin/daily-assignments-tracker');
  const goToCleaningTracker = () =>
    router.push('/admin/cleaning-assignments-tracker');
  const goToStaffReport = () => router.push('/admin/daily-assignments');
  const goToCleaningReport = () => router.push('/admin/cleaning-assignments');

  const content = isAdmin ? (
    <>
      <Text style={styles.title}>Admin</Text>
      <Text style={styles.subtitle}>
        Weekly trackers and reports to keep team assignments and cleaning
        distribution fair and transparent.
      </Text>

      {/* WEEKLY TRACKER SECTION */}
      <Text style={styles.sectionHeader}>Weekly tracker</Text>
      <View style={styles.grid}>
        <AdminTile
          title="Team Daily Assignments Daily Tracker"
          subtitle="Mon–Fri staff & participants for the current week."
          iconName="account-group-outline"
          onPress={goToStaffTracker}
        />
        <AdminTile
          title="Cleaning Assignment Daily Tracker"
          subtitle="Mon–Fri cleaning duties for the current week."
          iconName="broom"
          onPress={goToCleaningTracker}
        />
      </View>

      {/* WEEKLY REPORTS SECTION */}
      <Text style={[styles.sectionHeader, styles.sectionHeaderSpacing]}>
        Weekly reports
      </Text>
      <View style={styles.grid}>
        <AdminTile
          title="Team Daily Assignment – Weekly Report"
          subtitle="Full weekly summary of who worked where each day."
          iconName="chart-bar-stacked"
          onPress={goToStaffReport}
        />
        <AdminTile
          title="Cleaning Assignment – Weekly Report"
          subtitle="Weekly summary of how cleaning has been distributed."
          iconName="chart-bar-stacked"
          onPress={goToCleaningReport}
        />
      </View>
    </>
  ) : (
    <>
      <Text style={styles.title}>Admin area</Text>
      <Text style={styles.subtitle}>
        Please enable Admin Mode with your PIN on the Share screen to access
        weekly trackers and reports.
      </Text>
    </>
  );

  return (
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
    backgroundColor: '#E0E7FF',
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
    // Extra bottom space so content never hides behind the footer
    paddingBottom: 160,
  },
  card: {
    width: '100%',
    maxWidth: 880,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
  sectionHeaderSpacing: {
    marginTop: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 8,
  },
  tile: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  tileInner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tileIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
