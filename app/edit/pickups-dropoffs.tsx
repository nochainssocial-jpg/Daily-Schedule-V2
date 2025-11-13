import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';

export default function EditPickupsDropoffsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pickups and Dropoffs with Helpers</Text>
      <Text style={styles.body}>
        The detailed pickups and dropoffs editor will live here. For this cleaned base
        project we&apos;re keeping it as a placeholder so routing and navigation are solid.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  body: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
});
