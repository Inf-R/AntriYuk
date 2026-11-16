/**
 * CategoryIcon & CategoryTile — ikon kategori usaha dari MaterialCommunityIcons
 * dan ubin ikon 56 px berlatar primarySoft.
 *
 * Pemetaan terverifikasi:
 * - klinik: hospital-box-outline
 * - barbershop: content-cut
 * - bengkel: wrench-outline
 * - warung_makan: silverware-fork-knife
 * - lainnya: storefront-outline
 * - semua: view-grid-outline
 *
 * Contoh:
 *   <CategoryTile category={item.category} />
 *   <CategoryIcon category="klinik" size={18} color={colors.accent} />
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii } from '@/lib/theme';
import type { BusinessCategory } from '@/types/database';

export type CategoryFilterKey = 'semua' | BusinessCategory;

export type CategoryMciIconName =
  | 'view-grid-outline'
  | 'hospital-box-outline'
  | 'content-cut'
  | 'wrench-outline'
  | 'silverware-fork-knife'
  | 'storefront-outline';

export const CATEGORY_ICON_MAP: Record<CategoryFilterKey, CategoryMciIconName> = {
  semua: 'view-grid-outline',
  klinik: 'hospital-box-outline',
  barbershop: 'content-cut',
  bengkel: 'wrench-outline',
  warung_makan: 'silverware-fork-knife',
  lainnya: 'storefront-outline',
};

export function getCategoryIconName(category: CategoryFilterKey): CategoryMciIconName {
  return CATEGORY_ICON_MAP[category] ?? 'storefront-outline';
}

export interface CategoryIconProps {
  category: CategoryFilterKey;
  size?: number;
  color?: string;
}

export function CategoryIcon({
  category,
  size = 24,
  color = colors.primary,
}: CategoryIconProps) {
  const iconName = getCategoryIconName(category);
  return (
    <MaterialCommunityIcons
      name={iconName}
      size={size}
      color={color}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export interface CategoryTileProps {
  category: BusinessCategory;
  /** Ukuran sisi ubin (px). Default 56. */
  size?: number;
  iconSize?: number;
  backgroundColor?: string;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function CategoryTile({
  category,
  size = 56,
  iconSize = 26,
  backgroundColor = colors.primarySoft,
  iconColor = colors.primary,
  style,
}: CategoryTileProps) {
  const borderRadius = size >= 60 ? radii.card : radii.tile;
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius, backgroundColor },
        style,
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <CategoryIcon category={category} size={iconSize} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
