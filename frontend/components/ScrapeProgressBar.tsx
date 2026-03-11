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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percent,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  useEffect(() => {
    // Pulse animation for active state
    if (percent < 100) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [percent < 100]);

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const zeptoDone = message.includes('Zepto done') || message.includes('Both platforms') || percent >= 92;
  const blinkitDone = message.includes('Blinkit done') || message.includes('Both platforms') || percent >= 92;
  const zeptoActive = percent >= 15 && !zeptoDone;
  const blinkitActive = percent >= 15 && !blinkitDone;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.iconWrap, { opacity: pulseAnim }]}>
          <Feather name="activity" size={16} color={COLORS.primary} />
        </Animated.View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Live Price Scraping</Text>
          <Text style={styles.subtitle}>Fetching top 5 products</Text>
        </View>
        <Text style={styles.percentBig}>{Math.round(percent)}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

      {/* Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Platform Status Cards */}
      <View style={styles.platformRow}>
        <View style={[
          styles.platformCard,
          zeptoDone && styles.platformCardDone,
          zeptoActive && styles.platformCardActive,
        ]}>
          <View style={[styles.platformDot, { backgroundColor: COLORS.zepto }]} />
          <Text style={styles.platformName}>Zepto</Text>
          {zeptoDone ? (
            <Feather name="check-circle" size={14} color={COLORS.success} />
          ) : zeptoActive ? (
            <Animated.View style={{ opacity: pulseAnim }}>
              <Feather name="loader" size={14} color={COLORS.zepto} />
            </Animated.View>
          ) : (
            <Feather name="clock" size={14} color={COLORS.textTertiary} />
          )}
        </View>
        <View style={[
          styles.platformCard,
          blinkitDone && styles.platformCardDone,
          blinkitActive && styles.platformCardActive,
        ]}>
          <View style={[styles.platformDot, { backgroundColor: COLORS.blinkit }]} />
          <Text style={styles.platformName}>Blinkit</Text>
          {blinkitDone ? (
            <Feather name="check-circle" size={14} color={COLORS.success} />
          ) : blinkitActive ? (
            <Animated.View style={{ opacity: pulseAnim }}>
              <Feather name="loader" size={14} color={COLORS.blinkit} />
            </Animated.View>
          ) : (
            <Feather name="clock" size={14} color={COLORS.textTertiary} />
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
    padding: 18,
    marginHorizontal: 16,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  percentBig: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  barTrack: {
    height: 6,
    backgroundColor: COLORS.bgCardHighlight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 10,
  },
  platformCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgCardHighlight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  platformCardDone: {
    borderColor: COLORS.success + '44',
    backgroundColor: COLORS.success + '0A',
  },
  platformCardActive: {
    borderColor: COLORS.border,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  platformName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
