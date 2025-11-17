// components/NotificationToaster.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { useNotifications } from '@/hooks/notifications';

const ORANGE = '#F7A534'; // agreed mid-orange

export default function NotificationToaster() {
  const { current, clearCurrent } = useNotifications();
  const [visible, setVisible] = useState(false);
  const translateX = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) {
      return;
    }

    setVisible(true);

    // slide in + fade in
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
  }, [current, translateX, opacity]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 40,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      clearCurrent();
    });
  };

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

        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {current.category
              ? current.category[0].toUpperCase() +
                current.category.slice(1)
              : 'Update'}
          </Text>
          <Text style={styles.text} numberOfLines={2}>
            {current.message}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
        >
          <X size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

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
    marginRight: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  text: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  closeBtn: {
    marginLeft: 8,
    padding: 4,
  },
});
