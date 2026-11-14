/**
 * Button — tombol dengan varian primary, accent, secondary (outline),
 * dangerOutline, dan ghost. Ukuran m (50) dan l (56). Mendukung loading,
 * disabled, ikon kiri/kanan, dan efek tekan skala 0,98 (dimatikan bila
 * reduce motion aktif).
 *
 * Contoh:
 *   <Button label="Ambil Antrean" onPress={join} size="l" loading={isPending} />
 *   <Button label="Batalkan" variant="dangerOutline" iconLeft="close-circle-outline"
 *           onPress={confirmCancel} disabled={busy} />
 *   <Button label="Lewati" variant="ghost" fullWidth={false} onPress={skip} />
 */
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, motion, radii, sizes, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';
import { useReducedMotion } from './useReducedMotion';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'dangerOutline' | 'ghost';
export type ButtonSize = 'm' | 'l';

export interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  /** Lebar penuh. Default true. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface VariantTokens {
  background: string;
  border: string;
  text: string;
}

const variantTokens: Record<ButtonVariant, VariantTokens> = {
  primary: { background: colors.primary, border: colors.primary, text: colors.white },
  accent: { background: colors.accent, border: colors.accent, text: colors.white },
  secondary: { background: colors.white, border: colors.primary, text: colors.primary },
  dangerOutline: { background: colors.white, border: colors.danger, text: colors.danger },
  ghost: { background: 'transparent', border: 'transparent', text: colors.primary },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'm',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = true,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const tokens = variantTokens[variant];
  const inactive = disabled || loading;

  const animateTo = (toValue: number) => {
    if (reduceMotion) return;
    Animated.timing(scale, {
      toValue,
      duration: motion.fast,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const height = size === 'l' ? sizes.buttonLargeHeight : sizes.buttonMinHeight;
  const iconSize = size === 'l' ? sizes.iconLg : sizes.iconMd;

  return (
    <Animated.View
      style={[fullWidth ? styles.fullWidth : styles.inline, { transform: [{ scale }] }, style]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(motion.pressScale)}
        onPressOut={() => animateTo(1)}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          {
            minHeight: height,
            backgroundColor: tokens.background,
            borderColor: tokens.border,
            paddingHorizontal: size === 'l' ? spacing.xl : spacing.screen,
          },
          variant === 'primary' || variant === 'accent' ? styles.filled : null,
          pressed && !reduceMotion ? styles.pressed : null,
          disabled && !loading ? styles.disabled : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={tokens.text} accessibilityLabel="Memproses" />
        ) : iconLeft ? (
          <Icon name={iconLeft} size={iconSize} color={tokens.text} />
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            size === 'l' ? styles.labelLarge : styles.label,
            { color: tokens.text },
          ]}
        >
          {label}
        </Text>
        {iconRight && !loading ? (
          <Icon name={iconRight} size={iconSize} color={tokens.text} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  inline: {
    alignSelf: 'flex-start',
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1.5,
  },
  filled: {
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    ...typography.bodyLgStrong,
  },
  labelLarge: {
    ...typography.bodyLgStrong,
    fontSize: 16,
    lineHeight: 22,
  },
});
