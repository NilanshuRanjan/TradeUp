import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../screens/LoginScreen';
import * as api from '../services/api';

jest.mock('../services/api');
jest.mock('@react-native-async-storage/async-storage');

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

describe('Frontend Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should complete login flow', async () => {
    api.login.mockResolvedValueOnce({
      success: true,
      data: {
        accessToken: 'test-token',
        user: { username: 'testuser' }
      }
    });

    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Username or Email'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('userToken', 'test-token');
    });
  });
});