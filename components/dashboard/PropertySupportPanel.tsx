import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type PropertySupportDashboardRow = {
  id: string;
  supportType: 'property' | 'participant';
  supportNumber: number;
  locationName: string;
  staffNames: string[];
  notes: string;
};

export function PropertySupportPanel({
  propertySupportRows,
}: {
  propertySupportRows: PropertySupportDashboardRow[];
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <View>
          <Text style={styles.panelEyebrow}>Today’s support visits</Text>
          <Text style={styles.panelTitle}>Property & Participant Support</Text>
        </View>
        <Text style={styles.progressText}>
          {propertySupportRows.length}{' '}
          {propertySupportRows.length === 1 ? 'support visit' : 'support visits'}
        </Text>
      </View>

      {propertySupportRows.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="home-account" size={44} color="#94A3B8" />
          <Text style={styles.emptyText}>No support visits assigned.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.innerScroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          scrollEnabled={propertySupportRows.length > 4}
        >
          {propertySupportRows.map((row) => {
            const isParticipantSupport = row.supportType === 'participant';

            return (
              <View
                key={row.id}
                style={[
                  styles.card,
                  isParticipantSupport && styles.participantCard,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconCircle,
                      isParticipantSupport && styles.participantIconCircle,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isParticipantSupport ? 'account-heart' : 'home-heart'}
                      size={21}
                      color={isParticipantSupport ? '#6D28D9' : '#0F766E'}
                    />
                  </View>
                  <View style={styles.cardHeadingBlock}>
                    <Text
                      style={[
                        styles.visitLabel,
                        isParticipantSupport && styles.participantVisitLabel,
                      ]}
                    >
                      {isParticipantSupport ? 'Participant support' : 'Property support'}{' '}
                      {row.supportNumber}
                    </Text>
                    <Text
                      style={[
                        styles.locationName,
                        isParticipantSupport && styles.participantLocationName,
                      ]}
                      numberOfLines={2}
                    >
                      {row.locationName}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.staffPill,
                    isParticipantSupport && styles.participantStaffPill,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={16}
                    color={isParticipantSupport ? '#6D28D9' : '#115E59'}
                  />
                  <Text
                    style={[
                      styles.staffNames,
                      isParticipantSupport && styles.participantStaffNames,
                    ]}
                    numberOfLines={1}
                  >
                    {row.staffNames.join(', ')}
                  </Text>
                </View>

                {row.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>
                      {isParticipantSupport ? 'Support details' : 'Tasks'}
                    </Text>
                    <Text style={styles.notesText} numberOfLines={2}>
                      {row.notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 16,
    // The floating rotation banner sits over the lower portion of the dashboard.
    // Reserving this space keeps both rows of support cards fully visible.
    paddingBottom: 150,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelEyebrow: {
    color: '#0F766E',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.75,
  },
  panelTitle: {
    color: '#134E4A',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 1,
  },
  progressText: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  innerScroll: {
    flex: 1,
    maxHeight: 304,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingBottom: 2,
  },
  card: {
    width: '49.2%',
    height: 146,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5EEAD4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    overflow: 'hidden',
  },
  participantCard: {
    backgroundColor: '#FCFAFF',
    borderColor: '#C4B5FD',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  participantIconCircle: {
    backgroundColor: '#EDE9FE',
  },
  cardHeadingBlock: {
    flex: 1,
    minWidth: 0,
  },
  visitLabel: {
    color: '#0F766E',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantVisitLabel: {
    color: '#6D28D9',
  },
  locationName: {
    color: '#134E4A',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
    marginTop: 1,
  },
  participantLocationName: {
    color: '#4C1D95',
  },
  staffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  participantStaffPill: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  staffNames: {
    flex: 1,
    color: '#115E59',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  participantStaffNames: {
    color: '#5B21B6',
  },
  notesBox: {
    flex: 1,
    minHeight: 42,
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesLabel: {
    color: '#64748B',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  notesText: {
    color: '#334155',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: { color: '#64748B', fontSize: 16, fontWeight: '800' },
});
