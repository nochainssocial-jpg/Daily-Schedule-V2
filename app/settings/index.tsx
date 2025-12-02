// app/settings/index.tsx
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

type SettingsTileProps = {
  title: string;
  subtitle: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
};

const SettingsTile: React.FC<SettingsTileProps> = ({
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

export default function SettingsHomeScreen() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const insets = useSafeAreaInsets();

  const goStaff = () => router.push('/settings/staff');
  const goParticipants = () => router.push('/settings/participants');
  const goChores = () => router.push('/settings/chores');
  const goChecklist = () => router.push('/settings/checklist');

  const content = isAdmin ? (
    <>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Manage staff, participants, cleaning tasks, and end-of-shift checklists
        that power the daily schedule and automation.
      </Text>

      <Text style={styles.sectionHeader}>People</Text>
      <View style={styles.grid}>
        <SettingsTile
          title="Staff"
          subtitle="Experience, behaviour capability, reliability & contact details."
          iconName="account-tie"
          onPress={goStaff}
        />
        <SettingsTile
          title="Participants"
          subtitle="Complexity and behaviour profiles for day-program participants."
          iconName="account-heart-outline"
          onPress={goParticipants}
        />
      </View>

      <Text style={[styles.sectionHeader, styles.sectionHeaderSpacing]}>
        End-of-shift
      </Text>
      <View style={styles.grid}>
        <SettingsTile
          title="Cleaning tasks / chores"
          subtitle="Standard list of cleaning tasks used in assignments & reports."
          iconName="broom"
          onPress={goChores}
        />
        <SettingsTile
          title="Final checklist"
          subtitle="Last checks before leaving the house for the day."
          iconName="clipboard-check-outline"
          onPress={goChecklist}
        />
      </View>
    </>
  ) : (
    <>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Please enable Admin Mode with your PIN on the Share screen to access
        and edit these settings.
      </Text>
    </>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
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
    backgroundColor: '#E0E7FF', // same as Admin screen
  },

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
  sectionHeaderSpacing: {
    marginTop: 22,
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
