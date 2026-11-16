/**
 * GeoIllustration — ilustrasi dekoratif dari View geometris (lingkaran,
 * persegi membulat, belah ketupat rotate 45 derajat, tanda centang dari border).
 * Memakai palet: ink, primary, accent, muted, canvas (+ white, primarySoft).
 * Tanpa SVG / gambar eksternal. Dekoratif secara default.
 *
 * Contoh:
 *   <GeoIllustration variant="hero" size={160} />
 *   <GeoIllustration variant="empty" size={148} />
 *   <GeoIllustration variant="success" size={140} />
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

export type GeoVariant = 'hero' | 'empty' | 'success';

export interface GeoIllustrationProps {
  variant?: GeoVariant;
  /** Sisi kotak ilustrasi (px). Default 160. */
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

type ShapeKind = 'circle' | 'rounded' | 'diamond' | 'ring' | 'check' | 'bar';

interface Shape {
  kind: ShapeKind;
  /** Posisi & ukuran pada grid 160 x 160. */
  x: number;
  y: number;
  w: number;
  h?: number;
  color: string;
  /** Radius untuk 'rounded' / 'bar' (grid 160). */
  r?: number;
  /** Tebal garis untuk 'ring' / 'check' (grid 160). */
  stroke?: number;
  rotate?: number;
}

const BASE = 160;

const compositions: Record<GeoVariant, Shape[]> = {
  // Ilustrasi gerai & antrean modern (mengacu pada layar Login & Onboarding).
  hero: [
    // Lingkaran latar lembut
    { kind: 'circle', x: 16, y: 14, w: 128, color: colors.primarySoft },
    // Bangunan gerai
    { kind: 'rounded', x: 28, y: 54, w: 68, h: 68, r: 12, color: colors.white },
    // Kanopi gerai
    { kind: 'rounded', x: 24, y: 44, w: 76, h: 18, r: 8, color: colors.accent },
    // Pintu & jendela gerai
    { kind: 'rounded', x: 38, y: 78, w: 22, h: 44, r: 6, color: colors.primary },
    { kind: 'rounded', x: 66, y: 76, w: 20, h: 20, r: 5, color: colors.primarySoft },
    // Siluet antrean pelanggan (3 figur geometris)
    { kind: 'circle', x: 105, y: 66, w: 14, color: colors.primary },
    { kind: 'rounded', x: 101, y: 83, w: 22, h: 38, r: 8, color: colors.primary },
    { kind: 'circle', x: 127, y: 74, w: 12, color: colors.accent },
    { kind: 'rounded', x: 124, y: 89, w: 18, h: 32, r: 7, color: colors.accent },
    // Aksen geometris mengambang
    { kind: 'diamond', x: 120, y: 24, w: 16, color: colors.accent },
    { kind: 'circle', x: 20, y: 28, w: 10, color: colors.muted },
    { kind: 'bar', x: 18, y: 120, w: 124, h: 6, r: 3, color: colors.primarySoft },
  ],
  // Papan tiket / clipboard miring dengan lencana centang (mengacu pada layar Belum ada antrean).
  empty: [
    { kind: 'circle', x: 18, y: 18, w: 124, color: colors.primarySoft },
    // Papan klip belakang
    { kind: 'rounded', x: 44, y: 32, w: 74, h: 96, r: 16, color: colors.accent, rotate: -6 },
    // Kertas putih di dalam papan
    { kind: 'rounded', x: 52, y: 44, w: 58, h: 74, r: 10, color: colors.white, rotate: -6 },
    // Klip atas
    { kind: 'rounded', x: 66, y: 26, w: 30, h: 14, r: 6, color: colors.primary, rotate: -6 },
    // Lingkaran & centang di tengah kertas
    { kind: 'circle', x: 64, y: 60, w: 34, color: colors.primarySoft },
    { kind: 'check', x: 76, y: 67, w: 10, h: 18, stroke: 4, color: colors.accent, rotate: 40 },
    // Baris teks tiruan
    { kind: 'bar', x: 62, y: 102, w: 38, h: 5, r: 3, color: colors.canvas },
    // Aksen sekitar
    { kind: 'diamond', x: 124, y: 34, w: 14, color: colors.primary },
    { kind: 'circle', x: 24, y: 112, w: 12, color: colors.accent },
    { kind: 'ring', x: 22, y: 36, w: 14, stroke: 3, color: colors.muted },
  ],
  // Lingkaran primary dengan centang, cincin accent, dan serpihan kecil.
  success: [
    { kind: 'ring', x: 14, y: 14, w: 132, stroke: 6, color: colors.primarySoft },
    { kind: 'circle', x: 32, y: 32, w: 96, color: colors.primary },
    { kind: 'check', x: 66, y: 52, w: 26, h: 46, stroke: 9, color: colors.white, rotate: 45 },
    { kind: 'diamond', x: 128, y: 30, w: 16, color: colors.accent },
    { kind: 'circle', x: 18, y: 120, w: 14, color: colors.accent },
    { kind: 'rounded', x: 126, y: 118, w: 14, h: 14, r: 4, color: colors.ink, rotate: 20 },
    { kind: 'circle', x: 20, y: 34, w: 8, color: colors.muted },
  ],
};

function shapeStyle(s: Shape, k: number): ViewStyle {
  const w = s.w * k;
  const h = (s.h ?? s.w) * k;
  const base: ViewStyle = {
    position: 'absolute',
    left: s.x * k,
    top: s.y * k,
    width: w,
    height: h,
    transform: s.rotate ? [{ rotate: `${s.rotate}deg` }] : undefined,
  };

  switch (s.kind) {
    case 'circle':
      return { ...base, borderRadius: w / 2, backgroundColor: s.color };
    case 'rounded':
    case 'bar':
      return { ...base, borderRadius: (s.r ?? 8) * k, backgroundColor: s.color };
    case 'diamond':
      return {
        ...base,
        borderRadius: 4 * k,
        backgroundColor: s.color,
        transform: [{ rotate: '45deg' }],
      };
    case 'ring':
      return {
        ...base,
        borderRadius: w / 2,
        borderWidth: (s.stroke ?? 4) * k,
        borderColor: s.color,
      };
    case 'check':
      return {
        ...base,
        borderRightWidth: (s.stroke ?? 8) * k,
        borderBottomWidth: (s.stroke ?? 8) * k,
        borderColor: s.color,
        borderBottomRightRadius: 2 * k,
      };
  }
}

export function GeoIllustration({
  variant = 'hero',
  size = BASE,
  accessibilityLabel,
  style,
}: GeoIllustrationProps) {
  const k = size / BASE;
  const decorative = !accessibilityLabel;

  return (
    <View
      style={[styles.box, { width: size, height: size }, style]}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      pointerEvents="none"
    >
      {compositions[variant].map((s, i) => (
        <View key={`${variant}-${i}`} style={shapeStyle(s, k)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'relative',
  },
});
