export const COLORS = {
  // Dark (cinematic) palette
  bgDark: '#080B09',
  surfaceDark: '#121714',
  surfaceElevatedDark: '#1C241F',
  borderDark: '#28362D',
  textDarkPrimary: '#FFFFFF',
  textDarkSecondary: '#A3B5AA',

  // Light palette
  bg: '#F8F9F8',
  surface: '#FFFFFF',
  border: '#E6E9E6',
  textPrimary: '#121614',
  textSecondary: '#6A7B72',
  textTertiary: '#9AA9A1',

  // Brand
  primary: '#235E3B',
  primaryHover: '#1A472C',
  accent: '#FF5C35',
  accentHover: '#E04824',
  success: '#34C759',
  warning: '#FF9F0A',

  // Overlays
  overlayDark: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.3)',
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  screenEdge: 24,
};

export const RADIUS = { sm: 8, md: 16, lg: 24, pill: 9999 };

export const SHADOWS = {
  sm: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  md: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  lg: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8,
  },
};

export const FONTS = {
  // System font stack used via fontFamily on web, default system on native
  sans: undefined as undefined,
};
