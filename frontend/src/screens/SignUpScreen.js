import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FormInput from '../components/FormInput';
import apiClient from '../services/api';
import { 
  validateUsername, 
  validateEmailField, 
  validatePassword,
  sanitizeFormData,
} from '../utils/validation';
import { colors, radius, shadows } from '../utils/theme';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    const usernameError = validateUsername(formData.username.trim());
    if (usernameError) {
      newErrors.username = usernameError;
    }

    const emailError = validateEmailField(formData.email.trim());
    if (emailError) {
      newErrors.email = emailError;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    // Sanitize input — strip HTML tags only; don't trim on change
    const sanitizedValue = typeof value === 'string' ? value.replace(/<[^>]*>/g, '') : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
    
    // Real-time validation
    if (field === 'username') {
      const error = validateUsername(sanitizedValue.trim());
      setErrors(prev => ({ ...prev, username: error }));
    } else if (field === 'email') {
      const error = validateEmailField(sanitizedValue.trim());
      setErrors(prev => ({ ...prev, email: error }));
    } else if (field === 'password') {
      const error = validatePassword(sanitizedValue);
      setErrors(prev => ({ ...prev, password: error }));
      
      if (formData.confirmPassword && sanitizedValue === formData.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: null }));
      } else if (formData.confirmPassword && sanitizedValue !== formData.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      }
    } else if (field === 'confirmPassword') {
      if (formData.password && sanitizedValue === formData.password) {
        setErrors(prev => ({ ...prev, confirmPassword: null }));
      } else if (formData.password && sanitizedValue !== formData.password) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      }
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const sanitizedData = sanitizeFormData({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      const response = await apiClient.auth.register(sanitizedData);
      
      if (response.data.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        Alert.alert('Registration Failed', response.data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join students on campus buying and selling securely</Text>
        </View>

        <View style={styles.card}>
          <FormInput
            label="Username"
            value={formData.username}
            onChangeText={(value) => handleInputChange('username', value)}
            placeholder="Choose a username"
            autoCapitalize="none"
            error={errors.username}
            required
            testID="signup-username-input"
          />

          <FormInput
            label="Email Address"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="your.email@university.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            required
            testID="signup-email-input"
          />

          <FormInput
            label="Password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="At least 6 characters (letter & number)"
            secureTextEntry
            error={errors.password}
            required
            testID="signup-password-input"
          />

          <FormInput
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            placeholder="Re-enter your password"
            secureTextEntry
            error={errors.confirmPassword}
            required
            testID="signup-confirm-password-input"
          />

          <TouchableOpacity
            style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
            testID="signup-submit-button"
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textLight} size="small" />
            ) : (
              <Text style={styles.signUpButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToLogin} testID="navigate-login-button">
            <Text style={styles.linkText}>Sign In</Text>
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
    paddingVertical: 36,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    ...shadows.sm,
  },
  logoIcon: {
    fontSize: 28,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
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
    marginBottom: 20,
  },
  signUpButton: {
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
  signUpButtonText: {
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

export default SignUpScreen;
