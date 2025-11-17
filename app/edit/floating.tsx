// app/floating.tsx (or correct path for the Floating route)
// @ts-nocheck
import React from 'react';
import { View, Text } from 'react-native';

export default function FloatingDebugScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '600' }}>
        Floating DEBUG screen
      </Text>
      <Text style={{ marginTop: 10 }}>
        If you can see this, the route is wired and the crash is inside the
        real floating UI.
      </Text>
    </View>
  );
}
