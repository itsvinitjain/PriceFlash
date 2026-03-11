import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import ComparisonCard from '../components/ComparisonCard';
import ScrapeProgressBar from '../components/ScrapeProgressBar';
import { COLORS, ComparedProduct, CompareResponse, ProgressEvent } from '../utils/constants';
import { streamSearch } from '../utils/api';

type SortMode = 'price' | 'savings' | 'matched';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query: string; pincode: string; location: string }>();
  const query = params.query || '';
  const pincode = params.pincode || '400001';
  const location = params.location || '';

  const [results, setResults] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [progress, setProgress] = useState({ percent: 0, message: 'Initializing...' });

  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    startSearch();
    return () => {
      if (cancelRef.current) cancelRef.current();
    };
  }, []);

  const startSearch = () => {
    setLoading(true);
    setError('');
    setResults(null);
    setProgress({ percent: 0, message: 'Initializing...' });

    if (cancelRef.current) cancelRef.current();

    cancelRef.current = streamSearch(
      query,
      pincode,
      location,
      (event: ProgressEvent) => {
        setProgress({
          percent: event.percent || 0,
          message: event.message || '',
        });
      },
      (data: CompareResponse) => {
        setResults(data);
        setLoading(false);
      },
      (errMsg: string) => {
        setError(errMsg || 'Failed to fetch results. Try again.');
        setLoading(false);
      }
    );
  };

  const getSortedProducts = (): ComparedProduct[] => {
    if (!results?.products) return [];
    const sorted = [...results.products];
    switch (sortMode) {
      case 'price':
        sorted.sort((a, b) => {
          const aMin = Math.min(
            a.zepto?.price ?? 99999,
            a.blinkit?.price ?? 99999
          );
          const bMin = Math.min(
            b.zepto?.price ?? 99999,
            b.blinkit?.price ?? 99999
          );
          return aMin - bMin;
        });
        break;
      case 'savings':
        sorted.sort((a, b) => b.price_diff - a.price_diff);
        break;
      case 'matched':
        sorted.sort((a, b) => {
          const aBoth = a.zepto && a.blinkit ? 1 : 0;
          const bBoth = b.zepto && b.blinkit ? 1 : 0;
          if (aBoth !== bBoth) return bBoth - aBoth;
          return b.match_score - a.match_score;
        });
        break;
    }
    return sorted;
  };

  const handlePlatformPress = (platformId: string, productName: string) => {
    const encodedQuery = encodeURIComponent(productName);
    let url = '';
    if (platformId === 'zepto') {
      url = `https://www.zeptonow.com/search?query=${encodedQuery}`;
    } else if (platformId === 'blinkit') {
      url = `https://blinkit.com/s/?q=${encodedQuery}`;
    }
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const sorted = getSortedProducts();
  const matchedCount = results?.matched_count || 0;
  const totalProducts = results?.products?.length || 0;

  const renderSortPill = (mode: SortMode, label: string, icon: string) => (
    <TouchableOpacity
      testID={`sort-${mode}`}
      style={[styles.sortPill, sortMode === mode && styles.sortPillActive]}
      onPress={() => setSortMode(mode)}
    >
      <Feather
        name={icon as any}
        size={12}
        color={sortMode === mode ? COLORS.primary : COLORS.textSecondary}
      />
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
              ? `Scraping live prices · ${location || 'Detecting...'}`
              : `${totalProducts} products · ${matchedCount} matched · ${results?.scrape_time_seconds}s`}
          </Text>
        </View>
        {!loading && (
          <TouchableOpacity style={styles.refreshBtn} onPress={startSearch}>
            <Feather name="refresh-cw" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading State with Progress Bar */}
      {loading && (
        <ScrapeProgressBar
          percent={progress.percent}
          message={progress.message}
        />
      )}

      {/* Error State */}
      {error ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            testID="retry-btn"
            style={styles.retryBtn}
            onPress={startSearch}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !loading && results ? (
        <>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <View style={[styles.statDot, { backgroundColor: COLORS.zepto }]} />
              <Text style={styles.statText}>Zepto: {results.zepto_count}</Text>
            </View>
            <View style={styles.statPill}>
              <View style={[styles.statDot, { backgroundColor: COLORS.blinkit }]} />
              <Text style={styles.statText}>Blinkit: {results.blinkit_count}</Text>
            </View>
            <View style={styles.statPill}>
              <Feather name="git-merge" size={10} color={COLORS.success} />
              <Text style={styles.statText}>Matched: {matchedCount}</Text>
            </View>
          </View>

          {/* Sort Pills */}
          <View style={styles.sortRow}>
            {renderSortPill('price', 'Cheapest', 'dollar-sign')}
            {renderSortPill('savings', 'Most Savings', 'trending-down')}
            {renderSortPill('matched', 'Best Match', 'check-circle')}
          </View>

          {/* Results List */}
          <FlatList
            testID="results-list"
            data={sorted}
            keyExtractor={(item, index) => `${item.product_name}-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <ComparisonCard
                product={item}
                index={index}
                onPlatformPress={handlePlatformPress}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="search" size={48} color={COLORS.textTertiary} />
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term or location
                </Text>
              </View>
            }
            ListFooterComponent={
              results.inactive_platforms.length > 0 ? (
                <View style={styles.inactiveFooter}>
                  <Text style={styles.inactiveTitle}>Coming Soon</Text>
                  <View style={styles.inactiveRow}>
                    {results.inactive_platforms.map((p) => (
                      <View
                        key={p.id}
                        style={[styles.inactivePlatform, { borderColor: p.color + '33' }]}
                      >
                        <View style={[styles.inactiveDot, { backgroundColor: p.color }]} />
                        <Text style={styles.inactiveName}>{p.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null
            }
          />
        </>
      ) : null}
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
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
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
    fontSize: 12,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  inactiveFooter: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inactiveTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  inactiveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  inactivePlatform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    opacity: 0.4,
  },
  inactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inactiveName: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});
