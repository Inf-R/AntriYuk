import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  android: 'Roboto',
  default: 'System',
});

export const colors = {
  primary: '#326DDA',
  primaryDark: '#063C92',
  textPrimary: '#2B2D42',
  textMuted: '#8D99AE',
  background: '#EDF2F4',
  surface: '#FFFFFF',
  border: '#DCE3EA',

  status: {
    waiting: {
      text: '#8D99AE',
      background: '#EDF2F4',
    },
    approaching: {
      text: '#D97706',
      background: '#FEF3C7',
    },
    called: {
      text: '#059669',
      background: '#ECFDF5',
    },
    cancelled: {
      text: '#DC2626',
      background: '#FEE2E2',
    },
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  card: 14,
  pill: 999,
} as const;

export const sizes = {
  buttonMinHeight: 50,
} as const;

export const typography: Record<'displayTicket' | 'heading' | 'subheading' | 'body' | 'bodyBold' | 'caption', TextStyle> = {
  displayTicket: {
    fontFamily,
    fontSize: 56,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 64,
  },
  heading: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 28,
  },
  subheading: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  body: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bodyBold: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    lineHeight: 16,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  sizes,
  typography,
} as const;

export type Theme = typeof theme;

