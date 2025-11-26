import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  rightAddon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  /** NEW — controls color mode for outing logic */
  mode?: 'default' | 'onsite' | 'offsite';
};

export default function Chip({
  label,
  onPress,
  selected,
  rightAddon,
  disabled,
  style,
  mode = 'default',
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        mode === 'onsite' && styles.onsite,
        mode === 'offsite' && styles.offsite,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.label,
          mode === 'onsite' && styles.labelOnsite,
          mode === 'offsite' && styles.labelOffsite,
          selected && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
      {rightAddon ? <View style={styles.addon}>{rightAddon}</View> : null}
    </TouchableOpacity>
  );
}

const PINK = '#e91e63';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },

  /** ---------------------------
   *  NEW STYLES
   *  --------------------------- */

  // On-site = solid pink pill + white text
  onsite: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  labelOnsite: {
    color: '#fff',
    fontWeight: '600',
  },

  // Off-site = white background + pink outline + pink text
  offsite: {
    borderColor: PINK,
  },
  labelOffsite: {
    color: PINK,
    fontWeight: '600',
  },

  /** ---------------------------- */

  selected: {
    borderColor: PINK,
  },

  disabled: {
    opacity: 0.4,
  },

  label: {
    fontSize: 14,
    color: '#333',
  },
  labelSelected: {
    fontWeight: '600',
  },

  addon: {
    marginLeft: 8,
  },
});
