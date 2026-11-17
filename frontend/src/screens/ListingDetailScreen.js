import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import apiClient from '../services/api';
import { colors, radius, shadows } from '../utils/theme';

const CATEGORY_COLORS = {
  Textbooks: { bg: '#EEF2FF', text: '#4F46E5' },
  Electronics: { bg: '#E0F2FE', text: '#0284C7' },
  Furniture: { bg: '#FEF3C7', text: '#D97706' },
  Clothing: { bg: '#FCE7F3', text: '#DB2777' },
  Other: { bg: '#F1F5F9', text: '#475569' },
};

const ListingDetailScreen = ({ route, navigation }) => {
  const { listingId } = route.params;
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchListingDetails();
    apiClient.tokenManager.getCurrentUserId().then(id => {
      if (id) setCurrentUserId(id);
    });
  }, [listingId]);

  const fetchListingDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listings.getById(listingId);
      
      if (response.data.success) {
        setListing(response.data.data);
      } else {
        Alert.alert('Error', 'Failed to load listing details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching listing details:', error);
      Alert.alert(
        'Error', 
        error.isNetworkError 
          ? 'Network error. Please check your connection.' 
          : 'Failed to load listing details. Please try again.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImInterested = async () => {
    if (!listing) return;

    const sellerIdStr = (listing.seller?._id || listing.seller)?.toString();

    // Quick ownership check using cached state (best-effort).
    // The backend also validates this, so this is just a UX guard.
    if (currentUserId && sellerIdStr && currentUserId === sellerIdStr) {
      Alert.alert('Notice', 'This is your own listing.');
      return;
    }

    try {
      setSendingMessage(true);

      const messageData = {
        listingId: listing._id,
        receiverId: sellerIdStr,
        content: `Hi! I'm interested in your listing: ${listing.title}`,
      };

      // Let the Axios request interceptor handle token refresh automatically.
      // We do NOT pre-check the user ID — that was the source of the false
      // "please login again" errors when the access token was momentarily
      // in its 30-second pre-expiry buffer.
      const response = await apiClient.messages.send(messageData);

      if (response.data.success) {
        const sentMessage = response.data.data;

        // Use the conversationId that the backend actually generated so it
        // always matches the server's format.
        const serverConversationId = sentMessage.conversationId;

        // If we didn't have the userId yet, grab it now from the sent message
        // so the ownership badge renders correctly.
        if (!currentUserId && sentMessage.sender) {
          const senderId = (sentMessage.sender?._id || sentMessage.sender)?.toString();
          if (senderId) setCurrentUserId(senderId);
        }

        navigation.navigate('Chat', {
          conversationId: serverConversationId,
          listingTitle: listing.title,
          otherUserId: sellerIdStr,
        });
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending interest message:', error);

      if (error.isAuthError) {
        // The global auth-error handler (App.js) has already been notified
        // by the response interceptor; just show a friendly message.
        Alert.alert('Session Expired', 'Please log in again to continue.');
      } else {
        Alert.alert(
          'Message Error',
          error.isNetworkError
            ? 'Network error. Please check your connection.'
            : 'Failed to send message. Please try again.'
        );
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const formatPrice = (price) => {
    return `$${Number(price).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Listing not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sellerIdStr = (listing.seller?._id || listing.seller)?.toString();
  const isOwnListing = !!(currentUserId && sellerIdStr && currentUserId === sellerIdStr);
  const sellerName = listing.seller?.username || 'Student Seller';
  const categoryStyle = CATEGORY_COLORS[listing.category] || CATEGORY_COLORS.Other;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.topRow}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
              <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
                {listing.category}
              </Text>
            </View>

            {listing.isSold ? (
              <View style={styles.soldBadge}>
                <Text style={styles.soldBadgeText}>SOLD</Text>
              </View>
            ) : isOwnListing ? (
              <View style={styles.ownBadge}>
                <Text style={styles.ownBadgeText}>YOUR LISTING</Text>
              </View>
            ) : (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>AVAILABLE</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{listing.title}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>ASKING PRICE</Text>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          </View>
        </View>

        {/* Seller Info Card */}
        <View style={styles.sellerCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {sellerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerRole}>
              {isOwnListing ? 'Listed by You' : 'Seller Profile'}
            </Text>
            <Text style={styles.sellerUsername}>{sellerName}</Text>
            <Text style={styles.verifiedTag}>✓ Verified Campus Student</Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Item Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date Posted</Text>
          <Text style={styles.metaValue}>{formatDate(listing.createdAt)}</Text>
        </View>

      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {listing.isSold ? (
          <View style={styles.soldBanner}>
            <Text style={styles.soldBannerText}>This item has been marked as sold</Text>
          </View>
        ) : isOwnListing ? (
          <View style={styles.ownerActions}>
            <View style={styles.ownBanner}>
              <Text style={styles.ownBannerText}>You are the owner of this listing</Text>
            </View>
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={() => navigation.navigate('MyListings')}
              activeOpacity={0.85}
            >
              <Text style={styles.manageButtonText}>Manage in My Listings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.chatButton, sendingMessage && styles.buttonDisabled]}
            onPress={handleImInterested}
            disabled={sendingMessage}
            activeOpacity={0.85}
          >
            {sendingMessage ? (
              <ActivityIndicator size="small" color={colors.textLight} />
            ) : (
              <Text style={styles.chatButtonText}>💬 Chat with Seller</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 110,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 20,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  backButtonText: {
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 15,
  },
  heroCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  ownBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  ownBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  soldBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  soldBadgeText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: 16,
  },
  priceContainer: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  price: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.success,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...shadows.sm,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  avatarLargeText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerRole: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sellerUsername: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  verifiedTag: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 23,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  chatButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  chatButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  soldBanner: {
    backgroundColor: colors.dangerLight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  soldBannerText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  ownerActions: {
    gap: 8,
  },
  ownBanner: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  ownBannerText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  manageButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  manageButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ListingDetailScreen;
