// Frontend validation utilities

// Sanitize string input to prevent XSS (strips HTML tags only — does NOT trim
// whitespace so that in-progress typing with spaces is preserved).
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Remove HTML tags only; preserve spaces so typing works naturally.
  return str.replace(/<[^>]*>/g, '');
};

// Sanitize for final submission — strips HTML AND leading/trailing whitespace.
export const sanitizeStringForSubmit = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Username validation
export const validateUsername = (username) => {
  if (!username || username.length < 3 || username.length > 30) {
    return 'Username must be between 3 and 30 characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
};

// Password validation
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  if (password.length > 128) {
    return 'Password is too long (maximum 128 characters)';
  }
  if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
};

// Email validation with error message
export const validateEmailField = (email) => {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  if (email.length > 254) {
    return 'Email address is too long';
  }
  return null;
};

// Listing title validation
export const validateListingTitle = (title) => {
  if (!title || !title.trim()) {
    return 'Title is required';
  }
  if (title.length > 100) {
    return 'Title must be 100 characters or less';
  }
  return null;
};

// Listing description validation
export const validateListingDescription = (description) => {
  if (!description || !description.trim()) {
    return 'Description is required';
  }
  if (description.length > 500) {
    return 'Description must be 500 characters or less';
  }
  return null;
};

// Price validation
export const validatePrice = (price) => {
  if (!price || price.trim() === '') {
    return 'Price is required';
  }
  const priceNum = parseFloat(price);
  if (isNaN(priceNum)) {
    return 'Price must be a valid number';
  }
  if (priceNum < 0) {
    return 'Price cannot be negative';
  }
  if (priceNum > 999999.99) {
    return 'Price cannot exceed $999,999.99';
  }
  return null;
};

// Category validation
export const validateCategory = (category) => {
  const validCategories = ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other'];
  if (!category) {
    return 'Category is required';
  }
  if (!validCategories.includes(category)) {
    return 'Please select a valid category';
  }
  return null;
};

// Message content validation
export const validateMessageContent = (content) => {
  if (!content || !content.trim()) {
    return 'Message cannot be empty';
  }
  if (content.length > 1000) {
    return 'Message is too long (maximum 1000 characters)';
  }
  return null;
};

// Real-time validation helper
export const createRealTimeValidator = (validationFn) => {
  return (value, setError) => {
    const error = validationFn(value);
    setError(error);
    return !error;
  };
};

// Form validation helper
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;

  Object.keys(validationRules).forEach(field => {
    const value = formData[field];
    const validationFn = validationRules[field];
    const error = validationFn(value);
    
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  });

  return { isValid, errors };
};

// Sanitize form data
export const sanitizeFormData = (formData) => {
  const sanitized = {};
  
  Object.keys(formData).forEach(key => {
    const value = formData[key];
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
};