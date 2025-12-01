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

// Fallback colour if we have no category mapping
const DEFAULT_BLUE = '#0084ff';

// Map categories -> title
const CATEGORY_STYLES: Record<
  string,
  {
    title: string;
  }
>

export default function NotificationToaster() {
  const { current, clearCurrent } = useNotifications();
  const [visible, setVisible] = useState(false);
  const translateX = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;

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

  const styleForCategory =
    (current.category && CATEGORY_STYLES[current.category]) || null;

  let bgColor = styleForCategory?.bg ?? DEFAULT_ORANGE;
  const message = current.message || '';

  // Override colours for B2 / Admin access-control toasts
  if (message.includes('B2') && /read[- ]only/i.test(message)) {
    // B2 read-only mode: always red with white text
    bgColor = '#ed002cff';
  } else if (/^Admin Mode Enabled/i.test(message)) {
    // Admin mode: green with white text
    bgColor = '#01bb23ff';
  }

  const title =
    styleForCategory?.title ||
    (current.category
      ? current.category[0].toUpperCase() + current.category.slice(1)
      : 'Update');

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
      <View style={[styles.panel, { backgroundColor: bgColor }]}>
        <View style={styles.iconWrap}>
          <Bell size={18} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
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
    // Dropped down so it sits just under the header + SaveExit
    top: 120,
    right: 50,
    width: 320,
    zIndex: 200,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    // backgroundColor is now set dynamically per category
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
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  text: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  closeBtn: {
    marginLeft: 8,
    padding: 4,
  },
});
