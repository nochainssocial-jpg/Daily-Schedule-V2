import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type PropertySupportDashboardRow = {
  id: string;
  propertyName: string;
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
          <Text style={styles.panelEyebrow}>Afternoon property visits</Text>
          <Text style={styles.panelTitle}>Property Support</Text>
        </View>
        <Text style={styles.progressText}>
          {propertySupportRows.length} {propertySupportRows.length === 1 ? 'visit' : 'visits'}
        </Text>
      </View>

      {propertySupportRows.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="home-heart" size={44} color="#94A3B8" />
          <Text style={styles.emptyText}>No property support visits assigned.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.innerScroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {propertySupportRows.map((row, index) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="home-heart" size={26} color="#0F766E" />
                </View>
                <View style={styles.cardHeadingBlock}>
                  <Text style={styles.visitLabel}>Property support {index + 1}</Text>
                  <Text style={styles.propertyName} numberOfLines={2}>
                    {row.propertyName}
                  </Text>
                </View>
              </View>

              <View style={styles.staffPill}>
                <MaterialCommunityIcons name="account-group" size={18} color="#115E59" />
                <Text style={styles.staffNames} numberOfLines={2}>
                  {row.staffNames.join(', ')}
                </Text>
              </View>

              {row.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Tasks</Text>
                  <Text style={styles.notesText} numberOfLines={4}>
                    {row.notes}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 18,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  panelEyebrow: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  panelTitle: {
    color: '#134E4A',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 2,
  },
  progressText: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  innerScroll: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 14,
    paddingBottom: 4,
  },
  card: {
    width: '49.25%',
    minHeight: 188,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5EEAD4',
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadingBlock: { flex: 1 },
  visitLabel: {
    color: '#0F766E',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  propertyName: {
    color: '#134E4A',
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    marginTop: 2,
  },
  staffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  staffNames: {
    flex: 1,
    color: '#115E59',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  notesBox: {
    flex: 1,
    marginTop: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesLabel: {
    color: '#64748B',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginBottom: 3,
  },
  notesText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
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
