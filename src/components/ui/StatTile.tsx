/**
 * StatTile — tile KPI: label kecil + angka besar (tabular) + lencana ikon opsional.
 * Varian: filledPrimary (isi primary), filledAccent (isi accent),
 * tint (primarySoft), neutral (canvas), card (putih berbayangan lembut).
 * Mendukung iconTone ('primary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted')
 * untuk memberi warna status pada lencana ikon seperti pada acuan Ringkasan Harian.
 *
 * Contoh:
 *   <StatTile label="Total Tiket" value={48} variant="card" icon="ticket" iconTone="accent" />
 *   <StatTile label="Selesai" value={45} variant="card" icon="checkmark-circle" iconTone="success" />
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

export type StatTileVariant =
  | 'filledPrimary'
  | 'filledAccent'
  | 'tint'
  | 'neutral'
  | 'card';

export type StatTileIconTone =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

export interface StatTileProps {
  label: string;
  value: string | number;
  /** Satuan kecil di samping angka, mis. "mnt" atau "menit". */
  unit?: string;
  caption?: string;
  icon?: IconName;
  iconTone?: StatTileIconTone;
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
  shadow: boolean;
}

const tileTokens: Record<StatTileVariant, TileTokens> = {
  filledPrimary: {
    background: colors.primary,
    value: colors.white,
    label: colors.white,
    iconBg: colors.onPrimaryTranslucent,
    icon: colors.white,
    shadow: false,
  },
  filledAccent: {
    background: colors.accent,
    value: colors.white,
    label: colors.white,
    iconBg: colors.onPrimaryTranslucent,
    icon: colors.white,
    shadow: false,
  },
  tint: {
    background: colors.primarySoft,
    value: colors.primary,
    label: colors.slateText,
    iconBg: colors.white,
    icon: colors.accent,
    shadow: false,
  },
  neutral: {
    background: colors.canvas,
    value: colors.ink,
    label: colors.slateText,
    iconBg: colors.white,
    icon: colors.slateText,
    shadow: false,
  },
  card: {
    background: colors.white,
    value: colors.ink,
    label: colors.slateText,
    iconBg: colors.primarySoft,
    icon: colors.accent,
    shadow: true,
  },
};

const iconToneTokens: Record<StatTileIconTone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  accent: { bg: colors.primarySoft, fg: colors.accent },
  success: { bg: colors.status.called.background, fg: colors.status.called.text },
  warning: { bg: colors.status.approaching.background, fg: colors.status.approaching.text },
  danger: { bg: colors.status.cancelled.background, fg: colors.status.cancelled.text },
  muted: { bg: colors.canvas, fg: colors.slateText },
};

export function StatTile({
  label,
  value,
  unit,
  caption,
  icon,
  iconTone,
  variant = 'neutral',
  accessibilityLabel,
  style,
}: StatTileProps) {
  const t = tileTokens[variant];
  const tone = iconTone ? iconToneTokens[iconTone] : null;
  const iconBg = tone ? tone.bg : t.iconBg;
  const iconColor = tone ? tone.fg : t.icon;
  const spoken = `${label}: ${value}${unit ? ` ${unit}` : ''}`;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? spoken}
      style={[
        styles.base,
        { backgroundColor: t.background },
        t.shadow ? shadows.soft : null,
        style,
      ]}
    >
      <View style={styles.top}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Icon name={icon} size={18} color={iconColor} />
          </View>
        ) : null}
        <View style={styles.valueBlock}>
          <View style={styles.valueRow}>
            <Text
              style={[styles.value, { color: t.value }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {value}
            </Text>
            {unit ? <Text style={[styles.unit, { color: t.label }]}>{unit}</Text> : null}
          </View>
          <Text style={[styles.label, { color: t.label }]} numberOfLines={2}>
            {label}
          </Text>
        </View>
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
    minHeight: 96,
    borderRadius: radii.tile,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBlock: {
    flex: 1,
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  value: {
    ...typography.stat,
    fontSize: 28,
    lineHeight: 34,
  },
  unit: {
    ...typography.label,
  },
  label: {
    ...typography.label,
  },
  caption: {
    ...typography.caption,
  },
});
