/**
 * StatTile — tile KPI: label kecil + angka besar (tabular).
 * Varian: filledPrimary (isi primary), filledAccent (isi accent),
 * tint (primarySoft), neutral (canvas).
 *
 * Contoh:
 *   <StatTile label="Menunggu" value={12} variant="filledPrimary" icon="people-outline" />
 *   <StatTile label="Estimasi" value="15" unit="mnt" variant="tint" />
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

export type StatTileVariant = 'filledPrimary' | 'filledAccent' | 'tint' | 'neutral';

export interface StatTileProps {
  label: string;
  value: string | number;
  /** Satuan kecil di samping angka, mis. "mnt". */
  unit?: string;
  caption?: string;
  icon?: IconName;
  variant?: StatTileVariant;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

interface TileTokens {
  background: string;
  value: string;
  label: string;
  iconBg: string;
  icon: string;
}

const tileTokens: Record<StatTileVariant, TileTokens> = {
  filledPrimary: {
    background: colors.primary,
    value: colors.white,
    label: colors.white,
    iconBg: 'rgba(255, 255, 255, 0.16)',
    icon: colors.white,
  },
  filledAccent: {
    background: colors.accent,
    value: colors.white,
    label: colors.white,
    iconBg: 'rgba(255, 255, 255, 0.2)',
    icon: colors.white,
  },
  tint: {
    background: colors.primarySoft,
    value: colors.primary,
    label: colors.slateText,
    iconBg: colors.white,
    icon: colors.accent,
  },
  neutral: {
    background: colors.canvas,
    value: colors.ink,
    label: colors.slateText,
    iconBg: colors.white,
    icon: colors.slateText,
  },
};

export function StatTile({
  label,
  value,
  unit,
  caption,
  icon,
  variant = 'neutral',
  accessibilityLabel,
  style,
}: StatTileProps) {
  const t = tileTokens[variant];
  const spoken = `${label}: ${value}${unit ? ` ${unit}` : ''}`;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? spoken}
      style={[styles.base, { backgroundColor: t.background }, style]}
    >
      <View style={styles.top}>
        <Text style={[styles.label, { color: t.label }]} numberOfLines={2}>
          {label}
        </Text>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: t.iconBg }]}>
            <Icon name={icon} size={16} color={t.icon} />
          </View>
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: t.value }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unit ? <Text style={[styles.unit, { color: t.label }]}>{unit}</Text> : null}
      </View>
      {caption ? (
        <Text style={[styles.caption, { color: t.label }]} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    minHeight: 104,
    borderRadius: radii.tile,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    flex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    ...typography.stat,
  },
  unit: {
    ...typography.label,
  },
  caption: {
    ...typography.caption,
  },
});

