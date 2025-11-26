import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  rightAddon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  /** Visual mode used for outings etc. */
  mode?: 'default' | 'onsite' | 'offsite';
};

const PINK = '#F54FA5';
const TEXT_DARK = '#111827';
const BORDER_DEFAULT = '#E5E7EB';

export default function Chip({
  label,
  onPress,
  selected,
  rightAddon,
  disabled,
  style,
  mode = 'default',
}: Props) {
  const isOnsite = mode === 'onsite';
  const isOffsite = mode === 'offsite';

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        mode === 'default' && styles.defaultMode,
        isOnsite && styles.onsite,
        isOffsite && styles.offsite,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          mode === 'default' && styles.labelDefault,
          isOnsite && styles.labelOnsite,
          isOffsite && styles.labelOffsite,
          selected && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
      {rightAddon ? <View style={styles.addon}>{rightAddon}</View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },

  // Default grey pill
  defaultMode: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER_DEFAULT,
  },
  labelDefault: {
    color: TEXT_DARK,
  },

  // On-site = solid pink pill with white text
  onsite: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  labelOnsite: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Off-site (outing) = white pill, pink outline, pink text
  offsite: {
    backgroundColor: '#FFFFFF',
    borderColor: PINK,
  },
  labelOffsite: {
    color: PINK,
    fontWeight: '600',
  },

  // Generic selected enhancement (kept for backwards compatibility)
  selected: {
    borderColor: PINK,
  },
  labelSelected: {
    fontWeight: '600',
  },

  disabled: {
    opacity: 0.4,
  },

  label: {
    fontSize: 14,
  },
  addon: {
    marginLeft: 8,
  },
});
