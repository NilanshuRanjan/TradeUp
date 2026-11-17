import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FormInput from '../components/FormInput';
import apiClient from '../services/api';
import { colors, radius, shadows } from '../utils/theme';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.usernameOrEmail.trim()) {
      newErrors.usernameOrEmail = 'Username or email is required';
    }

    // On login we only check password presence; password complexity policy is enforced at registration
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    // Sanitize input — strip HTML tags only; do NOT trim mid-typing to avoid breaking spaces
    const sanitizedValue = typeof value === 'string' ? value.replace(/<[^>]*>/g, '') : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    try {
      // The backend reads req.body.username and queries { $or: [{ username }, { email: username }] }
      // Sending usernameOrEmail as 'username' supports both usernames and email logins flawlessly
      const credentials = {
        username: formData.usernameOrEmail.trim(),
        password: formData.password,
      };

      const response = await apiClient.auth.login(credentials);
      
      if (response.data.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        console.error('Login rejected:', response.data);
        Alert.alert(
          'Login Failed',
          "Credentials don't match. Please check your username/email and password."
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      const status = error.response?.status;
      const isNetworkOrServerError =
        error.isNetworkError ||
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT_ERROR' ||
        !error.response ||
        status >= 500 ||
        status === 408 ||
        status === 429;

      Alert.alert(
        'Login Failed',
        isNetworkOrServerError
          ? 'Unable to connect. Please try again later.'
          : "Credentials don't match. Please check your username/email and password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.appName}>TradeUp</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to browse campus deals and manage your listings</Text>
        </View>

        <View style={styles.card}>
          <FormInput
            label="Username or Email"
            value={formData.usernameOrEmail}
            onChangeText={(value) => handleInputChange('usernameOrEmail', value)}
            placeholder="e.g. alex or alex@university.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.usernameOrEmail}
            required
            testID="login-username-input"
          />

          <FormInput
            label="Password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
            required
            testID="login-password-input"
          />

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            testID="login-submit-button"
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textLight} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to TradeUp? </Text>
          <TouchableOpacity onPress={navigateToSignUp} testID="navigate-signup-button">
            <Text style={styles.linkText}>Create an Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    ...shadows.sm,
  },
  logoIcon: {
    fontSize: 30,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.sm,
  },
  buttonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  loginButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  linkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default LoginScreen;
