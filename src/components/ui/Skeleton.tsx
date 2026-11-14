/**
 * Skeleton — placeholder berdenyut (Animated opacity) saat memuat.
 * Bila reduce motion aktif, tampil statis.
 *
 * Contoh:
 *   <Skeleton width="60%" height={20} />
 *   <Skeleton height={120} radius={20} />
 *   <Skeleton width={48} height={48} radius={999} />
 */
import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, Easing, StyleProp, ViewStyle } from 'react-native';
import { colors, radii } from '@/lib/theme';
import { useReducedMotion } from './useReducedMotion';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  /** Warna dasar. Default putih kebiruan di atas canvas. */
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = radii.sm,
  color = colors.border,
  accessibilityLabel,
  style,
}: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[{ width, height, borderRadius: radius, backgroundColor: color, opacity }, style]}
    />
  );
}
