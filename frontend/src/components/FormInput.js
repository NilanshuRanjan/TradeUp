import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius, shadows } from '../utils/theme';

const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  required = false,
  testID,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        testID={testID}
        accessibilityLabel={label || placeholder}
        accessibilityHint={error ? `Error: ${error}` : undefined}
        {...props}
      />
      {error && (
        <Text 
          style={styles.errorText}
          testID={`${testID}-error`}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 7,
  },
  required: {
    color: colors.danger,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    minHeight: 50,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FAFAFF',
    ...shadows.sm,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 5,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default FormInput;
