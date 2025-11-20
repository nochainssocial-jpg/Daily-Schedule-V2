// app/help.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Platform } from 'react-native';
import Footer from '@/components/Footer';

export default function HelpScreen() {
  const showWebBranding = Platform.OS === 'web';

  return (
    <View style={styles.screen}>
      {/* Large washed-out background logo – web only */}
      {showWebBranding && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          {/* Title */}
          <Text style={styles.title}>Help &amp; Tips</Text>

          {/* 1. Overview */}
          <Text style={styles.sectionTitle}>1. What this app does</Text>
          <Text style={styles.body}>
            This Daily Schedule app is designed for the B2 Day Program. It helps
            you:{'\n'}
            {'\n'}• Choose which staff are working at B2 today (Dream Team).{'\n'}
            • Choose which participants are attending today.{'\n'}
            • Assign participants to staff for the main program.{'\n'}
            • Manage floating assignments (Front Room, Scotty, Twins).{'\n'}
            • Allocate cleaning duties and a final end-of-shift checklist.{'\n'}
            • Record pickups &amp; dropoffs, including helpers and external transport.{'\n'}
            • Share today&apos;s schedule with staff via a 6-digit code and SMS.{'\n'}
            • Keep master lists of staff, participants, cleaning duties and checklist items in Settings.
          </Text>

          {/* 2. Creating Today’s Schedule */}
          <Text style={styles.sectionTitle}>2. Creating today&apos;s schedule</Text>
          <Text style={styles.body}>
            From the Home screen, tap <Text style={styles.bold}>&quot;Create Schedule&quot;</Text>
            . The process is a 6-step wizard. You can scroll each step and use the
            <Text style={styles.bold}> Next</Text> / <Text style={styles.bold}>Back</Text> buttons at the bottom.
          </Text>

          <Text style={styles.subSectionTitle}>Step 1 — Dream Team (Staff working at B2)</Text>
          <Text style={styles.body}>
            • Tap staff tiles to select who is working at B2 today.{'\n'}
            • &quot;Everyone&quot; is a special tile so that common items can apply to all staff.{'\n'}
            • Selected staff move into the top area so you can clearly see today&apos;s Dream Team.{'\n'}
            • Staff names are shown in alphabetical order for consistency.
          </Text>

          <Text style={styles.subSectionTitle}>Step 2 — Attending Participants</Text>
          <Text style={styles.body}>
            • Tap participant tiles to select who is attending the Day Program today.{'\n'}
            • Selected participants appear in the top area, again sorted alphabetically.{'\n'}
            • Only attending participants will appear in later steps (assignments, pickups &amp; dropoffs, etc.).
          </Text>

          <Text style={styles.subSectionTitle}>Step 3 — Team Daily Assignments</Text>
          <Text style={styles.body}>
            • For each working staff member, assign participants for the main part of the day.{'\n'}
            • Participants can be moved between staff by tapping their names.{'\n'}
            • Unassigned participants appear in a separate pool so you can easily see if anyone is missing.{'\n'}
            • The aim is for every attending participant to be assigned to exactly one staff member.
          </Text>

          <Text style={styles.subSectionTitle}>Step 4 — Pickups &amp; Dropoffs</Text>
          <Text style={styles.body}>
            This step has three parts:{'\n'}
            {'\n'}1) <Text style={styles.bold}>Pickups</Text>{'\n'}
            • Tap participants who will be picked up by external transport (e.g. taxis, buses).{'\n'}
            • Participants marked as Pickups will not appear in the Dropoffs lists.{'\n'}
            {'\n'}2) <Text style={styles.bold}>Dropoff Helpers (optional)</Text>{'\n'}
            • You can select staff who are not working at B2 as helpers for pickups and dropoffs.{'\n'}
            • These &quot;helper&quot; staff come from the staff list but are not part of the Dream Team.{'\n'}
            {'\n'}3) <Text style={styles.bold}>Dropoffs</Text>{'\n'}
            • Each remaining (non-pickup) participant can be assigned to exactly one staff member for dropoff.{'\n'}
            • Tap a participant under a staff member to move them on or off that staff member.{'\n'}
            • Tapping a participant again on the same staff member will unassign them.{'\n'}
            • The goal is for every eligible participant to have a clear dropoff responsibility.
          </Text>

          <Text style={styles.subSectionTitle}>Step 5 — Cleaning Duties</Text>
          <Text style={styles.body}>
            • Cleaning duties come from the list you manage in Settings.{'\n'}
            • Use this step to confirm which cleaning tasks apply today and who they relate to (where relevant).{'\n'}
            • These duties are visible later in the Edit Hub so you can adjust or review them.
          </Text>

          <Text style={styles.subSectionTitle}>Step 6 — Final Checklist</Text>
          <Text style={styles.body}>
            • Choose the staff member responsible for the end-of-shift checklist.{'\n'}
            • Checklist items come from the &quot;Final List&quot; section in Settings.{'\n'}
            • This step is your last chance to confirm that all key closing tasks are visible and assigned.{'\n'}
            {'\n'}
            When you&apos;re happy:{' '}
            <Text style={styles.bold}>press &quot;Finish&quot;</Text>. The schedule is saved and you&apos;ll be
            taken back to the Edit Hub.
          </Text>

          {/* 3. Using the Edit Hub */}
          <Text style={styles.sectionTitle}>3. Using the Edit Hub</Text>
          <Text style={styles.body}>
            After you press <Text style={styles.bold}>Finish</Text>, the Edit Hub lets you adjust any part of
            today&apos;s schedule without redoing everything from scratch.{'\n'}
            {'\n'}
            In the Edit Hub you&apos;ll see tiles for:{'\n'}
            {'\n'}• <Text style={styles.bold}>Dream Team</Text> – change which staff are working at B2.{'\n'}
            • <Text style={styles.bold}>Participants Attending</Text> – add or remove participants for today.{'\n'}
            • <Text style={styles.bold}>Team Daily Assignments</Text> – reshuffle which staff have which participants.{'\n'}
            • <Text style={styles.bold}>Floating Assignments</Text> – assign staff to Front Room, Scotty and Twins time slots.{'\n'}
            • <Text style={styles.bold}>Cleaning Duties</Text> – fine-tune cleaning tasks for today.{'\n'}
            • <Text style={styles.bold}>Pickups &amp; Dropoffs</Text> – adjust external pickups, helpers and dropoff responsibilities.{'\n'}
            • <Text style={styles.bold}>Final Checklist</Text> – change who is responsible and which closing tasks apply.{'\n'}
            {'\n'}
            Any change you make in these screens updates today&apos;s schedule immediately.
          </Text>

          {/* 4. Sharing today’s schedule */}
          <Text style={styles.sectionTitle}>4. Sharing today&apos;s schedule</Text>
          <Text style={styles.body}>
            From the footer or Home, open{' '}
            <Text style={styles.bold}>Share Today&apos;s Schedule</Text>. When you press{' '}
            <Text style={styles.bold}>Finish</Text> on the wizard, the app automatically creates (or reuses) a
            6-digit code for today&apos;s schedule, so you don&apos;t have to generate it manually.{'\n'}
            {'\n'}
            On the Share screen you can:{'\n'}
            {'\n'}
            • See today&apos;s 6-digit share code for this schedule.{'\n'}
            • Copy the code or open your Messages app with a pre-filled SMS containing the code.{'\n'}
            • Use the Import section so staff can enter a code on their own device to view today&apos;s schedule.{'\n'}
            {'\n'}
            Typical steps:{'\n'}
            {'\n'}
            1) After finishing the schedule, open{' '}
            <Text style={styles.bold}>Share Today&apos;s Schedule</Text>; the current code will be shown at the top.{'\n'}
            2) Tap the option to copy or share the code via TXT / Messages and send it to staff.{'\n'}
            3) On another device, staff open the app, go to Share, type the code and tap{' '}
            <Text style={styles.bold}>Import</Text> to load today&apos;s schedule.
          </Text>

          {/* 5. Managing lists in Settings */}
          <Text style={styles.sectionTitle}>5. Managing staff, participants &amp; lists (Settings)</Text>
          <Text style={styles.body}>
            Open <Text style={styles.bold}>Settings</Text> to manage the master lists used across the app:{'\n'}
            {'\n'}• <Text style={styles.bold}>Staff</Text> – add, rename or remove staff; each staff member has a colour used in the UI.{'\n'}
            • <Text style={styles.bold}>Participants</Text> – maintain the list of participants available in Step 2 and other screens.{'\n'}
            • <Text style={styles.bold}>Chores</Text> – define cleaning duties shown in Step 5 and the Cleaning edit screen.{'\n'}
            • <Text style={styles.bold}>Final List</Text> – define the end-of-shift checklist items used in Step 6 and its edit screen.{'\n'}
            {'\n'}
            Tap a row to edit, the trash icon to delete, or use the Add button to create new items. Changes here
            will appear automatically next time you build or edit a schedule.
          </Text>

          {/* 6. General tips & troubleshooting */}
          <Text style={styles.sectionTitle}>6. General tips &amp; troubleshooting</Text>
          <Text style={styles.body}>
            • If something looks wrong after finishing a schedule, use the Edit Hub rather than restarting.{'\n'}
            • Make sure you&apos;ve set both a Dream Team (Step 1) and Attending Participants (Step 2) before doing assignments.{'\n'}
            • If a participant is missing from Dropoffs, check whether they were marked as a Pickup in Step 4.{'\n'}
            • If you can&apos;t see the buttons at the bottom of a step, scroll down – the layout keeps them pinned near the bottom of the screen.{'\n'}
            • If codes or data don&apos;t seem to match, regenerate a fresh 6-digit code and share again if needed.{'\n'}
            {'\n'}
            If you&apos;re ever unsure, you can safely revisit <Text style={styles.bold}>Help</Text> or step back into
            the wizard and review your choices, then press <Text style={styles.bold}>Finish</Text> again.
          </Text>
        </View>
      </ScrollView>
      <Footer />
    </View>
  );
}

const MAX_WIDTH = 880;

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
    paddingBottom: 16,
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: '#332244',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 6,
    color: '#332244',
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
    color: '#4c3b5c',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4c3b5c',
  },
  bold: {
    fontWeight: '700',
    color: '#332244',
  },
});
