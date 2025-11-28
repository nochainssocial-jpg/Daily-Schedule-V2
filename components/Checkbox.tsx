import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

type Props = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

export default function Checkbox({ label, checked, onToggle }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.box, checked && styles.boxChecked]} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999',
    marginRight: 8,
  },
  boxChecked: {
    backgroundColor: '#86a2fe',
    borderColor: '#e91e63',
  },
  label: {
    fontSize: 14,
  },
});
