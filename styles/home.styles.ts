import { StyleSheet } from 'react-native';

// Brand colours per original (No Chains)
const PINK = '#E91E63';
const GREY_BG = '#F7F7F7';
const CARD = '#FFFFFF';
const TEXT = '#222';
const SUBTLE = '#6B7280';

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GREY_BG,
  },
  container: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    marginTop: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT,
  },
  dateRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
  },
  dateBadge: {
    marginTop: 8,
    backgroundColor: PINK,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  dateBadgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  createBtn: {
    backgroundColor: PINK,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editBtnText: {
    color: TEXT,
    fontWeight: '700',
  },
  quickStartCard: {
    marginTop: 16,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickStartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SUBTLE,
    marginBottom: 8,
  },
  quickStartList: {
    gap: 8,
  },
  quickStartItem: {
    fontSize: 13,
    color: SUBTLE,
  },
  footerSpace: { height: 40 },
});
