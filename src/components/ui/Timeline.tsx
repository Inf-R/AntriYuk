/**
 * Timeline — alur vertikal posisi antrean pelanggan:
 * 1. Nomor diambil
 * 2. Menunggu
 * 3. Hampir giliran
 * 4. Dipanggil
 *
 * Langkah selesai memakai lingkaran accent dengan ikon centang,
 * langkah aktif memakai titik accent dengan denyut halus (menghormati reduce motion),
 * langkah berikutnya memakai lingkaran border muted.
 *
 * Contoh:
 *   <Timeline activeStep={2} />
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';
import { Icon } from './Icon';
import { useReducedMotion } from './useReducedMotion';

export interface TimelineStepItem {
  title: string;
  description: string;
}

const DEFAULT_STEPS: readonly TimelineStepItem[] = [
  {
    title: 'Nomor diambil',
    description: 'Nomor antrean Anda sudah tercatat di sistem usaha.',
  },
  {
    title: 'Menunggu',
    description: 'Antrean sedang berjalan dari rumah tanpa perlu berdiri.',
  },
  {
    title: 'Hampir giliran',
    description: 'Tersisa maksimal 2 orang di depan Anda, harap bersiap.',
  },
  {
    title: 'Dipanggil',
    description: 'Silakan menuju loket layanan sebelum masa tunggu berakhir.',
  },
];

export interface TimelineProps {
  /**
   * Indeks langkah aktif (0..3):
   * - 1 = Menunggu
   * - 2 = Hampir giliran
   * - 3 = Dipanggil
   * Bila < 0 (mis. no_show / expired), tampilkan status berhenti pada langkah terakhir yang tercapai.
   */
  activeStep: number;
  steps?: readonly TimelineStepItem[];
  /** Teks khusus pada langkah aktif (opsional). */
  activeSubtext?: string;
  style?: StyleProp<ViewStyle>;
}

export function Timeline({
  activeStep,
  steps = DEFAULT_STEPS,
  activeSubtext,
  style,
}: TimelineProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.24,
          duration: 650,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <View
      style={[styles.card, style]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Progres antrean: langkah ${Math.min(activeStep + 1, steps.length)} dari ${steps.length}`}
    >
      <Text style={styles.heading}>Tahap Antrean</Text>
      <View style={styles.list}>
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isCurrent = index === activeStep;
          const isLast = index === steps.length - 1;

          return (
            <View key={step.title} style={styles.row}>
              <View style={styles.railCol}>
                {isCompleted ? (
                  <View style={[styles.dot, styles.dotCompleted]}>
                    <Icon name="checkmark" size={14} color={colors.white} />
                  </View>
                ) : isCurrent ? (
                  <View style={styles.activeDotOuter}>
                    <Animated.View
                      style={[
                        styles.pulseHalo,
                        { transform: [{ scale: pulse }] },
                      ]}
                    />
                    <View style={[styles.dot, styles.dotActive]}>
                      <View style={styles.innerCore} />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.dot, styles.dotUpcoming]} />
                )}

                {!isLast ? (
                  <View
                    style={[
                      styles.connector,
                      isCompleted ? styles.connectorDone : null,
                    ]}
                  />
                ) : null}
              </View>

              <View style={[styles.textCol, !isLast ? styles.textColSpaced : null]}>
                <Text
                  style={[
                    styles.stepTitle,
                    isCurrent
                      ? styles.stepTitleActive
                      : isCompleted
                        ? styles.stepTitleCompleted
                        : styles.stepTitleUpcoming,
                  ]}
                >
                  {step.title}
                </Text>
                <Text style={styles.stepDescription}>
                  {isCurrent && activeSubtext ? activeSubtext : step.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const DOT_SIZE = 26;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.screen,
    ...shadows.soft,
  },
  heading: {
    ...typography.subtitle,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  list: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  railCol: {
    width: 32,
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: {
    backgroundColor: colors.accent,
  },
  activeDotOuter: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseHalo: {
    position: 'absolute',
    width: DOT_SIZE + 8,
    height: DOT_SIZE + 8,
    borderRadius: (DOT_SIZE + 8) / 2,
    backgroundColor: colors.primarySoft,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  innerCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  dotUpcoming: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.muted,
  },
  connector: {
    flex: 1,
    width: 2,
    minHeight: 22,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  connectorDone: {
    backgroundColor: colors.accent,
  },
  textCol: {
    flex: 1,
    paddingTop: 2,
  },
  textColSpaced: {
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    ...typography.bodyLgStrong,
    marginBottom: 2,
  },
  stepTitleActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepTitleCompleted: {
    color: colors.ink,
  },
  stepTitleUpcoming: {
    color: colors.slateText,
    fontWeight: '500',
  },
  stepDescription: {
    ...typography.caption,
    lineHeight: 18,
  },
});
