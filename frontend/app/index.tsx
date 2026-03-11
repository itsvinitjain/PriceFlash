import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, CityItem, LocationResult } from '../utils/constants';
import { geocodeLocation, saveRecentSearch, searchLocations, getCities } from '../utils/api';

const SUGGESTIONS = ['Milk', 'Bread', 'Eggs', 'Butter', 'Rice'];

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [locationData, setLocationData] = useState({
    city: '',
    pincode: '400001',
    display: 'Detecting location...',
  });
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [popularCities, setPopularCities] = useState<CityItem[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    loadRecent();
    detectLocation();
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const cities = await getCities();
      setPopularCities(cities);
    } catch (_) {
      // Use defaults
      setPopularCities([
        { name: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        { name: 'New Delhi', state: 'Delhi', pincode: '110001' },
        { name: 'Bangalore', state: 'Karnataka', pincode: '560001' },
        { name: 'Hyderabad', state: 'Telangana', pincode: '500001' },
        { name: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
        { name: 'Pune', state: 'Maharashtra', pincode: '411001' },
      ]);
    }
  };

  const loadRecent = async () => {
    try {
      const stored = await AsyncStorage.getItem('pf_recent');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (_) {}
  };

  const addRecent = async (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    await AsyncStorage.setItem('pf_recent', JSON.stringify(updated));
  };

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationData({ city: 'Mumbai', pincode: '400001', display: 'Mumbai · Select location' });
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const data = await geocodeLocation(loc.coords.latitude, loc.coords.longitude);
      setLocationData(data);
    } catch (_) {
      setLocationData({ city: 'Mumbai', pincode: '400001', display: 'Mumbai · 400001' });
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleLocationSearch = useCallback(async (text: string) => {
    setLocationQuery(text);
    if (text.length < 2) {
      setLocationResults([]);
      return;
    }

    // Check if it's a pincode (6 digits)
    if (/^\d{3,6}$/.test(text)) {
      // Filter cities by pincode prefix
      const filtered = popularCities.filter(c => c.pincode.startsWith(text));
      setLocationResults(filtered.map(c => ({
        city: c.name,
        state: c.state,
        pincode: c.pincode,
        display: `${c.name}, ${c.state}`,
        lat: 0,
        lng: 0,
      })));
      return;
    }

    setSearchingLocation(true);
    try {
      const results = await searchLocations(text);
      setLocationResults(results);
    } catch (_) {
      // Fallback to local filtering
      const filtered = popularCities.filter(
        c => c.name.toLowerCase().includes(text.toLowerCase()) ||
             c.state.toLowerCase().includes(text.toLowerCase())
      );
      setLocationResults(filtered.map(c => ({
        city: c.name,
        state: c.state,
        pincode: c.pincode,
        display: `${c.name}, ${c.state}`,
        lat: 0,
        lng: 0,
      })));
    } finally {
      setSearchingLocation(false);
    }
  }, [popularCities]);

  const selectLocation = (loc: LocationResult | CityItem) => {
    const city = 'city' in loc ? loc.city || loc.name : (loc as any).name;
    const pincode = loc.pincode || '400001';
    const state = loc.state || '';
    setLocationData({
      city,
      pincode,
      display: `${city}${state ? ', ' + state : ''} · ${pincode}`,
    });
    setShowLocationPicker(false);
    setLocationQuery('');
    setLocationResults([]);
    Keyboard.dismiss();
  };

  const handleSearch = (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;
    addRecent(q);
    saveRecentSearch(q, locationData.pincode, locationData.city);
    Keyboard.dismiss();
    router.push({
      pathname: '/results',
      params: {
        query: q,
        pincode: locationData.pincode,
        location: locationData.city,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.logoText}>
              PRICE<Text style={styles.logoAccent}>FLASH</Text>
            </Text>
            <Text style={styles.subtitle}>
              Real-time price comparison · Zepto vs Blinkit
            </Text>
          </View>

          {/* Location Pill */}
          <TouchableOpacity
            testID="location-pill"
            style={styles.locationPill}
            onPress={() => setShowLocationPicker(!showLocationPicker)}
          >
            <Feather name="map-pin" size={14} color={COLORS.cyan} />
            {loadingLocation ? (
              <ActivityIndicator size="small" color={COLORS.cyan} />
            ) : (
              <Text style={styles.locationText} numberOfLines={1}>{locationData.display}</Text>
            )}
            <Feather
              name={showLocationPicker ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>

          {/* Location Picker Dropdown */}
          {showLocationPicker && (
            <View style={styles.locationDropdown}>
              <View style={styles.locationSearchBar}>
                <Feather name="search" size={16} color={COLORS.textTertiary} />
                <TextInput
                  testID="location-search-input"
                  style={styles.locationSearchInput}
                  value={locationQuery}
                  onChangeText={handleLocationSearch}
                  placeholder="Search city, area or pincode..."
                  placeholderTextColor={COLORS.textTertiary}
                  autoFocus
                />
                {searchingLocation && (
                  <ActivityIndicator size="small" color={COLORS.cyan} />
                )}
              </View>

              {/* GPS Detect Button */}
              <TouchableOpacity
                style={styles.gpsButton}
                onPress={() => {
                  setShowLocationPicker(false);
                  setLoadingLocation(true);
                  detectLocation();
                }}
              >
                <Feather name="navigation" size={14} color={COLORS.primary} />
                <Text style={styles.gpsText}>Use current location (GPS)</Text>
              </TouchableOpacity>

              {/* Search Results */}
              {locationResults.length > 0 ? (
                <View style={styles.locationList}>
                  {locationResults.map((loc, i) => (
                    <TouchableOpacity
                      key={`loc-${i}`}
                      style={styles.locationItem}
                      onPress={() => selectLocation(loc)}
                    >
                      <Feather name="map-pin" size={14} color={COLORS.textSecondary} />
                      <View style={styles.locationItemInfo}>
                        <Text style={styles.locationItemCity}>{loc.city}</Text>
                        <Text style={styles.locationItemState}>
                          {loc.state}{loc.pincode ? ` · ${loc.pincode}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : locationQuery.length === 0 ? (
                /* Popular Cities */
                <View style={styles.citiesGrid}>
                  <Text style={styles.citiesLabel}>POPULAR CITIES</Text>
                  <View style={styles.citiesRow}>
                    {popularCities.slice(0, 8).map((city, i) => (
                      <TouchableOpacity
                        key={`city-${i}`}
                        style={styles.cityChip}
                        onPress={() => selectLocation({
                          city: city.name,
                          state: city.state,
                          pincode: city.pincode,
                          display: `${city.name}, ${city.state}`,
                          lat: 0,
                          lng: 0,
                        })}
                      >
                        <Text style={styles.cityChipText}>{city.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color={COLORS.textTertiary} />
            <TextInput
              testID="search-input"
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search for any product..."
              placeholderTextColor={COLORS.textTertiary}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch()}
            />
            {query.length > 0 && (
              <TouchableOpacity
                testID="clear-search-btn"
                onPress={() => setQuery('')}
              >
                <Feather name="x" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Active Platforms */}
          <View style={styles.activePlatforms}>
            <View style={styles.platformBadge}>
              <View style={[styles.platformDotSmall, { backgroundColor: COLORS.zepto }]} />
              <Text style={styles.platformBadgeText}>Zepto</Text>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <View style={styles.platformBadge}>
              <View style={[styles.platformDotSmall, { backgroundColor: COLORS.blinkit }]} />
              <Text style={styles.platformBadgeText}>Blinkit</Text>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionLabel}>RECENT</Text>
              <View style={styles.chipsRow}>
                {recentSearches.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    testID={`recent-chip-${i}`}
                    style={styles.chip}
                    onPress={() => handleSearch(s)}
                  >
                    <Feather name="clock" size={12} color={COLORS.textTertiary} />
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quick Suggestions */}
          <View style={styles.suggestSection}>
            <Text style={styles.sectionLabel}>TRY SEARCHING</Text>
            <View style={styles.chipsRow}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  testID={`suggestion-chip-${i}`}
                  style={styles.suggestionChip}
                  onPress={() => handleSearch(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Inactive Platforms */}
          <View style={styles.inactiveSection}>
            <Text style={styles.sectionLabel}>COMING SOON</Text>
            <View style={styles.inactiveRow}>
              {['Swiggy Instamart', 'BigBasket', 'DMart', 'JioMart', 'Amazon Fresh', 'Flipkart Minutes'].map((name, i) => (
                <View key={i} style={styles.inactivePill}>
                  <Text style={styles.inactiveText}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoSection: {
    marginBottom: 28,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  logoAccent: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.cyanDim,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 16,
    maxWidth: '90%',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.cyan,
    flexShrink: 1,
  },
  locationDropdown: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 16,
  },
  locationSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gpsText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationList: {
    marginTop: 4,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationItemInfo: {
    flex: 1,
  },
  locationItemCity: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationItemState: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  citiesGrid: {
    marginTop: 10,
  },
  citiesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  citiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityChip: {
    backgroundColor: COLORS.bgCardHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  activePlatforms: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  platformDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  platformBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginLeft: 2,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: 0.5,
  },
  recentSection: {
    marginBottom: 24,
  },
  suggestSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  suggestionChip: {
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inactiveSection: {
    marginBottom: 24,
  },
  inactiveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  inactivePill: {
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    opacity: 0.4,
  },
  inactiveText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});
