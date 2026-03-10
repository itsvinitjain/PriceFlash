import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import PlatformCard from '../components/PlatformCard';
import SkeletonCard from '../components/SkeletonCard';
import { COLORS, PlatformResult } from '../utils/constants';
import { searchProducts } from '../utils/api';

type SortMode = 'price' | 'fastest' | 'offer';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query: string; pincode: string }>();
  const query = params.query || '';
  const pincode = params.pincode || '110001';

  const [allResults, setAllResults] = useState<PlatformResult[]>([]);
  const [visibleResults, setVisibleResults] = useState<PlatformResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [fetchTime, setFetchTime] = useState(0);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setError('');
    setVisibleResults([]);
    const startTime = Date.now();

    try {
      const data = await searchProducts(query, pincode);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setFetchTime(parseFloat(elapsed));
      setAllResults(data.results);

      // Progressive reveal
      data.results.forEach((result: PlatformResult, index: number) => {
        setTimeout(() => {
          setVisibleResults((prev) => [...prev, result]);
        }, index * 120);
      });

      setTimeout(() => setLoading(false), data.results.length * 120 + 100);
    } catch (e) {
      setError('Failed to fetch results. Try again.');
      setLoading(false);
    }
  };

  const getSortedResults = () => {
    const sorted = [...visibleResults];
    switch (sortMode) {
      case 'price':
        sorted.sort((a, b) => {
          if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
          return a.final_price - b.final_price;
        });
        break;
      case 'fastest':
        sorted.sort((a, b) => {
          if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
          return a.delivery_minutes - b.delivery_minutes;
        });
        break;
      case 'offer':
        sorted.sort((a, b) => {
          if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
          return (b.mrp - b.price) - (a.mrp - a.price);
        });
        break;
    }
    return sorted;
  };

  const handleCardPress = (result: PlatformResult) => {
    router.push({
      pathname: '/redirect',
      params: {
        platform: result.platform,
        platformId: result.platform_id,
        platformColor: result.platform_color,
        productName: result.product_name,
        finalPrice: String(result.final_price),
        mrp: String(result.mrp),
        deepLink: encodeURIComponent(result.deep_link),
        deliveryMinutes: String(result.delivery_minutes),
      },
    });
  };

  const sorted = getSortedResults();
  const inStockCount = allResults.filter((r) => r.in_stock).length;

  const renderSortPill = (mode: SortMode, label: string) => (
    <TouchableOpacity
      testID={`sort-${mode}`}
      style={[styles.sortPill, sortMode === mode && styles.sortPillActive]}
      onPress={() => setSortMode(mode)}
    >
      <Text
        style={[
          styles.sortPillText,
          sortMode === mode && styles.sortPillTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-btn"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.queryText} numberOfLines={1}>
            {query}
          </Text>
          <Text style={styles.metaText}>
            {loading
              ? 'Searching platforms...'
              : `${inStockCount} platforms · updated ${fetchTime}s ago`}
          </Text>
        </View>
      </View>

      {/* Sort Pills */}
      <View style={styles.sortRow}>
        {renderSortPill('price', 'Best Price')}
        {renderSortPill('fastest', 'Fastest')}
        {renderSortPill('offer', 'Best Offer')}
      </View>

      {/* Error State */}
      {error ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            testID="retry-btn"
            style={styles.retryBtn}
            onPress={fetchResults}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          testID="results-list"
          data={sorted}
          keyExtractor={(item) => item.platform_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <PlatformCard
              result={item}
              isBest={index === 0 && !loading}
              onPress={handleCardPress}
            />
          )}
          ListHeaderComponent={
            loading && sorted.length === 0 ? (
              <View>
                {[1, 2, 3, 4, 5].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            ) : null
          }
          ListFooterComponent={
            loading && sorted.length > 0 ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  Checking more platforms...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Feather name="search" size={48} color={COLORS.textTertiary} />
                <Text style={styles.emptyText}>No results found</Text>
                <TouchableOpacity
                  testID="retry-btn-empty"
                  style={styles.retryBtn}
                  onPress={fetchResults}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Few Results Warning */}
      {!loading && inStockCount > 0 && inStockCount < 3 && (
        <View style={styles.warningBar}>
          <Feather name="info" size={14} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Only {inStockCount} platform{inStockCount > 1 ? 's' : ''} available in your area
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  queryText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  sortPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortPillActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sortPillTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  warningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 184, 0, 0.15)',
  },
  warningText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
  },
});
