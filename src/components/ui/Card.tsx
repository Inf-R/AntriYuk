/**
 * Card — permukaan putih radius 20 berbayangan lembut.
 * Varian: default (putih), tint (canvas, tanpa bayangan), dark (ink).
 * Bila onPress diisi, kartu menjadi tombol dengan umpan balik tekan skala 0,98
 * yang menghormati pengaturan reduce motion.
 *
 * Contoh:
 *   <Card><Text>Isi kartu</Text></Card>
 *   <Card variant="tint" padding="md">...</Card>
 *   <Card onPress={openDetail} accessibilityLabel="Buka detail usaha">...</Card>
 */
import React, { ReactNode, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, motion, radii, shadows, spacing } from '@/lib/theme';
import { useReducedMotion } from './useReducedMotion';

export type CardVariant = 'default' | 'tint' | 'dark';
export type CardPadding = 'none' | 'md' | 'lg';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  /** none = 0, md = 16, lg = 20 (default). */
  padding?: CardPadding;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  md: spacing.lg,
  lg: spacing.screen,
};

export function Card({
  children,
  variant = 'default',
  padding = 'lg',
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    if (reduceMotion) return;
    Animated.timing(scale, {
      toValue,
      duration: motion.fast,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const baseStyle: StyleProp<ViewStyle> = [
    styles.base,
    variantStyles[variant],
    { padding: paddingMap[padding] },
  ];

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={() => animateTo(motion.pressScale)}
          onPressOut={() => animateTo(1)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled }}
          testID={testID}
          style={({ pressed }) => [
            baseStyle,
            pressed ? styles.pressed : null,
            disabled ? styles.disabled : null,
            style,
          ]}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View
      style={[baseStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel ? true : undefined}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
  },
  pressed: {
    opacity: 0.94,
  },
  disabled: {
    opacity: 0.55,
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.white,
    ...shadows.soft,
  },
  tint: {
    backgroundColor: colors.canvas,
  },
  dark: {
    backgroundColor: colors.ink,
    ...shadows.soft,
  },
});
