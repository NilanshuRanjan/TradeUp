// TradeUp App Theme & Design Tokens

export const colors = {
  // Brand Colors
  primary: '#4F46E5',        // Modern Indigo
  primaryDark: '#3730A3',    // Deep Indigo for active states
  primaryLight: '#EEF2FF',   // Subtle tinted background
  primaryGradient: '#6366F1',

  // Accent & Actions
  secondary: '#0EA5E9',      // Sky Blue
  accent: '#F59E0B',         // Amber for highlights
  success: '#10B981',        // Emerald Green for pricing & active
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',         // Rose red for sold / logout / errors
  dangerLight: '#FEF2F2',

  // Surfaces & Backgrounds
  background: '#F8FAFC',     // Clean slate background
  surface: '#FFFFFF',        // Pure white card surfaces
  surfaceAlt: '#F1F5F9',     // Subtle contrast surfaces

  // Typography
  textPrimary: '#0F172A',    // Slate 900 for high-contrast titles
  textSecondary: '#475569',  // Slate 600 for body text
  textMuted: '#94A3B8',      // Slate 400 for captions / dates
  textLight: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',         // Subtle slate border
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
};

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export default {
  colors,
  shadows,
  radius,
};
