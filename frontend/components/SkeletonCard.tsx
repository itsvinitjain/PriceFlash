import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../utils/constants';

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.row}>
        <View style={styles.circle} />
        <View style={styles.lines}>
          <View style={styles.lineShort} />
          <View style={styles.lineLong} />
          <View style={styles.lineXs} />
        </View>
        <View style={styles.pricePlaceholder} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
  lines: {
    flex: 1,
    gap: 6,
  },
  lineShort: {
    width: '50%',
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  lineLong: {
    width: '80%',
    height: 10,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  lineXs: {
    width: '35%',
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  pricePlaceholder: {
    width: 56,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
});
