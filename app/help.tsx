// app/help.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Footer from '@/components/Footer';

const MAX_WIDTH = 880;
const showWebBranding = Platform.OS === 'web';

export default function HelpScreen() {
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
          {/* White card behind all text for legibility */}
          <View style={styles.card}>
            {/* Title */}
            <Text style={styles.title}>Help &amp; Tips</Text>

            {/* 1. Overview */}
            <Text style={styles.sectionTitle}>1. What this app does</Text>
            <Text style={styles.body}>
              This Daily Schedule app is designed for the B2 Day Program. It
              helps you:{'\n'}
              {'\n'}• Choose which staff are working at B2 today (Dream Team), and which staff are away or helping with transport.{'\n'}
              • Choose which participants are attending today, including who will be off-site on an outing or marked as{' '}
              <Text style={styles.bold}>Not attending</Text>.{'\n'}
              • Set up drives / outings so that floating, cleaning and daily assignments only use staff who remain on-site.{'\n'}
              • Assign participants to staff for the main program.{'\n'}
              • Manage floating assignments (Front Room, Scotty, Twins) using only onsite and attending participants.{'\n'}
              • Allocate cleaning duties and a final end-of-shift checklist.{'\n'}
              • Record pickups &amp; dropoffs, including helpers and external transport and locations.{'\n'}
              • See staff and participant <Text style={styles.bold}>ratings / complexity scores</Text> where they matter (Dream Team, Assignments, etc.).{'\n'}
              • Keep master lists of staff, participants, cleaning duties and checklist items in Settings.{'\n'}
              • Use <Text style={styles.bold}>B2 Read-only mode</Text> so staff can safely view the day without changing anything (this is the default).{'\n'}
              • Use <Text style={styles.bold}>Admin mode</Text> to access extra controls such as the Admin screen and weekly reports.{'\n'}
              {'\n'}
              Once a schedule is saved, any changes made in the Edit Hub are stored centrally so other devices
              loading the same day can see the updated version.
            </Text>

            {/* 2. Access levels: B2 Read-only (default) & Admin mode */}
            <Text style={styles.sectionTitle}>
              2. Access levels: B2 Read-only (default) &amp; Admin mode
            </Text>
            <Text style={styles.body}>
              The app has two access levels to keep the schedule secure:{'\n'}
              {'\n'}
              • <Text style={styles.bold}>B2 Read-only mode</Text> – for everyday staff who just need to view the plan.{'\n'}
              • <Text style={styles.bold}>Admin mode</Text> – for MD / Admin staff who control the schedule and can access advanced tools such as Reports.{'\n'}
              {'\n'}
              <Text style={styles.subSectionTitle}>B2 Read-only mode (default)</Text>
              • The app always opens in <Text style={styles.bold}>B2 Read-only mode</Text> by default.{'\n'}
              • Staff can open the app, load today&apos;s schedule (or the most recent one) and view all details.{'\n'}
              • All Save buttons and Admin-only features are disabled to prevent accidental changes.{'\n'}
              • This is the safest mode for staff who only need to see assignments, pickups/dropoffs and cleaning duties.{'\n'}
              {'\n'}
              <Text style={styles.subSectionTitle}>Switching to Admin mode with PIN</Text>
              • To unlock Admin mode, go to the <Text style={styles.bold}>Share &amp; Admin</Text> tab in the footer.{'\n'}
              • Use the Admin PIN panel to enter the 4-digit{' '}
              <Text style={styles.bold}>Admin PIN</Text> assigned by management.{'\n'}
              • After entering the correct PIN, Admin mode is activated and Admin-only features (including Reports) become available.{'\n'}
              • If the PIN is incorrect, the app remains locked in B2 Read-only mode.{'\n'}
              • Treat the Admin PIN like a password — only MD/Senior staff should have it, and it should not be shared in group chats or written where it is visible.{'\n'}
            </Text>

            {/* 3. Creating Today’s Schedule */}
            <Text style={styles.sectionTitle}>3. Creating today&apos;s schedule</Text>
            <Text style={styles.body}>
              When you open the app, it automatically loads today&apos;s schedule if one already exists, or the most
              recent schedule if today is empty. You&apos;ll see a banner at the top confirming whether a schedule was
              created or loaded.{'\n'}
              {'\n'}
              From the Home screen, tap <Text style={styles.bold}>&quot;Create Schedule&quot;</Text>.
              The process is a 6-step wizard. You can scroll each step and use the
              <Text style={styles.bold}> Next</Text> / <Text style={styles.bold}> Back</Text> buttons at the bottom.
            </Text>

            {/* Step 1 */}
            <Text style={styles.subSectionTitle}>Step 1 — Dream Team (Staff working at B2)</Text>
            <Text style={styles.body}>
              • Tap staff tiles to select who is working at B2 today.{'\n'}
              • &quot;Everyone&quot; is a special tile so that common items can apply to all staff.{'\n'}
              • Selected staff move into the top area so you can clearly see today&apos;s Dream Team, in alphabetical order.{'\n'}
              • Staff shown as <Text style={styles.bold}>Trainee</Text> or <Text style={styles.bold}>Senior</Text> reflect their status, and senior staff can have higher ratings.{'\n'}
              • Ratings for staff are used later to help with fairness and complexity across assignments and reports.
            </Text>

            {/* Step 2 */}
            <Text style={styles.subSectionTitle}>Step 2 — Attending Participants</Text>
            <Text style={styles.body}>
              • Tap participant tiles to select who is attending the Day Program today.{'\n'}
              • Selected participants appear in the top area, sorted alphabetically.{'\n'}
              • Only attending participants will appear in later steps (assignments, pickups &amp; dropoffs, floating, etc.).{'\n'}
              • If a participant is later marked as{' '}
              <Text style={styles.bold}>Not attending</Text> in the Edit Hub, their daily assignments and floating
              slots are cleared and replaced with a grey &quot;Not attending&quot; state so they no longer receive tasks.
            </Text>

            {/* Step 3 */}
            <Text style={styles.subSectionTitle}>Step 3 — Team Daily Assignments</Text>
            <Text style={styles.body}>
              • For each working staff member, assign participants for the main part of the day.{'\n'}
              • Participants can be moved between staff by tapping their names.{'\n'}
              • Unassigned participants appear in a separate pool so you can easily see if anyone is missing.{'\n'}
              • The aim is for every attending participant to be assigned to exactly one staff member.{'\n'}
              • Staff and participant{' '}
              <Text style={styles.bold}>rating bubbles</Text> help you quickly see where higher complexity is already
              allocated so you can balance the load fairly.{'\n'}
              • Participants on an outing appear with an outlined style so you can see they are off-site while still
              being linked to their staff member.
            </Text>

            {/* Step 4 */}
            <Text style={styles.subSectionTitle}>Step 4 — Pickups &amp; Dropoffs (with Helpers)</Text>
            <Text style={styles.body}>
              This step has three parts:{'\n'}
              {'\n'}1) <Text style={styles.bold}>Pickups</Text>{'\n'}
              • Tap participants who will be picked up by external transport (e.g. taxis, buses).{'\n'}
              • Participants marked as Pickups will not appear in the Dropoffs lists.{'\n'}
              {'\n'}2) <Text style={styles.bold}>Helpers</Text>{'\n'}
              • You can select staff who are not part of today&apos;s Dream Team as{' '}
              <Text style={styles.bold}>helper staff</Text> for pickups and dropoffs.{'\n'}
              • Helper staff can now properly own dropoff responsibilities; their assignments are stored and show up
              correctly in the Edit Hub and reports.{'\n'}
              {'\n'}3) <Text style={styles.bold}>Dropoffs</Text>{'\n'}
              • Each remaining (non-pickup) participant can be assigned to exactly one staff member or helper for dropoff.{'\n'}
              • Tap a participant under a staff member to move them on or off that staff member.{'\n'}
              • Tapping a participant again on the same staff member will unassign them.{'\n'}
              • Staff with no dropoffs for the day may be hidden by default on the Dropoffs screen, keeping the layout
              clean while still letting you expand if changes are needed.
            </Text>

            {/* Step 5 */}
            <Text style={styles.subSectionTitle}>Step 5 — Cleaning Duties</Text>
            <Text style={styles.body}>
              • Cleaning duties come from the list you manage in Settings.{'\n'}
              • Use this step to confirm which cleaning tasks apply today and, where relevant, which staff they relate to.{'\n'}
              • These duties are visible later in the Edit Hub so you can adjust or review them.{'\n'}
              • Special items such as taking the bins out can use long-press features and coloured dot indicators to
              match the correct bin colour for each task.
            </Text>

            {/* Step 6 */}
            <Text style={styles.subSectionTitle}>Step 6 — Final Checklist</Text>
            <Text style={styles.body}>
              • Choose the staff member responsible for the end-of-shift checklist.{'\n'}
              • Checklist items come from the &quot;Final List&quot; section in Settings.{'\n'}
              • This step is your last chance to confirm that all key closing tasks are visible and assigned.{'\n'}
              {'\n'}
              When you&apos;re happy:{' '}
              <Text style={styles.bold}>press &quot;Finish&quot;</Text>. The schedule is saved and you&apos;ll be
              taken back to the Edit Hub. The same schedule can then be opened and adjusted on other devices.
            </Text>

            {/* 4. Using the Edit Hub */}
            <Text style={styles.sectionTitle}>4. Using the Edit Hub</Text>
            <Text style={styles.body}>
              After you press <Text style={styles.bold}>Finish</Text>, the Edit Hub lets you adjust any part of
              today&apos;s schedule without redoing everything from scratch.{'\n'}
              {'\n'}
              Each Edit screen has a <Text style={styles.bold}>Save &amp; Exit</Text> button at the top. When you tap it,
              today&apos;s schedule is saved and the changes are available for other devices loading the same date.{'\n'}
              {'\n'}
              Below is a quick guide to each Edit Hub tile, using the same icons and colours you see on the Edit Hub screen.
            </Text>

            {/* Edit Hub-style cards */}
            <View style={styles.editCardList}>
              {/* Dream Team */}
              <View style={styles.editCard}>
                <View style={[styles.iconBubble, { backgroundColor: '#ffd5b4' }]}>
                  <Ionicons name="people-circle-outline" size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editCardTitle}>The Dream Team (Working at B2)</Text>
                  <Text style={styles.editCardBody}>
                    Choose who is working at B2 today and who is away. Ratings, trainee/senior status and colours
                    help you balance the team. Only staff shown here are used in Daily Assignments, Floating, and Cleaning.
                  </Text>
                </View>
              </View>

              {/* Participants */}
              <View style={styles.editCard}>
                <View style={[styles.iconBubble, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="happy-outline" size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editCardTitle}>Attending Participants</Text>
                  <Text style={styles.editCardBody}>
                    Confirm who is attending for the day (onsite or on outing). Turning a participant off here either
                    removes them from the day or marks them as &quot;Not attending&quot;, which clears their floating
                    and daily assignments and shows a grey state instead.
                  </Text>
                </View>
              </View>

              {/* Outings */}
              <View style={styles.editCard}>
                <View style={[styles.iconBubble, { backgroundColor: '#FFE4CC' }]}>
                  <Ionicons name="car-outline" size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editCardTitle}>Drive / Outing / Off-site</Text>
                  <Text style={styles.editCardBody}>
                    Set up any drives or outings, including names, times and notes. Staff and participants on an outing
                    are treated as off-site for floating and cleaning. Outing windows can temporarily disable certain
                    rooms or groups, and participants on an outing appear outlined in assignments.
                  </Text>
                </View>
              </View>

              {/* Assignments */}
              <View style={styles.editCard}>
                <View style={[styles.iconBubble, { backgroundColor: '#E5DEFF' }]}>
                  <Ionicons name="clipboard-outline" size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editCardTitle}>Team Daily Assignments</Text>
                  <Text style={styles.editCardBody}>
                    Reshuffle which staff have which participants. Ratings and complexity bubbles appear here so you
                    can see how complex each pairing is. Participants on an outing are outlined so you can still see
                    their connections without treating them as onsite.
                  </Text>
                </View>
              </View>

              {/* Floating */}
              <View style={styles.editCard}>
                <View style={[styles.iconBubble, { backgroundColor: '#FDF2FF' }]}>
                  <Ionicons name="refresh-circle-outline" size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editCardTitle}>
                    Floating Assignments (Front Room, Scotty, Twins)
                  </Text>
                  <Text style={styles.editCardBody}>
                    Plan floating support across the key shared spaces throughout the day. Only onsite and attending
                    staff and participants are used. If an entire room is marked &quot;Not attending&quot;, that group
                    is disabled and shown in a neutral &quot;Not attending&quot; style.
                  </Text>
                </View>
              </View>

              {/* Cleaning */}
              <View style={styles.editCard}>
                <View style={[styles.iconBubble, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="sparkles-outline" size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editCardTitle}>End of Shift Cleaning Assignments</Text>
                  <Text style={styles.editCardBody}>
                    Distribute cleaning tasks fairly so no one is stuck with the same jobs. Long-press features for
                    certain chores (e.g. bins) alongside coloured dots make it clear which bin or area is being discussed.
                    Changes save into the weekly cleaning reports.
                  </Text>
                </View>
              </View>

              {/* Pickups & Dropoffs */}
              <View style={styles.editCard}>
                <View style={[styles.iconBubble, { backgroundColor: '#FFE4E6' }]}>
                  <Ionicons name="bus-outline" size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editCardTitle}>Pickups and Dropoffs with Helpers</Text>
                  <Text style={styles.editCardBody}>
                    Adjust external pickups, helpers and dropoff responsibilities. Helper staff can now properly own
                    dropoffs, and participant-to-staff links are stored consistently so they appear in both Edit Hub and
                    Reports.
                  </Text>
                </View>
              </View>

              {/* Checklist */}
              <View style={styles.editCard}>
                <View style={[styles.iconBubble, { backgroundColor: '#E0E7FF' }]}>
                  <Ionicons name="checkbox-outline" size={20} color="#4B5563" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editCardTitle}>End of Shift Checklist</Text>
                  <Text style={styles.editCardBody}>
                    Change who is responsible and which closing tasks apply. These tasks appear in Reports so you can
                    see who regularly completes the end-of-day duties across the week.
                  </Text>
                </View>
              </View>
            </View>

            {/* 5. Share & Admin (with deprecated share code box) */}
            <Text style={styles.sectionTitle}>5. Share &amp; Admin</Text>
            <Text style={styles.body}>
              The Share &amp; Admin tab in the footer is the hub for unlocking Admin mode and, in future, optional
              share-code features.{'\n'}
              {'\n'}
              <Text style={styles.subSectionTitle}>Admin PIN (current behaviour)</Text>
              • Use the Admin PIN panel to enter the 4-digit{' '}
              <Text style={styles.bold}>Admin PIN</Text>. On success, Admin mode is unlocked.{'\n'}
              • Once in Admin mode, you can access Admin-only screens such as Reports and other advanced tools.{'\n'}
              • When you are finished, you can close the app or reload to return to B2 Read-only mode for regular staff use.{'\n'}
            </Text>

            {/* Deprecated / parked share codes */}
            <View style={styles.deprecatedBox}>
              <Text style={styles.deprecatedTitle}>
                Share codes (Not currently in use)
              </Text>
              <Text style={styles.deprecatedBody}>
                Historically, the app used 6-digit share codes so staff could import a schedule on their own device and
                view it. That system has been parked for now while the B2 Read-only and Admin PIN flow is in use.{'\n'}
                {'\n'}
                If share codes are reintroduced in the future, this is where you will:{'\n'}
                {'\n'}
                • See today&apos;s 6-digit share code for the schedule.{'\n'}
                • Copy the code or open Messages with a pre-filled SMS containing it.{'\n'}
                • Let staff type the code on another device and tap &quot;Import&quot; to load today&apos;s schedule.{'\n'}
                {'\n'}
                For now, all sharing is effectively done by viewing the central copy of the schedule in B2 Read-only
                mode, or unlocking Admin mode with the Admin PIN where appropriate.
              </Text>
            </View>

            {/* 6. Managing lists in Settings */}
            <Text style={styles.sectionTitle}>
              6. Managing staff, participants &amp; lists (Settings)
            </Text>
            <Text style={styles.body}>
              Open <Text style={styles.bold}>Settings</Text> to manage the master lists used across the app:{'\n'}
              {'\n'}• <Text style={styles.bold}>Staff</Text> – add, rename or remove staff; each staff member has a colour, status and rating information used in the UI.{'\n'}
              • <Text style={styles.bold}>Participants</Text> – maintain the list of participants, including gender and
              colour coding, used in Attending Participants, Assignments, Floating and Reports.{'\n'}
              • <Text style={styles.bold}>Chores</Text> – define cleaning duties shown in Step 5 and the Cleaning edit screen.{'\n'}
              • <Text style={styles.bold}>Final List</Text> – define the end-of-shift checklist items used in Step 6 and its edit screen.{'\n'}
              {'\n'}
              Tap a row to edit, the trash icon to delete, or use the Add bar to create new items. Changes here
              will appear automatically next time you build or edit a schedule.
            </Text>

            {/* 7. Reports (Admin only) */}
            <Text style={styles.sectionTitle}>7. Reports (Admin only)</Text>
            <Text style={styles.body}>
              The <Text style={styles.bold}>Reports</Text> area is visible only in Admin mode and provides weekly views
              of how the schedule has been used:{'\n'}
              {'\n'}
              • <Text style={styles.bold}>Team Daily Assignments Weekly Report</Text> – shows which staff were with
              which participants each day, Monday–Friday, in a B2 spreadsheet-style layout.{'\n'}
              • <Text style={styles.bold}>Cleaning &amp; Final Checklist Weekly Report</Text> – shows which staff
              completed cleaning and final checklist duties across the week.{'\n'}
              {'\n'}
              The reports use deduplicated staff names and a clean week selector so you can confidently step forwards
              and backwards one full week at a time, always starting on Monday.{'\n'}
              {'\n'}
              These reports are designed for supervision, fairness rotation, and audit documentation over time.
            </Text>

            {/* 8. General tips & troubleshooting */}
            <Text style={styles.sectionTitle}>8. General tips &amp; troubleshooting</Text>
            <Text style={styles.body}>
              • If something looks wrong after finishing a schedule, use the Edit Hub rather than restarting.{'\n'}
              • Make sure you&apos;ve set both a Dream Team (Step 1) and Attending Participants (Step 2) before doing assignments.{'\n'}
              • If a participant is missing from Dropoffs, check whether they were marked as a Pickup in Step 4 or are on an outing.{'\n'}
              • If staff or participants don&apos;t show as onsite/off-site as expected, review the Drive / Outing / Off-site screen and then tap Save &amp; Exit.{'\n'}
              • If floating or daily assignments still show people who are no longer attending, check the Attending Participants screen and mark them as Not attending so the day can reset for them.{'\n'}
              • If another device can&apos;t see recent changes, tap Save &amp; Exit on the Edit screen, go back to the Edit Hub or Home, and then refresh or reopen the app on the other device.{'\n'}
              • If you can&apos;t see the buttons at the bottom of a step, scroll down – the layout keeps them pinned near the bottom of the screen.{'\n'}
              {'\n'}
              If you&apos;re ever unsure, you can safely revisit <Text style={styles.bold}>Help</Text> or step back into
              the wizard and review your choices, then press <Text style={styles.bold}>Finish</Text> again.
            </Text>
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
    paddingBottom: 16,
  },
  // White card behind text
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
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
  // Edit Hub mini-cards
  editCardList: {
    marginTop: 8,
    marginBottom: 4,
  },
  editCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  editCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  editCardBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    color: '#4B5563',
  },
  // Deprecated / parked share-code panel
  deprecatedBox: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  deprecatedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
  },
  deprecatedBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
});
