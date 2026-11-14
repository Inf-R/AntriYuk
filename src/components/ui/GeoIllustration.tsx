/**
 * GeoIllustration — ilustrasi dekoratif dari View geometris (lingkaran,
 * persegi membulat, belah ketupat rotate 45 derajat, tanda centang dari border).
 * Memakai palet: ink, primary, accent, muted, canvas (+ white, primarySoft).
 * Tanpa SVG / gambar. Dekoratif secara default (disembunyikan dari pembaca layar).
 *
 * Contoh:
 *   <GeoIllustration variant="hero" size={180} />
 *   <GeoIllustration variant="empty" />
 *   <GeoIllustration variant="success" size={140} accessibilityLabel="Berhasil" />
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
  // Kartu tiket bertumpuk di atas lingkaran besar, ditemani bentuk kecil.
  hero: [
    { kind: 'circle', x: 14, y: 22, w: 124, color: colors.primarySoft },
    { kind: 'rounded', x: 30, y: 46, w: 92, h: 64, r: 16, color: colors.accent, rotate: -8 },
    { kind: 'rounded', x: 40, y: 52, w: 92, h: 64, r: 16, color: colors.primary },
    { kind: 'bar', x: 54, y: 70, w: 40, h: 8, r: 4, color: colors.white },
    { kind: 'bar', x: 54, y: 86, w: 60, h: 8, r: 4, color: 'rgba(255, 255, 255, 0.45)' },
    { kind: 'diamond', x: 120, y: 18, w: 22, color: colors.ink },
    { kind: 'circle', x: 128, y: 112, w: 16, color: colors.muted },
    { kind: 'ring', x: 10, y: 118, w: 22, stroke: 4, color: colors.accent },
  ],
  // Bidang tenang dengan kotak kosong bergaris putus.
  empty: [
    { kind: 'circle', x: 16, y: 16, w: 128, color: colors.white },
    { kind: 'rounded', x: 50, y: 50, w: 60, h: 60, r: 16, color: colors.canvas },
    { kind: 'bar', x: 62, y: 72, w: 36, h: 6, r: 3, color: colors.muted },
    { kind: 'bar', x: 62, y: 84, w: 24, h: 6, r: 3, color: colors.muted },
    { kind: 'diamond', x: 118, y: 24, w: 18, color: colors.accent },
    { kind: 'circle', x: 22, y: 116, w: 14, color: colors.primary },
    { kind: 'circle', x: 128, y: 124, w: 8, color: colors.ink },
    { kind: 'ring', x: 14, y: 30, w: 18, stroke: 3, color: colors.muted },
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

