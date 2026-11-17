
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRetryHandler } from '../utils/errorHandler';

// ---------------------------------------------------------------------------
// API CONFIGURATION
// ---------------------------------------------------------------------------

const API_BASE_URL = __DEV__
  ? 'http://10.203.192.118:3000/api'
  : 'https://your-production-server.com/api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const segments = token.split('.');

  if (segments.length < 2) {
    return null;
  }

  const base64Url = segments[1];
  const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  try {
    if (typeof globalThis.atob === 'function') {
      return JSON.parse(globalThis.atob(padded));
    }

    if (typeof globalThis.Buffer !== 'undefined') {
      return JSON.parse(globalThis.Buffer.from(padded, 'base64').toString('utf8'));
    }

    const lookup = {};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    for (let i = 0; i < alphabet.length; i += 1) {
      lookup[alphabet[i]] = i;
    }

    const bytes = [];

    for (let i = 0; i < padded.length; i += 4) {
      const chunk = padded.slice(i, i + 4);

      if (chunk.includes('=')) {
        const firstChar = chunk[0];
        const secondChar = chunk[1];
        const thirdChar = chunk[2];
        const fourthChar = chunk[3];

        if (firstChar && firstChar !== '=') {
          bytes.push((lookup[firstChar] << 2) | (lookup[secondChar] >> 4));
        }

        if (thirdChar && thirdChar !== '=' && secondChar && secondChar !== '=') {
          bytes.push(((lookup[secondChar] & 15) << 4) | (lookup[thirdChar] >> 2));
        }

        if (fourthChar && fourthChar !== '=' && thirdChar && thirdChar !== '=') {
          bytes.push(((lookup[thirdChar] & 3) << 6) | lookup[fourthChar]);
        }

        break;
      }

      const a = lookup[chunk[0]];
      const b = lookup[chunk[1]];
      const c = lookup[chunk[2]];
      const d = lookup[chunk[3]];

      bytes.push((a << 2) | (b >> 4));
      bytes.push(((b & 15) << 4) | (c >> 2));
      bytes.push(((c & 3) << 6) | d);
    }

    const text = typeof TextDecoder !== 'undefined'
      ? new TextDecoder().decode(Uint8Array.from(bytes))
      : String.fromCharCode(...bytes);

    return JSON.parse(text);
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
};

// ---------------------------------------------------------------------------
// AUTH ERROR HANDLER
// ---------------------------------------------------------------------------

let _onAuthError = null;

export const setAuthErrorHandler = (handler) => {
  _onAuthError = handler;
};

const notifyAuthError = () => {
  if (typeof _onAuthError === 'function') {
    _onAuthError();
  }
};

// ---------------------------------------------------------------------------
// AXIOS INSTANCE
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate Axios instance: refresh requests never pass through api interceptors.
const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// TOKEN MANAGER
// ---------------------------------------------------------------------------

let refreshPromise = null;

