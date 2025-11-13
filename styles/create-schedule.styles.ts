/**
 * Shared styles for Create Schedule screens.
 * Safe to add to your repo at: styles/create-schedule.styles.ts
 * Import in your screens with:
 *   import cs from '@/styles/create-schedule.styles';
 */
import { StyleSheet } from 'react-native';

const GREEN = '#22C55E'; // matches Next button
const GREY_BG = '#E5E7EB'; // light grey background
const GREY_TEXT = '#6B7280'; // grey text

const cs = StyleSheet.create({
  // Container wrappers
  sectionWrapper: {
    borderWidth: 2,
    borderColor: '#2563EB', // blue-600
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  // "Attending Day Program" selected pill
  attendingPill: {
    backgroundColor: '#DCFCE7', // green-100
    borderColor: GREEN,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
  },
  attendingPillText: {
    color: '#065F46', // emerald-800
    fontSize: 16,
    fontWeight: '600',
  },

  // "Not Attending" unselected item (white text on light grey background)
  notAttendingItem: {
    backgroundColor: GREY_BG,
    borderColor: '#D1D5DB', // gray-300
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginRight: 12,
    marginBottom: 12,
  },
  notAttendingItemText: {
    color: '#FFFFFF', // white text as requested
    fontSize: 16,
    fontWeight: '600',
  },

  // Grid helpers
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Staff tiles (Daily Assignments)
  staffTile: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  
    outlineStyle: 'none',
  },
  staffTileActive: {
    borderColor: '#3B82F6', // blue-500 outline for active
    backgroundColor: '#DBEAFE', // blue-100
  },
  staffTileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  // Left-side helper note
  helperNote: {
    color: GREY_TEXT,
    fontSize: 12,
    marginBottom: 8,
  },

  // Ensure extra padding at bottom so the global footer never overlaps content
  screenBottomSpacer: {
    height: 96,
  },
});

export default cs;


  tileGrey: {
    backgroundColor: '#D0D6DF',
    borderColor: '#C3CAD5',
  },


  tileTxtGrey: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
attendingWrap: {
  // Ensures enough vertical space to comfortably fit ~20 chips on typical widths.
  // Adjust if you prefer taller/shorter. This does NOT force scroll; the page already scrolls.
  minHeight: 280,
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#EEF2F7' as any,
  borderRadius: 12,
  padding: 12,
  justifyContent: 'flex-start' as const,
},

// Grey-out style for names in the bottom section that are already selected
tileGrey: {
  backgroundColor: '#F3F4F6',
  borderColor: '#E5E7EB' as any,
},
tileTxtGrey: {
  color: '#667085',
},
workingWrap: {
  // 3 rows x 5 chips target: ~3*(chip height ~44 + vertical gap ~10) + padding
  // Adjust if you want more/less headroom.
  minHeight: 210,
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#EEF2F7' as any,
  borderRadius: 12,
  padding: 12,
  justifyContent: 'flex-start' as const,
},
