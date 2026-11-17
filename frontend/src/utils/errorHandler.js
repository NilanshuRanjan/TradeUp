import { Alert } from 'react-native';

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  VALIDATION: 'VALIDATION',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
};

// User-friendly error messages
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: 'Connection Problem',
    message: 'Please check your internet connection and try again.',
    retryable: true
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    title: 'Authentication Required',
    message: 'Please log in to continue.',
    retryable: false
  },
  [ERROR_TYPES.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    retryable: true
  },
  [ERROR_TYPES.SERVER]: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    retryable: true
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    retryable: true
  }
};

/**
 * Categorizes an error based on its properties
 * @param {Error} error - The error to categorize
 * @returns {string} - The error type
 */
export const categorizeError = (error) => {
  if (error.isNetworkError || error.code === 'NETWORK_ERROR') {
    return ERROR_TYPES.NETWORK;
  }
  
  if (error.isAuthError || error.statusCode === 401) {
    return ERROR_TYPES.AUTHENTICATION;
  }
  
  if (error.statusCode === 400 || error.statusCode === 422) {
    return ERROR_TYPES.VALIDATION;
  }
  
  if (error.statusCode >= 500) {
    return ERROR_TYPES.SERVER;
  }
  
  return ERROR_TYPES.UNKNOWN;
};

/**
 * Extracts a user-friendly error message from an error object
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  // If error has a custom message, use it
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }
  
  // If error has response data with error message
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  // If error has response data with message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Fallback to categorized error message
  const errorType = categorizeError(error);
  return ERROR_MESSAGES[errorType].message;
};

/**
 * Extracts validation errors from an error response
 * @param {Error} error - The error object
 * @returns {Object} - Object with field-specific error messages
 */
export const getValidationErrors = (error) => {
  if (error.response?.data?.details && typeof error.response.data.details === 'object') {
    return error.response.data.details;
  }
  
  return {};
};

/**
 * Shows an alert dialog for an error
 * @param {Error} error - The error to display
 * @param {Object} options - Options for customizing the alert
 */
export const showErrorAlert = (error, options = {}) => {
  const errorType = categorizeError(error);
  const errorConfig = ERROR_MESSAGES[errorType];
  
  const title = options.title || errorConfig.title;
  const message = options.message || getErrorMessage(error);
  
  const buttons = [
    {
      text: 'OK',
      onPress: options.onDismiss
    }
  ];
  
  if (errorConfig.retryable && options.onRetry) {
    buttons.unshift({
      text: 'Retry',
      onPress: options.onRetry
    });
  }
  
  Alert.alert(title, message, buttons);
};

/**
 * Handles API errors with appropriate user feedback
 * @param {Error} error - The error to handle
 * @param {Object} options - Options for error handling
 */
export const handleApiError = (error, options = {}) => {
  console.error('API Error:', error);
  
  const errorType = categorizeError(error);
  
  // Handle authentication errors specially
  if (errorType === ERROR_TYPES.AUTHENTICATION) {
    if (options.onAuthError) {
      options.onAuthError(error);
    } else {
      showErrorAlert(error, {
        title: 'Session Expired',
        message: 'Your session has expired. Please log in again.',
        onDismiss: options.onAuthRedirect
      });
    }
    return;
  }
  
  // Handle validation errors
  if (errorType === ERROR_TYPES.VALIDATION) {
    const validationErrors = getValidationErrors(error);
    if (options.onValidationError) {
      options.onValidationError(validationErrors);
      return;
    }
  }
  
  // Show generic error alert
  showErrorAlert(error, {
    title: options.title,
    message: options.message,
    onRetry: options.onRetry,
    onDismiss: options.onDismiss
  });
};

/**
 * Creates a retry mechanism for failed operations
 * @param {Function} operation - The operation to retry
 * @param {Object} options - Retry options
 */
export const createRetryHandler = (operation, options = {}) => {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;
  
  return async (...args) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation(...args);
      } catch (error) {
        lastError = error;
        
        // Don't retry authentication or validation errors
        const errorType = categorizeError(error);
        if (errorType === ERROR_TYPES.AUTHENTICATION || errorType === ERROR_TYPES.VALIDATION) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
    
    throw lastError;
  };
};

/**
 * Hook for handling errors in React components
 * @param {Object} options - Options for error handling
 */
export const useErrorHandler = (options = {}) => {
  const handleError = (error, errorOptions = {}) => {
    handleApiError(error, { ...options, ...errorOptions });
  };
  
  const handleValidationError = (error, setErrors) => {
    const validationErrors = getValidationErrors(error);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      handleError(error);
    }
  };
  
  return {
    handleError,
    handleValidationError,
    showErrorAlert: (error, alertOptions) => showErrorAlert(error, alertOptions)
  };
};

export default {
  categorizeError,
  getErrorMessage,
  getValidationErrors,
  showErrorAlert,
  handleApiError,
  createRetryHandler,
  useErrorHandler,
  ERROR_TYPES
};