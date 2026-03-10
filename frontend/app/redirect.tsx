import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS, PLATFORM_INITIALS } from '../utils/constants';

export default function RedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    platform: string;
    platformId: string;
    platformColor: string;
    productName: string;
    finalPrice: string;
    mrp: string;
    deepLink: string;
    deliveryMinutes: string;
  }>();

  const platform = params.platform || '';
  const platformId = params.platformId || '';
  const platformColor = params.platformColor || COLORS.primary;
  const productName = params.productName || '';
  const finalPrice = parseInt(params.finalPrice || '0', 10);
  const mrp = parseInt(params.mrp || '0', 10);
  const deepLink = decodeURIComponent(params.deepLink || '');
  const deliveryMinutes = params.deliveryMinutes || '';
  const savings = mrp - finalPrice;
  const initial = PLATFORM_INITIALS[platformId] || platform[0] || '?';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse animation on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Progress bar animation (1.5s)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Auto redirect after 1.5 seconds
    const timeout = setTimeout(() => {
      setRedirecting(true);
      if (deepLink) {
        Linking.openURL(deepLink).catch(() => {
          // If deep link fails, go back
          router.back();
        });
      } else {
        router.back();
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Platform Logo */}
        <Animated.View
          style={[
            styles.logoWrapper,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: platformColor + '33' },
            ]}
          >
            <Text style={[styles.logoInitial, { color: platformColor }]}>
              {initial}
            </Text>
          </View>
        </Animated.View>

        {/* Platform Name */}
        <Text testID="redirect-platform" style={styles.platformName}>
          Opening {platform}
        </Text>

        {/* Product Name */}
        <Text testID="redirect-product" style={styles.productName} numberOfLines={2}>
          {productName}
        </Text>

        {/* Price */}
        <Text testID="redirect-price" style={styles.price}>
          ₹{finalPrice}
        </Text>

        {/* Savings */}
        {savings > 0 && (
          <View style={styles.savingsRow}>
            <Feather name="trending-down" size={16} color={COLORS.success} />
            <Text testID="redirect-savings" style={styles.savingsText}>
              You're saving ₹{savings} vs MRP
            </Text>
          </View>
        )}

        {/* Delivery */}
        {deliveryMinutes ? (
          <View style={styles.deliveryRow}>
            <Feather name="zap" size={14} color={COLORS.cyan} />
            <Text style={styles.deliveryText}>
              Delivery in ~{deliveryMinutes} min
            </Text>
          </View>
        ) : null}

        {/* Progress Bar */}
        <View style={styles.progressBarOuter}>
          <Animated.View
            style={[
              styles.progressBarInner,
              {
                width: progressWidth,
                backgroundColor: platformColor,
              },
            ]}
          />
        </View>

        <Text style={styles.redirectLabel}>
          {redirecting ? 'Redirecting...' : 'Preparing redirect...'}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 32,
    fontWeight: '900',
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 12,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  savingsText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.success,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 32,
  },
  deliveryText: {
    fontSize: 13,
    color: COLORS.cyan,
    fontWeight: '500',
  },
  progressBarOuter: {
    width: '80%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 2,
  },
  redirectLabel: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
});
