import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ListingCard from '../components/ListingCard';
import apiClient from '../services/api';
import { colors, radius, shadows } from '../utils/theme';

const CATEGORIES = ['All', 'Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Other'];

const HomeScreen = ({ navigation }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fetch current user ID once on mount for ownership checks
  useEffect(() => {
    apiClient.tokenManager.getCurrentUserId().then(id => {
      if (id) setCurrentUserId(id);
    });
  }, []);

  const fetchListings = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      
      const response = await apiClient.listings.getAll();
      
      if (response.data.success) {
        setListings(response.data.data || []);
      } else {
        Alert.alert('Error', 'Failed to load listings');
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert(
        'Connection Error', 
        error.isNetworkError 
          ? 'Cannot connect to TradeUp server. Please check your network connection.' 
          : 'Failed to load listings. Please try again.'
      );
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [])
  );

  // BUG-02: Logout confirmation and execution
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of TradeUp?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await apiClient.auth.logout();
            navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
          },
        },
      ]
    );
  };

  // Filter listings by selected category
  const filteredListings = useMemo(() => {
    if (selectedCategory === 'All') return listings;
    return listings.filter(item => item.category === selectedCategory);
  }, [listings, selectedCategory]);

  const renderListingItem = ({ item }) => (
    <ListingCard listing={item} currentUserId={currentUserId} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>📦</Text>
      </View>
      <Text style={styles.emptyTitle}>
        {selectedCategory === 'All' 
          ? 'No active listings yet' 
          : `No ${selectedCategory} listings`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedCategory === 'All'
          ? 'Be the first student to post an item for sale!'
          : `Try selecting a different category or post the first ${selectedCategory} item!`}
      </Text>
      <TouchableOpacity 
        style={styles.emptyCreateButton}
        onPress={() => navigation.navigate('CreateListing')}
        activeOpacity={0.85}
      >
        <Text style={styles.emptyCreateButtonText}>+ Create Listing</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {/* Brand Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadgeSmall}>
            <Text style={styles.logoBadgeIcon}>⚡</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>TradeUp</Text>
            <Text style={styles.headerTagline}>Student Marketplace</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          testID="logout-button"
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Actions Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateListing')}
          activeOpacity={0.85}
        >
          <Text style={styles.createButtonText}>+ Sell Item</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.myListingsButton}
          onPress={() => navigation.navigate('MyListings')}
          activeOpacity={0.85}
        >
          <Text style={styles.myListingsButtonText}>My Listings</Text>
        </TouchableOpacity>
      </View>

      {/* Category Chips Bar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.categoryChipText,
                isSelected && styles.categoryChipTextSelected
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section Subheader */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'All' ? 'Recent Marketplace Items' : `${selectedCategory}`}
        </Text>
        <Text style={styles.listingCount}>
          {filteredListings.length} {filteredListings.length === 1 ? 'item' : 'items'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoBadgeSmall}>
          <Text style={styles.logoBadgeIcon}>⚡</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>Loading marketplace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredListings}
        renderItem={renderListingItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 10,
    fontWeight: '500',
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 8,
    ...shadows.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadgeSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  logoBadgeIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerTagline: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  createButton: {
    flex: 1.2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  createButtonText: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
  myListingsButton: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myListingsButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.textLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listingCount: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCreateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  emptyCreateButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default HomeScreen;
