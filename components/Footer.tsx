// components/Footer.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router, usePathname } from 'expo-router';

export default function Footer() {
  const pathname = usePathname();

  const goHome = () => router.push('/home');
  const goEditHub = () => router.push('/edit');
  const goShare = () => router.push('/share-schedule'); // or '/share' if that's your file
  const goSettings = () => router.push('/settings');
  const goHelp = () => router.push('/help');

  return (
    <View style={styles.footerContainer} accessibilityRole="contentinfo">
      <View style={styles.navRow}>
        <FooterItem
          label="Home"
          active={pathname === '/home'}
          onPress={goHome}
        />
        <FooterItem
          label="Edit Hub"
          active={pathname.startsWith('/edit')}
          onPress={goEditHub}
        />
        <FooterItem
          label="Share"
          active={pathname === '/share-schedule'}
          onPress={goShare}
        />
        <FooterItem
          label="Settings"
          active={pathname === '/settings'}
          onPress={goSettings}
        />
        <FooterItem
          label="Help"
          active={pathname === '/help'}
          onPress={goHelp}
        />
      </View>

      <View style={styles.brandingRow}>
        <Text style={styles.brandingText}>
          Daily Schedule App | Designed by Bruno Pouzet, coded &amp; refined by
          OpenAI
        </Text>
      </View>
    </View>
  );
}

type ItemProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

function FooterItem({ label, active, onPress }: ItemProps) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: '#F54FA5', // Pink matching Create button (from foot.tsx)
    borderTopWidth: 0,
    ...(Platform.OS === 'web'
      ? { position: 'fixed', left: 0, right: 0, bottom: 0 }
      : null),
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    zIndex: 999,
  },

  navRow: {
  height: 56,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',      // <— bring items together
  paddingHorizontal: 4,          // <— reduce side padding
  gap: 10,                        // <— small modern spacing
},

navItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,         // <— reduced from before
  paddingVertical: 6,
  borderRadius: 999,
},

  navItemActive: {
    backgroundColor: '#FF8FC5', // lighter pink highlight
  },

  navLabel: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  navLabelActive: {
    fontWeight: '700',
  },

  brandingRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#444444',
  },

  brandingText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#FFFFFF', // White
    textAlign: 'center',
  },
});

