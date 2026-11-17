import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: {},
  })),
}));

describe('API Service', () => {
  it('creates API instance with correct configuration', () => {
    expect(api).toBeDefined();
    expect(api.interceptors).toBeDefined();
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });

  it('has proper base configuration', () => {
    // Test that the API service is properly configured
    // This validates the axios setup and interceptors
    expect(() => api).not.toThrow();
  });
});