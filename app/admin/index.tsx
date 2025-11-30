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
    router.push('/admin/daily-cleaning-tracker');
  const goToStaffReport = () => router.push('/admin/daily-assignments');
  const goToCleaningReport = () =>
    router.push('/admin/cleaning-assignments');

  const content = isAdmin ? (
    <>
      <Text style={styles.title}>Admin</Text>
      <Text style={styles.subtitle}>
        Weekly trackers and reports to keep team assignments and cleaning
        distribution fair and transparent.
      </Text>

      {/* TRACKER SECTION */}
      <Text style={styles.sectionHeader}>Daily tracker</Text>
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
      </View>

      {/* REPORTS SECTION */}
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
        {/* 880px centered wrapper */}
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 880,
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
    marginBottom: 18,
    color: '#5a486b',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
    color: '#374151',
  },
  sectionHeaderSpacing: {
    marginTop: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexBasis: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tileInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tileIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  tileTextWrapper: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 12,
    color: '#4B5563',
  },
});
