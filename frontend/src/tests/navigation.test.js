import React from 'react';
import { render } from '@testing-library/react-native';
import fc from 'fast-check';

// Import all screen components to verify they exist and can be imported
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import ChatScreen from '../screens/ChatScreen';

// Mock the API client for testing
jest.mock('../services/api', () => ({
  auth: {
    isAuthenticated: jest.fn(),
  },
}));

// Mock navigation
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

import apiClient from '../services/api';

describe('Navigation Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('all screen components render without crashing', () => {
    // Test that all screen components can be rendered
    expect(() => render(<AuthLoadingScreen />)).not.toThrow();
    expect(() => render(<LoginScreen />)).not.toThrow();
    expect(() => render(<SignUpScreen />)).not.toThrow();
    expect(() => render(<HomeScreen />)).not.toThrow();
    expect(() => render(<ListingDetailScreen />)).not.toThrow();
    expect(() => render(<CreateListingScreen />)).not.toThrow();
    expect(() => render(<MyListingsScreen />)).not.toThrow();
    expect(() => render(<ChatScreen />)).not.toThrow();
  });

  it('screen components display expected content', () => {
    const { getByText: getAuthText } = render(<AuthLoadingScreen />);
    expect(getAuthText('Loading...')).toBeTruthy();

    const { getByText: getLoginText } = render(<LoginScreen />);
    expect(getLoginText('Welcome Back')).toBeTruthy();

    const { getByText: getSignUpText } = render(<SignUpScreen />);
    expect(getSignUpText('Join Campus Connect')).toBeTruthy();

    const { getByText: getHomeText } = render(<HomeScreen />);
    expect(getHomeText('Home Screen')).toBeTruthy();

    const { getByText: getDetailText } = render(<ListingDetailScreen />);
    expect(getDetailText('Listing Detail Screen')).toBeTruthy();

    const { getByText: getCreateText } = render(<CreateListingScreen />);
    expect(getCreateText('Create Listing Screen')).toBeTruthy();

    const { getByText: getMyListingsText } = render(<MyListingsScreen />);
    expect(getMyListingsText('My Listings Screen')).toBeTruthy();

    const { getByText: getChatText } = render(<ChatScreen />);
    expect(getChatText('Chat Screen')).toBeTruthy();
  });

  // **Feature: campus-connect-marketplace, Property 22: Authentication State Navigation**
  // **Validates: Requirements 6.2**
  describe('Property 22: Authentication State Navigation', () => {
    it('should navigate to appropriate stack based on authentication state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (isAuthenticated) => {
            // Setup mock return value
            apiClient.auth.isAuthenticated.mockResolvedValue(isAuthenticated);
            
            // Render the AuthLoadingScreen
            render(<AuthLoadingScreen />);
            
            // Wait for the effect to complete
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Verify navigation was called with correct parameters
            expect(mockReset).toHaveBeenCalledWith({
              index: 0,
              routes: [{ name: isAuthenticated ? 'Main' : 'Auth' }],
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should navigate to Auth stack on authentication error', async () => {
      // Mock authentication check to throw an error
      apiClient.auth.isAuthenticated.mockRejectedValue(new Error('Auth check failed'));
      
      // Render the AuthLoadingScreen
      render(<AuthLoadingScreen />);
      
      // Wait for the effect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify navigation defaults to Auth stack on error
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    });
  });
});