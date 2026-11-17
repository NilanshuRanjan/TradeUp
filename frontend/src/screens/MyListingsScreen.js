import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../services/api';
import { colors, radius, shadows } from '../utils/theme';

const CATEGORY_COLORS = {
  Textbooks: { bg: '#EEF2FF', text: '#4F46E5' },
  Electronics: { bg: '#E0F2FE', text: '#0284C7' },
  Furniture: { bg: '#FEF3C7', text: '#D97706' },
  Clothing: { bg: '#FCE7F3', text: '#DB2777' },
  Other: { bg: '#F1F5F9', text: '#475569' },
};

const MyListingsScreen = ({ navigation }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyListings = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      
      const response = await apiClient.listings.getMy();
      
      if (response.data.success) {
        setListings(response.data.data || []);
      } else {
        Alert.alert('Error', 'Failed to load your listings');
      }
    } catch (error) {
      console.error('Error fetching my listings:', error);
      Alert.alert(
        'Connection Error', 
        error.isNetworkError 
          ? 'Cannot connect to server. Please check your network connection.' 
          : 'Failed to load your listings. Please try again.'
      );
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyListings(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyListings();
    }, [])
  );

  const handleMarkAsSold = async (listingId) => {
    Alert.alert(
      'Mark as Sold',
      'Are you sure you want to mark this item as sold? Buyers will see it as unavailable.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark as Sold',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.listings.markAsSold(listingId);
              
              if (response.data.success) {
                setListings(prevListings => 
                  prevListings.map(listing => 
                    listing._id === listingId 
                      ? { ...listing, isSold: true }
                      : listing
                  )
                );
                Alert.alert('Updated! 🏷️', 'Listing marked as sold.');
              } else {
                Alert.alert('Error', response.data.error || 'Failed to mark listing as sold');
              }
            } catch (error) {
              console.error('Error marking listing as sold:', error);
              Alert.alert('Error', 'Failed to mark listing as sold. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = listings.length;
    const sold = listings.filter(l => l.isSold).length;
    const active = total - sold;
    return { total, active, sold };
  }, [listings]);

  const renderStatsBar = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <Text style={[styles.statNumber, { color: colors.success }]}>{stats.active}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.sold}</Text>
        <Text style={styles.statLabel}>Sold</Text>
      </View>
    </View>
  );

  const renderListingItem = ({ item }) => {
    const categoryStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;

    return (
      <TouchableOpacity 
        style={styles.listingCard}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item._id })}
        activeOpacity={0.88}
      >
        <View style={styles.listingHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
            <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
              {item.category}
            </Text>
          </View>
          
          <View style={[
            styles.statusBadge,
            item.isSold ? styles.soldBadge : styles.activeBadge
          ]}>
            <Text style={[
              styles.statusText,
              item.isSold ? styles.soldText : styles.activeText
            ]}>
              {item.isSold ? 'SOLD' : 'ACTIVE'}
            </Text>
          </View>
        </View>

        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={styles.listingDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.listingFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>PRICE</Text>
            <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>
          </View>
          
          {!item.isSold ? (
            <TouchableOpacity
              style={styles.markSoldButton}
              onPress={() => handleMarkAsSold(item._id)}
              testID={`mark-sold-${item._id}`}
              activeOpacity={0.8}
            >
              <Text style={styles.markSoldButtonText}>Mark as Sold</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.soldNotice}>
              <Text style={styles.soldNoticeText}>Completed</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>🏷️</Text>
      </View>
      <Text style={styles.emptyTitle}>You have no listings yet</Text>
      <Text style={styles.emptySubtitle}>
        Turn your unused textbooks, gear, or dorm items into cash!
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateListing')}
        testID="create-first-listing-button"
        activeOpacity={0.85}
      >
        <Text style={styles.createButtonText}>+ Create Your First Listing</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.headerTitle}>My TradeUp Listings</Text>
          <Text style={styles.headerSubtitle}>Manage and track your campus items</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.inboxButton}
            onPress={() => navigation.navigate('SellerInbox')}
            activeOpacity={0.85}
          >
            <Text style={styles.inboxButtonText}>📬 Inbox</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.newListingButton}
            onPress={() => navigation.navigate('CreateListing')}
            activeOpacity={0.85}
          >
            <Text style={styles.newListingButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>
      {listings.length > 0 && renderStatsBar()}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your listings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <FlatList
        data={listings}
        renderItem={renderListingItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        testID="my-listings-flatlist"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 10,
    ...shadows.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newListingButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  newListingButtonText: {
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  listingCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  activeBadge: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  soldBadge: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeText: {
    color: colors.success,
  },
  soldText: {
    color: colors.danger,
  },
  listingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 22,
  },
  listingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
  },
  markSoldButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  markSoldButtonText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  soldNotice: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  soldNoticeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
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
    marginBottom: 20,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  createButtonText: {
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default MyListingsScreen;
