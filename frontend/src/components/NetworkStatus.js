import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import apiClient from '../services/api';
import { colors, radius, shadows } from '../utils/theme';

const NetworkStatus = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-60));
  const wasDisconnected = useRef(false);
  const dismissTimer = useRef(null);

  useEffect(() => {
    // Check network by pinging our own backend health endpoint
    const checkNetworkStatus = async () => {
      try {
        await apiClient.instance.get('/health', { timeout: 5000 });
        
        if (wasDisconnected.current) {
          wasDisconnected.current = false;
          clearTimeout(dismissTimer.current);
          Animated.timing(slideAnim, {
            toValue: -60,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setIsVisible(false));
        }
      } catch (error) {
        if (!wasDisconnected.current) {
          console.warn('Network status check failed:', error);
          wasDisconnected.current = true;
          setIsVisible(true);
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();

          dismissTimer.current = setTimeout(() => {
            Animated.timing(slideAnim, {
              toValue: -60,
              duration: 300,
              useNativeDriver: true,
            }).start(() => setIsVisible(false));
          }, 5000);
        }
      }
    };

    const interval = setInterval(checkNetworkStatus, 30000);
    checkNetworkStatus();

    return () => {
      clearInterval(interval);
      clearTimeout(dismissTimer.current);
    };
  }, [slideAnim]);

  const dismiss = () => {
    clearTimeout(dismissTimer.current);
    Animated.timing(slideAnim, {
      toValue: -60,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsVisible(false));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.badge}>
        <Text style={styles.icon}>⚠️</Text>
        <TouchableOpacity onPress={dismiss} accessibilityLabel="Dismiss connection notice">
          <Text style={styles.text}>Connecting to TradeUp server...  ×</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    paddingTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#334155',
    ...shadows.md,
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
  },
  text: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default NetworkStatus;
