import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  rightAddon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function Chip({ label, onPress, selected, rightAddon, disabled, style }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
      {rightAddon ? <View style={styles.addon}>{rightAddon}</View> : null}
    </TouchableOpacity>
  );
}

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
  },
  selected: {
    borderColor: '#e91e63',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 14,
  },
  labelSelected: {
    fontWeight: '600',
  },
  addon: {
    marginLeft: 8,
  },
});
