// app/help.tsx (repo-ready; theme-aligned; updated copy)
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image, useWindowDimensions, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { COLORS } from '@/components/theme';
import { useSchedule } from '@/hooks/schedule-store.tsx';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={[styles.section, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
    <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{title}</Text>
    {children}
  </View>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.bulletRow}>
    <Text style={[styles.bullet, { color: COLORS.subtext }]}>•</Text>
    <Text style={[styles.bulletText, { color: COLORS.text }]}>{children}</Text>
  </View>
);

export default function HelpScreen() {
  useSchedule(); // keep provider warm / ready
  const { width } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && width < 768;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.appBg || '#F5F5F5' }}>
      <Stack.Screen options={{ title: 'Help' }} />

      {/* Web‑only background branding */}
      {Platform.OS === 'web' && !isMobileWeb && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
        />
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[styles.title, { color: COLORS.text }]}>How to Use Daily Schedule</Text>
          <Text style={[styles.subtitle, { color: COLORS.subtext }]}>Quick guide to creating, editing and sharing the day’s plan.</Text>
        </View>

        <Section title="Create a new schedule">
          <Bullet>Tap <Text style={styles.bold}>Create</Text> on Home, then follow the 5 steps.</Bullet>
          <Bullet>Select <Text style={styles.bold}>Working Staff</Text> and <Text style={styles.bold}>Participants</Text>.</Bullet>
          <Bullet>Assign participants in <Text style={styles.bold}>Team Daily Assignments</Text>.</Bullet>
          <Bullet>Finish with <Text style={styles.bold}>Floaters</Text> and <Text style={styles.bold}>End-of-Shift</Text> duties.</Bullet>
        </Section>

        <Section title="Sick / Cancelled logic">
          <Bullet>Removing a staff member moves their participants to <Text style={styles.bold}>Unassigned</Text> (participants remain attending).</Bullet>
          <Bullet>Removing a participant from <Text style={styles.bold}>Attending Today</Text> removes them from all other sections.</Bullet>
          <Bullet>Reassign in <Text style={styles.bold}>Team Daily Assignments</Text>.</Bullet>
        </Section>

        <Section title="Pickups & Dropoffs">
          <Bullet><Text style={styles.bold}>Pickups</Text>: tap names to mark pickup (greys in Dropoffs).</Bullet>
          <Bullet><Text style={styles.bold}>Helpers</Text>: add staff who aren’t working at B2 to help with dropoffs only.</Bullet>
          <Bullet><Text style={styles.bold}>Dropoffs</Text>: assign each participant to exactly one staff member.</Bullet>
        </Section>

        <Section title="Share today’s schedule (code)">
          <Bullet>Go to <Text style={styles.bold}>Share</Text> in the footer.</Bullet>
          <Bullet>Generate a 6‑digit code and share via text.</Bullet>
          <Bullet>On another device, open <Text style={styles.bold}>Share → Import</Text> and enter the code.</Bullet>
        </Section>

        <View style={styles.note}>
          <Text style={[styles.noteText, { color: COLORS.subtext }]}>Need more help? Contact your administrator.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16, maxWidth: 900, alignSelf: 'center' },
  hero: { borderRadius: 16, padding: 16, borderWidth: 1 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 15, marginTop: 4 },
  section: { borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bullet: { width: 12, textAlign: 'center' },
  bulletText: { flex: 1, lineHeight: 20 },
  bold: { fontWeight: '700' },
  note: { alignItems: 'center' },
  noteText: { fontStyle: 'italic', marginTop: 6 },
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
