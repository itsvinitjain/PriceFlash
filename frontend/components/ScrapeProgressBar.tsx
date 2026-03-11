import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

interface Props {
  percent: number;
  message: string;
}

export default function ScrapeProgressBar({ percent, message }: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percent,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Feather name="activity" size={16} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Live Price Scraping</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]}>
            <View style={styles.barGlow} />
          </Animated.View>
        </View>
        <Text style={styles.percentText}>{Math.round(percent)}%</Text>
      </View>

      {/* Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Platform indicators */}
      <View style={styles.platformRow}>
        <View style={styles.platformIndicator}>
          <View style={[styles.dot, { backgroundColor: COLORS.zepto }]} />
          <Text style={styles.platformName}>Zepto</Text>
          {percent >= 55 ? (
            <Feather name="check-circle" size={12} color={COLORS.success} />
          ) : percent > 15 ? (
            <Feather name="loader" size={12} color={COLORS.zepto} />
          ) : (
            <Feather name="clock" size={12} color={COLORS.textTertiary} />
          )}
        </View>
        <View style={styles.platformIndicator}>
          <View style={[styles.dot, { backgroundColor: COLORS.blinkit }]} />
          <Text style={styles.platformName}>Blinkit</Text>
          {percent >= 55 ? (
            <Feather name="check-circle" size={12} color={COLORS.success} />
          ) : percent > 15 ? (
            <Feather name="loader" size={12} color={COLORS.blinkit} />
          ) : (
            <Feather name="clock" size={12} color={COLORS.textTertiary} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.bgCardHighlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    position: 'relative',
  },
  barGlow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    width: 42,
    textAlign: 'right',
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 16,
  },
  platformIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgCardHighlight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  platformName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
