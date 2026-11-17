import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../services/api';
import { colors, radius, shadows } from '../utils/theme';

const CATEGORY_COLORS = {
  Textbooks:   { bg: '#EEF2FF', text: '#4F46E5' },
  Electronics: { bg: '#E0F2FE', text: '#0284C7' },
  Furniture:   { bg: '#FEF3C7', text: '#D97706' },
  Clothing:    { bg: '#FCE7F3', text: '#DB2777' },
  Other:       { bg: '#F1F5F9', text: '#475569' },
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const SellerInboxScreen = ({ navigation }) => {
  const [inbox, setInbox]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInbox = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await apiClient.messages.getInbox();
      if (response.data.success) {
        setInbox(response.data.data || []);
      } else {
        Alert.alert('Error', 'Failed to load inbox');
      }
    } catch (error) {
      console.error('Inbox fetch error:', error);
      Alert.alert(
        'Error',
        error.isNetworkError
          ? 'Network error. Please check your connection.'
          : 'Failed to load inbox. Please try again.'
      );
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInbox();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInbox(true);
  }, []);

  const openChat = (conv, listingTitle) => {
    navigation.navigate('Chat', {
      conversationId: conv.conversationId,
      listingTitle,
      otherUserId: conv.buyerId,
    });
  };

  /* ── Render helpers ── */

  const renderConversation = (conv, listingTitle) => (
    <TouchableOpacity
      key={conv.conversationId}
      style={styles.convRow}
      onPress={() => openChat(conv, listingTitle)}
      activeOpacity={0.82}
    >
      {/* Buyer avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(conv.buyerUsername || '?').charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.convInfo}>
        <View style={styles.convTopRow}>
          <Text style={styles.buyerName} numberOfLines={1}>
            {conv.buyerUsername}
          </Text>
          <Text style={styles.timeAgo}>{timeAgo(conv.latestMessageAt)}</Text>
        </View>
        <Text style={styles.latestMsg} numberOfLines={2}>
          {conv.latestMessage}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderListingGroup = ({ item }) => {
    const cat = CATEGORY_COLORS[item.listing.category] || CATEGORY_COLORS.Other;
    return (
      <View style={styles.listingGroup}>
        {/* Listing header */}
        <View style={styles.listingHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.listingTopRow}>
              <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                <Text style={[styles.catText, { color: cat.text }]}>
                  {item.listing.category}
                </Text>
              </View>
              {item.listing.isSold && (
                <View style={styles.soldBadge}>
                  <Text style={styles.soldBadgeText}>SOLD</Text>
                </View>
              )}
            </View>
            <Text style={styles.listingTitle} numberOfLines={2}>
              {item.listing.title}
            </Text>
            <Text style={styles.listingPrice}>
              ${Number(item.listing.price).toFixed(2)}
            </Text>
          </View>
          <View style={styles.msgCount}>
            <Text style={styles.msgCountNum}>{item.conversations.length}</Text>
            <Text style={styles.msgCountLabel}>
              {item.conversations.length === 1 ? 'buyer' : 'buyers'}
            </Text>
          </View>
        </View>

        {/* Buyer conversations */}
        <View style={styles.convList}>
          {item.conversations.map(conv =>
            renderConversation(conv, item.listing.title)
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyEmoji}>💬</Text>
      </View>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>
        When buyers message you about your listings, they'll appear here.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your inbox…</Text>
      </View>
    );
  }

  const totalConvs = inbox.reduce((s, g) => s + g.conversations.length, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Summary header */}
      {inbox.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {totalConvs} {totalConvs === 1 ? 'buyer' : 'buyers'} across{' '}
            {inbox.length} {inbox.length === 1 ? 'listing' : 'listings'}
          </Text>
        </View>
      )}

      <FlatList
        data={inbox}
        renderItem={renderListingGroup}
        keyExtractor={item => item.listing._id}
        ListEmptyComponent={renderEmpty}
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
  summaryBar: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
  },
  summaryText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 14,
    paddingBottom: 30,
  },
  listingGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
    ...shadows.sm,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  catText: {
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
    fontSize: 10,
    fontWeight: '800',
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  msgCount: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    minWidth: 52,
  },
  msgCountNum: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  msgCountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  convList: {
    paddingHorizontal: 0,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  convInfo: {
    flex: 1,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  timeAgo: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  latestMsg: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SellerInboxScreen;
