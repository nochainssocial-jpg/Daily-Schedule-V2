import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

type Props = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

export default function Checkbox({ label, checked, onToggle }: Props) {
  return (
    <TouchableOpacity
      style={[styles.row, checked && styles.rowChecked]}
      onPress={onToggle}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rowChecked: {
    backgroundColor: '#ECFDF3',
    borderColor: '#A7F3D0',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  boxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tick: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#111827',
  },
  labelChecked: {
    color: '#065F46',
    fontWeight: '800',
  },
});