const tokenManager = {
  async setTokens(accessToken, refreshToken, expiresIn) {
    try {
      if (!accessToken || !refreshToken) {
        throw new Error('Access or refresh token is missing');
      }

      let expiryTime;

      if (typeof expiresIn === 'string') {
        const match = expiresIn.match(/^(\d+)([smhd])$/i);

        if (!match) {
          throw new Error('Invalid token expiry format');
        }

        const value = Number(match[1]);
        const unit = match[2].toLowerCase();

        const multipliers = {
          s: 1000,
          m: 60 * 1000,
          h: 60 * 60 * 1000,
          d: 24 * 60 * 60 * 1000,
        };

        expiryTime = Date.now() + value * multipliers[unit];
      } else {
        const payload = decodeJwtPayload(accessToken);

        if (!payload || !payload.exp) {
          throw new Error('Token expiration not found');
        }

        expiryTime = payload.exp * 1000;
      }

      await AsyncStorage.multiSet([
        [ACCESS_TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, refreshToken],
        [TOKEN_EXPIRY_KEY, expiryTime.toString()],
      ]);

      // Verify that tokens were persisted.
      const savedToken = await AsyncStorage.getItem(
        ACCESS_TOKEN_KEY
      );

      return savedToken === accessToken;
    } catch (error) {
      console.error('Error storing tokens:', error);
      return false;
    }
  },

  async getValidAccessToken() {
    try {
      const values = await AsyncStorage.multiGet([
        ACCESS_TOKEN_KEY,
        TOKEN_EXPIRY_KEY,
      ]);

      const accessToken = values[0][1];
      const expiryStr = values[1][1];

      if (!accessToken || !expiryStr) {
        return null;
      }

      const expiry = Number(expiryStr);

      if (!Number.isFinite(expiry)) {
        return null;
      }

      // Proactively refresh 2 minutes before expiry to avoid any clock-skew
      // or slow-network issues. With 2-hour tokens this is barely noticeable.
      if (Date.now() >= expiry - 120000) {
        return null;
      }

      return accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        TOKEN_EXPIRY_KEY,
      ]);

      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      return false;
    }
  },

  async refreshAccessToken() {
    // Reuse an ongoing refresh operation.
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();

        if (!refreshToken) {
          return null;
        }

        // Use separate Axios instance to avoid interceptor recursion.
        const response = await refreshApi.post('/auth/refresh', {
          refreshToken,
        });

        const data = response.data?.data;

        if (
          !response.data?.success ||
          !data?.accessToken ||
          !data?.refreshToken
        ) {
          throw new Error('Invalid refresh response');
        }

        const stored = await this.setTokens(
          data.accessToken,
          data.refreshToken,
          data.expiresIn
        );

        if (!stored) {
          throw new Error('Could not store refreshed tokens');
        }

        console.log('Access token refreshed successfully');

        return data.accessToken;
      } catch (error) {
        console.error(
          'Token refresh failed:',
          error.response?.data || error.message
        );

        // Only clear tokens when the refresh endpoint explicitly rejects the
        // token (401/403). Do NOT clear for network errors, timeouts, or
        // server errors (5xx) — those are transient and the user is still
        // authenticated with a valid refresh token.
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          await this.clearTokens();
          notifyAuthError();
        }

        throw error;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  async getCurrentUserId() {
    try {
      // First, try to get a still-valid access token.
      let token = await this.getValidAccessToken();

      // If expired (or within the 30-second buffer), attempt a silent refresh
      // before giving up. This mirrors what the Axios request interceptor does
      // so that getCurrentUserId() never returns null just because the access
      // token is about to rotate — the user is still authenticated.
      if (!token) {
        try {
          token = await this.refreshAccessToken();
        } catch (refreshError) {
          console.log('Token refresh failed in getCurrentUserId:', refreshError.message);
          return null;
        }
      }

      if (!token) {
        return null;
      }

      const payload = decodeJwtPayload(token);

      if (!payload) {
        return null;
      }

      return payload.userId || payload.id || payload.sub || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  },

  async isAuthenticated() {
    const accessToken = await this.getValidAccessToken();

    if (accessToken) {
      return true;
    }

    try {
      const newToken = await this.refreshAccessToken();
      return !!newToken;
    } catch (error) {
      return false;
    }
  },
};

// ---------------------------------------------------------------------------
// REQUEST INTERCEPTOR
// ---------------------------------------------------------------------------

api.interceptors.request.use(
  async (config) => {
    const url = config.url || '';

    const isPublicAuthRequest =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (isPublicAuthRequest || config.skipAuth) {
      return config;
    }

    try {
      let token = await tokenManager.getValidAccessToken();

      if (!token) {
        try {
          token = await tokenManager.refreshAccessToken();
        } catch (error) {
          console.log('No valid session available');
        }
      }

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Request authentication error:', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// RESPONSE INTERCEPTOR
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const url = originalRequest?.url || '';

    const isPublicAuthRequest =
      url.includes('/auth/login') ||
      url.includes('/auth/register');

    const isRefreshRequest = url.includes('/auth/refresh');

    // Never treat invalid login credentials as an expired session.
    if (isPublicAuthRequest || isRefreshRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      originalRequest
    ) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken =
            await tokenManager.refreshAccessToken();

          if (!newToken) {
            throw new Error('Unable to refresh session');
          }

          originalRequest.headers =
            originalRequest.headers || {};

          originalRequest.headers.Authorization =
            `Bearer ${newToken}`;

          return api(originalRequest);
        } catch (refreshError) {
          // refreshAccessToken() already cleared tokens and called notifyAuthError()
          // when the refresh endpoint returned 401/403. Nothing extra to do here.
          return Promise.reject({
            ...error,
            isAuthError: true,
            message: 'Session expired. Please log in again.',
          });
        }
      }

      // Second 401 on the same request after retry — session is gone.
      notifyAuthError();

      return Promise.reject({
        ...error,
        isAuthError: true,
        message: 'Session expired. Please log in again.',
      });
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        ...error,
        message: 'Request timed out. Please try again.',
        isNetworkError: true,
        code: 'TIMEOUT_ERROR',
      });
    }

    if (error.response) {
      return Promise.reject({
        ...error,
        message:
          error.response.data?.error ||
          error.response.data?.message ||
          error.message,
        statusCode: error.response.status,
        isNetworkError: false,
      });
    }

    if (error.request) {
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection.',
        isNetworkError: true,
        code: 'NETWORK_ERROR',
      });
    }

    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// API CLIENT
