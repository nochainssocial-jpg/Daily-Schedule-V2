// components/Footer.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';

export default function Footer() {
  const pathname = usePathname();

  const goHome = () => router.push('/home');
  const goEdit = () => router.push('/edit');
  const goHelp = () => router.push('/help');

  return (
    <View style={styles.container}>
      <FooterItem
        label="Home"
        active={pathname === '/home'}
        onPress={goHome}
      />
      <FooterItem
        label="Edit Hub"
        active={pathname.startsWith('/edit')}
        onPress={goEdit}
      />
      <FooterItem
        label="Help"
        active={pathname === '/help'}
        onPress={goHelp}
      />
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
      style={[styles.item, active && styles.itemActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderColor: '#e4d7f0',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  itemActive: {
    backgroundColor: '#fbe4f0',
  },
  itemLabel: {
    fontSize: 13,
    color: '#5a486b',
  },
  itemLabelActive: {
    fontWeight: '600',
    color: '#e91e63',
  },
});
