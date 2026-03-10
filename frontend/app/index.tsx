import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../utils/constants';
import { geocodeLocation, saveRecentSearch } from '../utils/api';

const SUGGESTIONS = ['Amul Butter', 'Maggi Noodles', 'Tata Salt', 'Coca-Cola', 'Surf Excel'];

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [locationData, setLocationData] = useState({
    city: '',
    pincode: '110001',
    display: 'Detecting location...',
  });
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showPinInput, setShowPinInput] = useState(false);
  const [manualPin, setManualPin] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    loadRecent();
    detectLocation();
  }, []);

  const loadRecent = async () => {
    try {
      const stored = await AsyncStorage.getItem('pf_recent');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (_) {}
  };

  const addRecent = async (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 3);
    setRecentSearches(updated);
    await AsyncStorage.setItem('pf_recent', JSON.stringify(updated));
  };

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationData({ city: '', pincode: '110001', display: 'Enter PIN code' });
        setShowPinInput(true);
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const data = await geocodeLocation(loc.coords.latitude, loc.coords.longitude);
      setLocationData(data);
    } catch (_) {
      setLocationData({ city: 'Delhi', pincode: '110001', display: 'Delhi · 110001' });
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSearch = (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;
    addRecent(q);
    saveRecentSearch(q, locationData.pincode);
    Keyboard.dismiss();
    router.push({
      pathname: '/results',
      params: { query: q, pincode: locationData.pincode },
    });
  };

  const handlePinSubmit = () => {
    if (manualPin.length === 6) {
      setLocationData({
        city: '',
        pincode: manualPin,
        display: `PIN ${manualPin}`,
      });
      setShowPinInput(false);
      Keyboard.dismiss();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => Keyboard.dismiss()}
          style={styles.flex}
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoSection}>
              <Text style={styles.logoText}>
                PRICE<Text style={styles.logoAccent}>FLASH</Text>
              </Text>
              <Text style={styles.subtitle}>
                Compare prices across 8 platforms
              </Text>
            </View>

            {/* Location Pill */}
            <TouchableOpacity
              testID="location-pill"
              style={styles.locationPill}
              onPress={() => setShowPinInput(!showPinInput)}
            >
              <Feather name="map-pin" size={14} color={COLORS.cyan} />
              {loadingLocation ? (
                <ActivityIndicator size="small" color={COLORS.cyan} />
              ) : (
                <Text style={styles.locationText}>{locationData.display}</Text>
              )}
              <Feather
                name={showPinInput ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>

            {/* Manual PIN Input */}
            {showPinInput && (
              <View style={styles.pinRow}>
                <TextInput
                  testID="pin-input"
                  style={styles.pinInput}
                  value={manualPin}
                  onChangeText={setManualPin}
                  placeholder="6-digit PIN code"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  onSubmitEditing={handlePinSubmit}
                />
                <TouchableOpacity
                  testID="pin-submit-btn"
                  style={[
                    styles.pinBtn,
                    manualPin.length === 6 && styles.pinBtnActive,
                  ]}
                  onPress={handlePinSubmit}
                >
                  <Feather
                    name="check"
                    size={16}
                    color={manualPin.length === 6 ? '#000' : COLORS.textTertiary}
                  />
                </TouchableOpacity>
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
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Blinkit · Zepto · Swiggy · BigBasket · DMart · JioMart · Amazon · Flipkart
            </Text>
          </View>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logoSection: {
    marginBottom: 32,
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
    marginBottom: 24,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.cyan,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    marginTop: -8,
  },
  pinInput: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    letterSpacing: 4,
  },
  pinBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinBtnActive: {
    backgroundColor: COLORS.primary,
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
    marginBottom: 28,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
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
  footer: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
