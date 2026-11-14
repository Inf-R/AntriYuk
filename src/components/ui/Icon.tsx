/**
 * Icon — pembungkus tunggal ikon (Ionicons dari @expo/vector-icons).
 * Semua komponen UI memakai Icon agar sumber ikon mudah diganti di satu tempat.
 * Default dekoratif (disembunyikan dari pembaca layar); beri accessibilityLabel
 * bila ikon membawa makna sendiri.
 *
 * Contoh:
 *   <Icon name="time-outline" size={20} color={colors.accent} />
 *   <Icon name="alert-circle" accessibilityLabel="Peringatan" />
 */
import React, { ComponentProps } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, sizes } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function Icon({
  name,
  size = sizes.iconMd,
  color = colors.ink,
  style,
  accessibilityLabel,
}: IconProps) {
  const decorative = !accessibilityLabel;
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
      accessible={!decorative}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    />
  );
}