// ---------------------------------------------------------------------------

const apiClient = {
  instance: api,
  interceptors: api.interceptors,
  defaults: api.defaults,

  get: (...args) => api.get(...args),
  post: (...args) => api.post(...args),
  put: (...args) => api.put(...args),
  delete: (...args) => api.delete(...args),

  // Backwards compatibility.
  login: (credentials) => apiClient.auth.login(credentials),
  register: (userData) => apiClient.auth.register(userData),
  getListings: () => apiClient.listings.getAll(),

  // -------------------------------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------------------------------

  auth: {
    async login(credentials) {
      try {
        const response = await api.post(
          '/auth/login',
          credentials,
          { skipAuth: true }
        );

        const data = response.data?.data;

        if (response.data?.success && data) {
          const stored = await tokenManager.setTokens(
            data.accessToken,
            data.refreshToken,
            data.expiresIn
          );

          console.log('LOGIN STATUS:', response.status);
          console.log('LOGIN SUCCESS:', response.data.success);
          console.log('ACCESS TOKEN PRESENT:', !!data.accessToken);
          console.log('REFRESH TOKEN PRESENT:', !!data.refreshToken);
          console.log('TOKEN EXPIRY:', data.expiresIn);
          console.log('TOKENS STORED SUCCESSFULLY:', stored);

          if (!stored) {
            throw new Error('Login succeeded but tokens could not be saved');
          }
        }

        return response;
      } catch (error) {
        console.log(
          'LOGIN ERROR:',
          error.response?.data || error.message
        );

        throw error;
      }
    },

    async register(userData) {
      const response = await api.post(
        '/auth/register',
        userData,
        { skipAuth: true }
      );

      const data = response.data?.data;

      if (response.data?.success && data) {
        const stored = await tokenManager.setTokens(
          data.accessToken,
          data.refreshToken,
          data.expiresIn
        );

        if (!stored) {
          throw new Error('Registration succeeded but tokens could not be saved');
        }
      }

      return response;
    },

    async logout() {
      await tokenManager.clearTokens();
      return true;
    },

    async isAuthenticated() {
      return tokenManager.isAuthenticated();
    },

    async refreshToken() {
      try {
        const token =
          await tokenManager.refreshAccessToken();

        return !!token;
      } catch (error) {
        return false;
      }
    },
  },

  // -------------------------------------------------------------------------
  // LISTINGS
  // -------------------------------------------------------------------------

  listings: {
    async getAll() {
      const retryable = createRetryHandler(
        () => api.get('/listings')
      );

      return retryable();
    },

    async getMy() {
      const retryable = createRetryHandler(
        () => api.get('/listings/my')
      );

      return retryable();
    },

    async getById(id) {
      const retryable = createRetryHandler(
        () => api.get(`/listings/${id}`)
      );

      return retryable();
    },

    async create(listingData) {
      return api.post('/listings', listingData);
    },

    async markAsSold(id) {
      return api.put(`/listings/${id}/sold`);
    },
  },

  // -------------------------------------------------------------------------
  // MESSAGES
  // -------------------------------------------------------------------------

  messages: {
    async getInbox() {
      const retryable = createRetryHandler(
        () => api.get('/messages/inbox')
      );
      return retryable();
    },

    async getConversation(conversationId) {
      const retryable = createRetryHandler(
        () => api.get(`/messages/${conversationId}`)
      );

      return retryable();
    },

    async send(messageData) {
      return api.post('/messages', messageData);
    },
  },

  tokenManager,
};

// ---------------------------------------------------------------------------
// CONVENIENCE EXPORTS
// ---------------------------------------------------------------------------

export const login = (credentials) =>
  apiClient.auth.login(credentials);

export const register = (userData) =>
  apiClient.auth.register(userData);

export const getListings = () =>
  apiClient.listings.getAll();

export default apiClient;
