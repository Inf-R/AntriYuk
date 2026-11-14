import { Platform, TextStyle, ViewStyle } from 'react-native';

const fontFamily = Platform.select({
  android: 'Roboto',
  default: 'System',
});

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Peran warna (palet inti).
 * - ink: judul, teks utama, permukaan gelap
 * - slateText: teks sekunder & label (kontras >= 4.5:1 di atas putih/canvas)
 * - muted: ikon nonaktif, garis, border, placeholder. JANGAN untuk teks kecil.
 * - canvas: latar layar, latar input, tile netral
 * - primary: tombol utama, angka hero, tab aktif, kepala kartu tiket
 * - accent: chip aktif, link, ikon aktif, progres, tile KPI sekunder
 * - white: permukaan kartu
 * - primarySoft: latar ikon & chip lembut
 * Teks putih hanya di atas primary atau accent.
 */
const palette = {
  ink: '#2B2D42',
  slateText: '#5F6B80',
  muted: '#8D99AE',
  canvas: '#EDF2F4',
  primary: '#063C92',
  accent: '#326DDA',
  white: '#FFFFFF',
  primarySoft: '#E4ECFB',
} as const;

export const colors = {
  ...palette,

  // Nama token lama (dipertahankan; nilainya diselaraskan dengan peran baru).
  primaryDark: palette.primary,
  textPrimary: palette.ink,
  /** Teks sekunder. Dulu #8D99AE; kini slateText agar kontras teks kecil cukup. */
  textMuted: palette.slateText,
  background: palette.canvas,
  surface: palette.white,
  border: '#DCE3EA',

  // Alias tambahan.
  textSecondary: palette.slateText,
  borderSoft: '#E3E8EF',
  /** Border muted lembut (chip nonaktif, garis putus timeline). */
  mutedSoft: 'rgba(141, 153, 174, 0.45)',
  onPrimary: palette.white,
  /** Teks di atas permukaan ink (blok hero gelap). Bukan putih murni. */
  onInk: palette.canvas,
  onInkSecondary: 'rgba(237, 242, 244, 0.78)',
  danger: '#DC2626',
  overlay: 'rgba(43, 45, 66, 0.45)',

  // Varian teks status yang lebih gelap untuk teks kecil (kontras >= 4.5:1).
  // Warna status di atas tetap dipakai untuk ikon dan aksen.
  statusInk: {
    called: '#047857',
    approaching: '#92400E',
    cancelled: '#B91C1C',
  },

  // Warna status: nilai lama dipertahankan.
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

/** Jarak berbasis kelipatan 4. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  /** Padding horizontal standar layar. */
  screen: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radii = {
  sm: 8,
  /** Kartu (dulu 14). */
  card: 20,
  button: 14,
  input: 14,
  tile: 16,
  sheet: 28,
  chip: 999,
  pill: 999,
} as const;

export const sizes = {
  buttonMinHeight: 50,
  buttonLargeHeight: 56,
  inputHeight: 52,
  /** Area sentuh minimum. */
  touchMin: 48,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  avatar: 40,
} as const;

export const shadows: Record<'none' | 'soft' | 'raised', ViewStyle> = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  soft: {
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: palette.ink,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};

/** Durasi gerak (ms). Pakai Easing.out; hormati reduce motion. */
export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
  pressScale: 0.98,
} as const;

type TypographyKey =
  // Token lama
  | 'displayTicket'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyBold'
  | 'caption'
  // Token baru
  | 'displayHero'
  | 'display'
  | 'stat'
  | 'title'
  | 'subtitle'
  | 'bodyLg'
  | 'bodyLgStrong'
  | 'label'
  | 'captionStrong';

export const typography: Record<TypographyKey, TextStyle> = {
  // ---- Token lama (ukuran dipertahankan agar layar lama tidak bergeser) ----
  displayTicket: {
    fontFamily,
    fontSize: 56,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 64,
    fontVariant: tabular,
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
    lineHeight: 17,
  },

  // ---- Skala baru ----
  /** Nomor tiket utama (72). */
  displayHero: {
    fontFamily,
    fontSize: 72,
    fontWeight: '800',
    color: palette.primary,
    lineHeight: 80,
    letterSpacing: -1,
    fontVariant: tabular,
  },
  /** Angka besar sekunder (56). */
  display: {
    fontFamily,
    fontSize: 56,
    fontWeight: '800',
    color: palette.primary,
    lineHeight: 64,
    letterSpacing: -0.5,
    fontVariant: tabular,
  },
  /** Angka di StatTile. */
  stat: {
    fontFamily,
    fontSize: 32,
    fontWeight: '800',
    color: palette.ink,
    lineHeight: 38,
    fontVariant: tabular,
  },
  /** Judul layar (26). */
  title: {
    fontFamily,
    fontSize: 26,
    fontWeight: '700',
    color: palette.ink,
    lineHeight: 34,
    letterSpacing: -0.2,
  },
  /** Subjudul / judul seksi (18). */
  subtitle: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: palette.ink,
    lineHeight: 25,
  },
  /** Isi (15). */
  bodyLg: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    color: palette.ink,
    lineHeight: 21,
  },
  bodyLgStrong: {
    fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: palette.ink,
    lineHeight: 21,
  },
  /** Label input / tile (13). */
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: palette.slateText,
    lineHeight: 18,
  },
  captionStrong: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: palette.slateText,
    lineHeight: 17,
  },
};

export const theme = {
  colors,
  spacing,
  radii,
  sizes,
  shadows,
  motion,
  typography,
} as const;

export type Theme = typeof theme;
