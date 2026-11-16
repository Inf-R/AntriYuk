/**
 * Chip — pilihan/filter berbentuk kapsul.
 * Aktif: isi accent, teks putih. Nonaktif: putih dengan border muted lembut.
 * Mendukung ikon Ionicons (icon) maupun ikon kategori MaterialCommunityIcons (category).
 * Tinggi visual 40, area sentuh diperluas ke 48 lewat hitSlop.
 *
 * Contoh:
 *   <Chip label="Semua" category="semua" active={filter === 'semua'} onPress={...} />
 *   <Chip label="Klinik Pratama" category="klinik" active={false} onPress={...} />
 */
import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, motion, radii, sizes, spacing, typography } from '@/lib/theme';
import { CategoryFilterKey, CategoryIcon } from './CategoryIcon';
import { Icon, IconName } from './Icon';
import { useReducedMotion } from './useReducedMotion';

export interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  category?: CategoryFilterKey;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const CHIP_HEIGHT = 40;
const HIT = (sizes.touchMin - CHIP_HEIGHT) / 2;

export function Chip({
  label,
  active = false,
  onPress,
  icon,
  category,
  disabled = false,
  accessibilityLabel,
  style,
}: ChipProps) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const fg = active ? colors.white : colors.ink;
  const iconColor = active ? colors.white : colors.accent;

  const animateTo = (toValue: number) => {
    if (reduceMotion) return;
    Animated.timing(scale, {
      toValue,
      duration: motion.fast,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(motion.pressScale)}
        onPressOut={() => animateTo(1)}
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
        {category ? (
          <CategoryIcon category={category} size={17} color={iconColor} />
        ) : icon ? (
          <Icon name={icon} size={sizes.iconSm} color={iconColor} />
        ) : null}
        <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
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
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.label,
    fontSize: 14,
  },
});
