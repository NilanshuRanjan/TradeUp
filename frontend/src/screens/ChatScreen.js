import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import apiClient from '../services/api';
import { validateMessageContent, sanitizeString, sanitizeStringForSubmit } from '../utils/validation';
import { colors, radius, shadows } from '../utils/theme';

const ChatScreen = ({ route, navigation }) => {
  const { conversationId, listingTitle, otherUserId } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (listingTitle) {
      navigation.setOptions({ 
        title: listingTitle,
      });
    }

    getCurrentUserId();
    fetchMessages();
  }, [conversationId, listingTitle]);

  const getCurrentUserId = async () => {
    try {
      const userId = await apiClient.tokenManager.getCurrentUserId();
      if (userId) {
        setCurrentUserId(userId.toString());
      } else {
        const parts = conversationId.split('_');
        if (parts.length === 3) {
          const [, userId1, userId2] = parts;
          const currentId = userId1 === otherUserId ? userId2 : userId1;
          setCurrentUserId(currentId?.toString());
        }
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
      const parts = conversationId.split('_');
      if (parts.length === 3) {
        const [, userId1, userId2] = parts;
        const currentId = userId1 === otherUserId ? userId2 : userId1;
        setCurrentUserId(currentId?.toString());
      }
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.messages.getConversation(conversationId);
      
      if (response.data.success) {
        setMessages(response.data.data || []);
        setTimeout(() => {
          scrollToBottom();
        }, 150);
      } else {
        Alert.alert('Error', 'Failed to load conversation');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert(
        'Chat Error',
        error.isNetworkError 
          ? 'Network error. Please check your connection.' 
          : 'Failed to load conversation history.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    // Only sanitize and trim on submit — not during typing
    const sanitizedMessage = sanitizeStringForSubmit(messageText);
    const validationError = validateMessageContent(sanitizedMessage);
    
    if (validationError) {
      Alert.alert('Invalid Message', validationError);
      return;
    }

    const tempMessage = {
      _id: Date.now().toString(),
      content: sanitizedMessage,
      sender: { _id: currentUserId, username: 'You' },
      receiver: { _id: otherUserId },
      createdAt: new Date().toISOString(),
      isTemporary: true
    };

    try {
      setSending(true);
      
      // Optimistically add to UI
      setMessages(prev => [...prev, tempMessage]);
      setMessageText('');
      scrollToBottom();

      const parts = conversationId.split('_');
      const [listingId] = parts;

      const messageData = {
        listingId,
        receiverId: otherUserId,
        content: sanitizedMessage
      };

      const response = await apiClient.messages.send(messageData);
      
      if (response.data.success) {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessage._id ? response.data.data : msg
          )
        );
      } else {
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        Alert.alert('Error', 'Failed to send message.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      Alert.alert(
        'Failed to Send',
        error.isNetworkError 
          ? 'Network connection lost. Please try again.' 
          : 'Unable to deliver message.'
      );
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const renderMessage = ({ item }) => {
    const senderId = (item.sender?._id || item.sender)?.toString();
    const isCurrentUser = !!(currentUserId && senderId && senderId === currentUserId.toString());
    const isTemporary = item.isTemporary;

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isTemporary && styles.temporaryMessage
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.timestamp,
            isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
          ]}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.chatIconBadge}>
        <Text style={styles.chatIconText}>💬</Text>
      </View>
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>Say hello and coordinate meeting place on campus!</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={messages.length === 0 ? styles.emptyListContainer : styles.messagesContainer}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={messageText}
          onChangeText={(text) => setMessageText(text)}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.textLight} />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  chatIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatIconText: {
    fontSize: 28,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    marginVertical: 4,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    ...shadows.sm,
  },
  currentUserBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  temporaryMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 3,
  },
  currentUserText: {
    color: colors.textLight,
  },
  otherUserText: {
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  currentUserTimestamp: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  otherUserTimestamp: {
    color: colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    ...shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendButtonText: {
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ChatScreen;
