/**
 * StepIndicator — indikator langkah horizontal (lingkaran bernomor + garis).
 * Selesai: isi accent dengan centang. Aktif: isi primary. Berikutnya: putih
 * berborder muted. Label selalu tampil sebagai teks (tidak hanya warna).
 *
 * Contoh:
 *   <StepIndicator steps={['Email', 'Kode', 'Sandi baru']} current={1} />
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';
import { Icon } from './Icon';

export interface StepIndicatorProps {
  steps: string[];
  /** Indeks langkah aktif (mulai 0). */
  current: number;
  style?: StyleProp<ViewStyle>;
}

const DOT = 32;

export function StepIndicator({ steps, current, style }: StepIndicatorProps) {
  const label = `Langkah ${current + 1} dari ${steps.length}: ${steps[current] ?? ''}`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}
      style={[styles.row, style]}
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={step} style={styles.item}>
            <View style={styles.dotRow}>
              <View style={[styles.line, i === 0 ? styles.lineHidden : null, i <= current ? styles.lineOn : null]} />
              <View style={[styles.dot, done ? styles.dotDone : active ? styles.dotActive : styles.dotTodo]}>
                {done ? (
                  <Icon name="checkmark" size={16} color={colors.white} />
                ) : (
                  <Text style={[styles.num, active ? styles.numActive : null]}>{i + 1}</Text>
                )}
              </View>
              <View
                style={[
                  styles.line,
                  i === steps.length - 1 ? styles.lineHidden : null,
                  i < current ? styles.lineOn : null,
                ]}
              />
            </View>
            <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  line: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.mutedSoft,
  },
  lineOn: {
    backgroundColor: colors.accent,
  },
  lineHidden: {
    opacity: 0,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dotDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotTodo: {
    backgroundColor: colors.white,
    borderColor: colors.mutedSoft,
  },
  num: {
    ...typography.captionStrong,
    fontSize: 13,
    color: colors.slateText,
    fontVariant: ['tabular-nums'],
  },
  numActive: {
    color: colors.white,
  },
  label: {
    ...typography.caption,
  },
  labelActive: {
    ...typography.captionStrong,
    color: colors.ink,
  },
});
