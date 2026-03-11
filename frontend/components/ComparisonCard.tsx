import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, ComparedProduct } from '../utils/constants';

interface Props {
  product: ComparedProduct;
  index: number;
  onPlatformPress: (platformId: string, query: string) => void;
}

export default function ComparisonCard({ product, index, onPlatformPress }: Props) {
  const hasZepto = !!product.zepto;
  const hasBlinkit = !!product.blinkit;
  const hasBoth = hasZepto && hasBlinkit;

  const zeptoPrice = product.zepto?.price || 0;
  const blinkitPrice = product.blinkit?.price || 0;

  const isZeptoCheaper = hasBoth && zeptoPrice <= blinkitPrice;
  const isBlinkitCheaper = hasBoth && blinkitPrice < zeptoPrice;

  return (
    <View style={styles.card}>
      {/* Product Header */}
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.product_name}
          </Text>
          {product.brand ? (
            <Text style={styles.brandText}>{product.brand}</Text>
          ) : null}
          {product.quantity ? (
            <Text style={styles.quantityText}>{product.quantity}</Text>
          ) : null}
        </View>
        {hasBoth && product.price_diff > 0 && (
          <View style={styles.savingsBadge}>
            <Feather name="trending-down" size={10} color="#000" />
            <Text style={styles.savingsText}>Save ₹{product.price_diff}</Text>
          </View>
        )}
      </View>

      {/* Price Comparison Row */}
      <View style={styles.comparisonRow}>
        {/* Zepto Column */}
        <TouchableOpacity
          style={[
            styles.platformCol,
            hasZepto && isZeptoCheaper && styles.winnerCol,
            !hasZepto && styles.unavailableCol,
          ]}
          activeOpacity={hasZepto ? 0.7 : 1}
          onPress={() => hasZepto && onPlatformPress('zepto', product.product_name)}
        >
          <View style={styles.platformHeader}>
            <View style={[styles.platformDot, { backgroundColor: COLORS.zepto }]} />
            <Text style={styles.platformLabel}>Zepto</Text>
            {isZeptoCheaper && (
              <View style={styles.bestPill}>
                <Text style={styles.bestPillText}>BEST</Text>
              </View>
            )}
          </View>

          {hasZepto ? (
            <>
              <Text style={[styles.priceText, isZeptoCheaper && styles.winnerPrice]}>
                ₹{product.zepto!.price}
              </Text>
              {product.zepto!.mrp > product.zepto!.price && (
                <Text style={styles.mrpText}>
                  MRP ₹{product.zepto!.mrp}
                </Text>
              )}
              <View style={styles.metaRow}>
                <Feather name="zap" size={10} color={COLORS.cyan} />
                <Text style={styles.deliveryText}>
                  {product.zepto!.delivery_minutes} min
                </Text>
              </View>
              {product.zepto!.discount_pct > 0 && (
                <View style={[styles.discountPill, { backgroundColor: COLORS.zeptoBg }]}>
                  <Text style={[styles.discountText, { color: COLORS.zepto }]}>
                    {product.zepto!.discount_pct}% OFF
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.unavailableContent}>
              <Feather name="x-circle" size={16} color={COLORS.textTertiary} />
              <Text style={styles.unavailableText}>Not available</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Blinkit Column */}
        <TouchableOpacity
          style={[
            styles.platformCol,
            hasBlinkit && isBlinkitCheaper && styles.winnerCol,
            !hasBlinkit && styles.unavailableCol,
          ]}
          activeOpacity={hasBlinkit ? 0.7 : 1}
          onPress={() => hasBlinkit && onPlatformPress('blinkit', product.product_name)}
        >
          <View style={styles.platformHeader}>
            <View style={[styles.platformDot, { backgroundColor: COLORS.blinkit }]} />
            <Text style={styles.platformLabel}>Blinkit</Text>
            {isBlinkitCheaper && (
              <View style={[styles.bestPill, { backgroundColor: COLORS.blinkit }]}>
                <Text style={[styles.bestPillText, { color: '#000' }]}>BEST</Text>
              </View>
            )}
          </View>

          {hasBlinkit ? (
            <>
              <Text style={[styles.priceText, isBlinkitCheaper && styles.winnerPriceBlinkit]}>
                ₹{product.blinkit!.price}
              </Text>
              {product.blinkit!.mrp > product.blinkit!.price && (
                <Text style={styles.mrpText}>
                  MRP ₹{product.blinkit!.mrp}
                </Text>
              )}
              <View style={styles.metaRow}>
                <Feather name="zap" size={10} color={COLORS.cyan} />
                <Text style={styles.deliveryText}>
                  {product.blinkit!.delivery_minutes} min
                </Text>
              </View>
              {product.blinkit!.discount_pct > 0 && (
                <View style={[styles.discountPill, { backgroundColor: COLORS.blinkitBg }]}>
                  <Text style={[styles.discountText, { color: COLORS.blinkit }]}>
                    {product.blinkit!.discount_pct}% OFF
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.unavailableContent}>
              <Feather name="x-circle" size={16} color={COLORS.textTertiary} />
              <Text style={styles.unavailableText}>Not available</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Match indicator */}
      {hasBoth && product.match_score >= 80 && (
        <View style={styles.matchRow}>
          <Feather name="check-circle" size={11} color={COLORS.success} />
          <Text style={styles.matchText}>Exact match across platforms</Text>
        </View>
      )}
      {hasBoth && product.match_score < 80 && product.match_score >= 55 && (
        <View style={styles.matchRow}>
          <Feather name="info" size={11} color={COLORS.warning} />
          <Text style={styles.matchTextWarn}>Similar product match</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  brandText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quantityText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  platformCol: {
    flex: 1,
    backgroundColor: COLORS.bgCardHighlight,
    borderRadius: 10,
    padding: 12,
  },
  winnerCol: {
    borderWidth: 1.5,
    borderColor: COLORS.zepto,
  },
  unavailableCol: {
    opacity: 0.5,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  platformLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    flex: 1,
  },
  bestPill: {
    backgroundColor: COLORS.zepto,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  bestPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  winnerPrice: {
    color: COLORS.zepto,
  },
  winnerPriceBlinkit: {
    color: COLORS.blinkit,
  },
  mrpText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  deliveryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.cyan,
  },
  discountPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  unavailableContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  unavailableText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  divider: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  matchText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  matchTextWarn: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '500',
  },
});
