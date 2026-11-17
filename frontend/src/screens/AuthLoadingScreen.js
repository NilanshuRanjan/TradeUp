import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../services/api';
import { colors, radius, shadows } from '../utils/theme';

const AuthLoadingScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  const checkAuthenticationStatus = async () => {
    try {
      // Check if user has a valid authentication token
      const isAuthenticated = await apiClient.auth.isAuthenticated();
      
      if (isAuthenticated) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>⚡</Text>
        </View>
        <Text style={styles.brandTitle}>TradeUp</Text>
        <Text style={styles.brandTagline}>Campus Student Marketplace</Text>
      </View>
      
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connecting securely...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 80,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    ...shadows.md,
  },
  logoIcon: {
    fontSize: 38,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  loadingWrapper: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

export default AuthLoadingScreen;
