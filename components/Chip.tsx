import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  rightAddon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  /** Visual mode used for outings etc. */
  mode?: 'default' | 'onsite' | 'offsite' | 'training' | 'outing1' | 'outing2' | 'outing3';
};

const PINK = '#F54FA5';
const OUTING1_BG = '#FFF7ED';
const OUTING1_BORDER = '#FB923C';
const OUTING1_TEXT = '#C2410C';
const OUTING2_BG = '#F5F3FF';
const OUTING2_BORDER = '#8B5CF6';
const OUTING2_TEXT = '#6D28D9';
const OUTING3_BG = '#FEF2F2';
const OUTING3_BORDER = '#DC2626';
const OUTING3_TEXT = '#B91C1C';
const TEXT_DARK = '#111827';
const BORDER_DEFAULT = '#E5E7EB';

export default function Chip({
  label,
  onPress,
  onLongPress,
  selected,
  rightAddon,
  leftAddon,
  disabled,
  style,
  mode = 'default',
}: Props) {
  const isOnsite = mode === 'onsite';
  const isOffsite = mode === 'offsite';
  const isTraining = mode === 'training';
  const isOuting1 = mode === 'outing1';
  const isOuting2 = mode === 'outing2';
  const isOuting3 = mode === 'outing3';

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      delayLongPress={200}
      activeOpacity={0.8}
      style={[
        styles.container,
        mode === 'default' && styles.defaultMode,
        isOnsite && styles.onsite,
        isOffsite && styles.offsite,
        isTraining && styles.training,
        isOuting1 && styles.outing1,
        isOuting2 && styles.outing2,
        isOuting3 && styles.outing3,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leftAddon ? <View style={styles.leftAddon}>{leftAddon}</View> : null}

      <Text
        style={[
          styles.label,
          mode === 'default' && styles.labelDefault,
          isOnsite && styles.labelOnsite,
          isOffsite && styles.labelOffsite,
          isTraining && styles.labelTraining,
          isOuting1 && styles.labelOuting1,
          isOuting2 && styles.labelOuting2,
          isOuting3 && styles.labelOuting3,
          selected && styles.labelSelected,
        ]}
        numberOfLines={1}
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

  // Outing 1 = light orange pill
  outing1: {
    backgroundColor: OUTING1_BG,
    borderColor: OUTING1_BORDER,
  },
  labelOuting1: {
    color: OUTING1_TEXT,
    fontWeight: '600',
  },

  // Outing 2 = light purple pill
  outing2: {
    backgroundColor: OUTING2_BG,
    borderColor: OUTING2_BORDER,
  },
  labelOuting2: {
    color: OUTING2_TEXT,
    fontWeight: '600',
  },

  // Additional Safety Transport = light red pill
  outing3: {
    backgroundColor: OUTING3_BG,
    borderColor: OUTING3_BORDER,
    borderWidth: 2,
  },
  labelOuting3: {
    color: OUTING3_TEXT,
    fontWeight: '700',
  },

  // Training = light blue pill (Option C)
  training: {
    backgroundColor: '#A7D3F5',
    borderColor: '#5AA6D6',
  },
  labelTraining: {
    color: '#1C3F57',
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

  leftAddon: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addon: {
    marginLeft: 8,
  },
});
