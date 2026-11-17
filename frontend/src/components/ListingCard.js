import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadows } from '../utils/theme';

const CATEGORY_COLORS = {
  Textbooks: { bg: '#EEF2FF', text: '#4F46E5' },
  Electronics: { bg: '#E0F2FE', text: '#0284C7' },
  Furniture: { bg: '#FEF3C7', text: '#D97706' },
  Clothing: { bg: '#FCE7F3', text: '#DB2777' },
  Other: { bg: '#F1F5F9', text: '#475569' },
};

const ListingCard = ({ listing, currentUserId }) => {
  const navigation = useNavigation();

  // Compare as strings — seller may be populated { _id, username } or raw ObjectId string
  const sellerId = listing.seller?._id?.toString() || listing.seller?.toString();
  const isOwnListing = !!(currentUserId && sellerId && currentUserId === sellerId);
  const sellerName = listing.seller?.username || '';

  const handlePress = () => {
    navigation.navigate('ListingDetail', { listingId: listing._id });
  };

  const formatPrice = (price) => {
    return `$${Number(price).toFixed(2)}`;
  };

  const categoryStyle = CATEGORY_COLORS[listing.category] || CATEGORY_COLORS.Other;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
      activeOpacity={0.88}
    >
      <View style={styles.cardHeader}>
        {/* Category Pill */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
          <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
            {listing.category}
          </Text>
        </View>

        {/* Ownership or Sold Badge */}
        {listing.isSold ? (
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>SOLD</Text>
          </View>
        ) : isOwnListing ? (
          <View style={styles.ownBadge}>
            <Text style={styles.ownBadgeText}>My Listing</Text>
          </View>
        ) : null}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {listing.title}
      </Text>

      {/* Description Snippet */}
      {listing.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {listing.description}
        </Text>
      ) : null}

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.priceLabel}>PRICE</Text>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
        </View>

        {/* Seller Info */}
        <View style={styles.sellerWrapper}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {isOwnListing ? '★' : (sellerName ? sellerName.charAt(0).toUpperCase() : 'U')}
            </Text>
          </View>
          <Text style={styles.sellerName} numberOfLines={1}>
            {isOwnListing ? 'You' : (sellerName || 'Student')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
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
  ownBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  soldBadgeText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
  sellerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    maxWidth: 110,
  },
});

export default ListingCard;
