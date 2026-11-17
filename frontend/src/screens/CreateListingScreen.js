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
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import FormInput from '../components/FormInput';
import apiClient from '../services/api';
import { 
  validateListingTitle, 
  validateListingDescription, 
  validatePrice, 
  validateCategory,
  sanitizeFormData
} from '../utils/validation';
import { colors, radius, shadows } from '../utils/theme';

const CATEGORIES = [
  { label: 'Select a category...', value: '' },
  { label: '📚 Textbooks', value: 'Textbooks' },
  { label: '💻 Electronics', value: 'Electronics' },
  { label: '🪑 Furniture', value: 'Furniture' },
  { label: '👕 Clothing', value: 'Clothing' },
  { label: '📦 Other', value: 'Other' },
];

const CreateListingScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    const titleError = validateListingTitle(formData.title.trim());
    if (titleError) {
      newErrors.title = titleError;
    }

    const descriptionError = validateListingDescription(formData.description.trim());
    if (descriptionError) {
      newErrors.description = descriptionError;
    }

    const priceError = validatePrice(formData.price.trim());
    if (priceError) {
      newErrors.price = priceError;
    }

    const categoryError = validateCategory(formData.category);
    if (categoryError) {
      newErrors.category = categoryError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    // Sanitize input — strip HTML tags only; don't trim mid-typing
    const sanitizedValue = typeof value === 'string' ? value.replace(/<[^>]*>/g, '') : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
    
    // Real-time validation
    if (field === 'title') {
      const error = validateListingTitle(sanitizedValue.trim());
      setErrors(prev => ({ ...prev, title: error }));
    } else if (field === 'description') {
      const error = validateListingDescription(sanitizedValue.trim());
      setErrors(prev => ({ ...prev, description: error }));
    } else if (field === 'price') {
      const error = validatePrice(sanitizedValue.trim());
      setErrors(prev => ({ ...prev, price: error }));
    } else if (field === 'category') {
      const error = validateCategory(sanitizedValue);
      setErrors(prev => ({ ...prev, category: error }));
    }
  };

  const handleCreateListing = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const sanitizedData = sanitizeFormData({
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
      });

      const response = await apiClient.listings.create(sanitizedData);
      
      if (response.data.success) {
        Alert.alert(
          'Listing Published! 🎉', 
          'Your item is now live on the TradeUp marketplace.',
          [
            {
              text: 'View Marketplace',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', response.data.error || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Create listing error:', error);
      const errorMessage = error.message || 'Failed to create listing. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
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
        <View style={styles.header}>
          <Text style={styles.title}>List an Item</Text>
          <Text style={styles.subtitle}>Sell to fellow students on TradeUp</Text>
        </View>

        <View style={styles.card}>
          <FormInput
            label="Listing Title"
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            placeholder="e.g. Calculus 8th Edition, Desk Lamp"
            error={errors.title}
            required
            testID="create-listing-title-input"
            maxLength={100}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <View style={[
              styles.pickerWrapper,
              errors.category && styles.pickerError
            ]}>
              <Picker
                selectedValue={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
                style={styles.picker}
                testID="create-listing-category-picker"
              >
                {CATEGORIES.map((category) => (
                  <Picker.Item
                    key={category.value}
                    label={category.label}
                    value={category.value}
                    color={category.value === '' ? colors.textMuted : colors.textPrimary}
                  />
                ))}
              </Picker>
            </View>
            {errors.category && (
              <Text style={styles.errorText} testID="create-listing-category-error">
                {errors.category}
              </Text>
            )}
          </View>

          <FormInput
            label="Price ($ USD)"
            value={formData.price}
            onChangeText={(value) => handleInputChange('price', value)}
            placeholder="0.00"
            keyboardType="numeric"
            error={errors.price}
            required
            testID="create-listing-price-input"
          />

          <FormInput
            label="Detailed Description"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            placeholder="Describe the condition, edition, pick-up location, etc."
            error={errors.description}
            required
            testID="create-listing-description-input"
            multiline
            numberOfLines={4}
            maxLength={500}
            style={styles.textArea}
          />
          <Text style={styles.charCount}>
            {formData.description.length} / 500 characters
          </Text>

          <TouchableOpacity
            style={[styles.createButton, isLoading && styles.buttonDisabled]}
            onPress={handleCreateListing}
            disabled={isLoading}
            testID="create-listing-submit-button"
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textLight} size="small" />
            ) : (
              <Text style={styles.createButtonText}>Publish Listing</Text>
            )}
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
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    marginBottom: 24,
  },
  pickerContainer: {
    marginBottom: 18,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 7,
  },
  required: {
    color: colors.danger,
  },
  pickerWrapper: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pickerError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  picker: {
    height: 50,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 5,
    marginLeft: 4,
    fontWeight: '500',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  buttonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  createButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CreateListingScreen;
