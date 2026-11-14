/**
 * Chip — pilihan/filter berbentuk kapsul.
 * Aktif: isi accent, teks putih. Nonaktif: putih dengan border muted lembut.
 * Tinggi visual 36, area sentuh diperluas ke 48 lewat hitSlop.
 *
 * Contoh:
 *   <Chip label="Semua" active={filter === 'all'} onPress={() => setFilter('all')} />
 *   <Chip label="Buka" icon="radio-button-on" active={false} onPress={...} />
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

export interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const CHIP_HEIGHT = 36;
const HIT = (sizes.touchMin - CHIP_HEIGHT) / 2;

export function Chip({
  label,
  active = false,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  style,
}: ChipProps) {
  const fg = active ? colors.white : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={{ top: HIT, bottom: HIT, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        styles.base,
        active ? styles.active : styles.inactive,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={sizes.iconSm} color={active ? colors.white : colors.accent} /> : null}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: CHIP_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.chip,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1,
  },
  active: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  inactive: {
    backgroundColor: colors.white,
    borderColor: colors.mutedSoft,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.label,
    fontSize: 14,
  },
});
