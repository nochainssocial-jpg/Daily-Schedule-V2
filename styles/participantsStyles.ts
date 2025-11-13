import { StyleSheet } from 'react-native';

export const participantStyles = StyleSheet.create({
  section: {
    borderWidth: 2,
    borderColor: '#2557D6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    backgroundColor: '#fff'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12235a',
    marginBottom: 10
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8eef6'
  },
  chipText: { fontSize: 15, color: '#1f2937', fontWeight: '600' },
  swatch: { width: 14, height: 12, borderRadius: 3, marginRight: 8 },
  chipSelected: { backgroundColor: '#E6F4EA', borderColor: '#B7E2C2' },
  chipMuted: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }
});
