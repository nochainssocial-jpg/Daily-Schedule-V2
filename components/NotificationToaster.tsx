// components/NotificationToaster.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotifications } from '@/hooks/notifications';

export default function NotificationToaster() {
  const { current, clearCurrent } = useNotifications();
  const [visible, setVisible] = useState(false);
  const translateX = React.useRef(new Animated.Value(40)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;

    setVisible(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 40,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        clearCurrent();
      });
    }, 3500);

    return () => clearTimeout(timer);
  }, [current, translateX, opacity, clearCurrent]);

  if (!current || !visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.root,
        {
          opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <Bell size={18} color="#FFFFFF" />
        </View>
        <Text style={styles.text} numberOfLines={2}>
          {current.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const ORANGE = '#F7A534'; // agreed mid orange

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 30,
    right: 20,
    width: 260,
    zIndex: 200,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: ORANGE,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
