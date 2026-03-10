import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, PlatformResult, PLATFORM_INITIALS } from '../utils/constants';

interface Props {
  result: PlatformResult;
  isBest: boolean;
  onPress: (result: PlatformResult) => void;
}

export default function PlatformCard({ result, isBest, onPress }: Props) {
  const initial = PLATFORM_INITIALS[result.platform_id] || result.platform[0];
  const savings = result.mrp - result.price;
  const outOfStock = !result.in_stock;

  return (
    <TouchableOpacity
      testID={`platform-card-${result.platform_id}`}
      activeOpacity={outOfStock ? 1 : 0.7}
      onPress={() => !outOfStock && onPress(result)}
      style={[
        styles.card,
        isBest && styles.bestCard,
        outOfStock && styles.outOfStockCard,
      ]}
    >
      {isBest && (
        <View testID="best-badge" style={styles.bestBadge}>
          <Feather name="zap" size={10} color="#000" />
          <Text style={styles.bestBadgeText}>BEST PRICE</Text>
        </View>
      )}

      {outOfStock && (
        <View testID="oos-badge" style={styles.oosBadge}>
          <Text style={styles.oosBadgeText}>OUT OF STOCK</Text>
        </View>
      )}

      <View style={styles.row}>
        {/* Platform Logo */}
        <View style={[styles.logoCircle, { backgroundColor: result.platform_color + '22' }]}>
          <Text style={[styles.logoInitial, { color: result.platform_color }]}>
            {initial}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.platformName, outOfStock && styles.dimText]}>
            {result.platform}
          </Text>
          <Text
            style={[styles.productName, outOfStock && styles.dimText]}
            numberOfLines={1}
          >
            {result.product_name}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.deliveryPill}>
              <Feather name="zap" size={10} color={COLORS.cyan} />
              <Text style={styles.deliveryText}>
                {result.delivery_minutes} min
              </Text>
            </View>
            <Text style={styles.feeText}>
              {result.delivery_fee > 0 ? `₹${result.delivery_fee} delivery` : 'Free delivery'}
            </Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceCol}>
          <Text style={[styles.finalPrice, outOfStock && styles.dimText]}>
            ₹{result.final_price}
          </Text>
          {savings > 0 && (
            <Text style={styles.mrpText}>₹{result.mrp}</Text>
          )}
        </View>
      </View>

      {result.discount_text && !outOfStock ? (
        <View style={styles.offerRow}>
          <Feather name="tag" size={11} color={COLORS.orange} />
          <Text style={styles.offerText}>{result.discount_text}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
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
  bestCard: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  outOfStockCard: {
    opacity: 0.5,
  },
  bestBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  bestBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  oosBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  oosBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoInitial: {
    fontSize: 16,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  platformName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  productName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.cyanDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.cyan,
  },
  feeText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  finalPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  mrpText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  dimText: {
    color: COLORS.textTertiary,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  offerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.orange,
  },
});
