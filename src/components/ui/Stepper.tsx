/**
 * Stepper — kontrol angka dengan tombol minus (-), tampilan nilai + satuan,
 * dan tombol plus (+) yang menulis langsung ke state string layar
 * (sehingga logika parseInt & validasi Zod yang ada tidak berubah).
 *
 * Contoh:
 *   <Stepper
 *     label="Rata-rata layanan"
 *     valueText={avgServiceMinutesText}
 *     onChangeText={setAvgServiceMinutesText}
 *     min={1}
 *     max={240}
 *     unit="menit"
 *     helper="Rentang 1–240 menit per pelanggan"
 *   />
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '@/lib/theme';
import { Icon } from './Icon';

export interface StepperProps {
  label: string;
  valueText: string;
  onChangeText: (nextText: string) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  helper?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Stepper({
  label,
  valueText,
  onChangeText,
  min,
  max,
  step = 1,
  unit = 'menit',
  helper,
  disabled = false,
  style,
}: StepperProps) {
  const parsed = Number.parseInt(valueText.trim(), 10);
  const current = Number.isNaN(parsed) ? min : parsed;
  const canDecrement = !disabled && current > min;
  const canIncrement = !disabled && current < max;

  const handleDecrement = () => {
    if (!canDecrement) return;
    const next = Math.max(min, Math.min(max, current - step));
    onChangeText(String(next));
  };

  const handleIncrement = () => {
    if (!canIncrement) return;
    const next = Math.max(min, Math.min(max, current + step));
    onChangeText(String(next));
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      </View>

      <View style={styles.controlBar}>
        <Pressable
          onPress={handleDecrement}
          disabled={!canDecrement}
          accessibilityRole="button"
          accessibilityLabel={`Kurangi ${label}`}
          accessibilityState={{ disabled: !canDecrement }}
          style={({ pressed }) => [
            styles.stepBtn,
            pressed && canDecrement ? styles.stepBtnPressed : null,
            !canDecrement ? styles.stepBtnDisabled : null,
          ]}
        >
          <Icon
            name="remove"
            size={20}
            color={canDecrement ? colors.primary : colors.muted}
          />
        </Pressable>

        <View style={styles.centerBox}>
          <TextInput
            value={valueText}
            onChangeText={(val) => onChangeText(val.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={String(max).length}
            editable={!disabled}
            accessibilityLabel={`${label} dalam ${unit}`}
            style={styles.valueInput}
          />
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>

        <Pressable
          onPress={handleIncrement}
          disabled={!canIncrement}
          accessibilityRole="button"
          accessibilityLabel={`Tambah ${label}`}
          accessibilityState={{ disabled: !canIncrement }}
          style={({ pressed }) => [
            styles.stepBtn,
            styles.stepBtnPrimary,
            pressed && canIncrement ? styles.stepBtnPrimaryPressed : null,
            !canIncrement ? styles.stepBtnDisabled : null,
          ]}
        >
          <Icon
            name="add"
            size={20}
            color={canIncrement ? colors.white : colors.muted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.ink,
  },
  helper: {
    ...typography.caption,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.input,
    padding: spacing.xs + 2,
    gap: spacing.sm,
  },
  stepBtn: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    borderRadius: radii.button - 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  stepBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepBtnPressed: {
    backgroundColor: colors.primarySoft,
  },
  stepBtnPrimaryPressed: {
    opacity: 0.88,
  },
  stepBtnDisabled: {
    backgroundColor: colors.canvas,
    borderColor: colors.borderSoft,
    opacity: 0.5,
  },
  centerBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  valueInput: {
    ...typography.subtitle,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    paddingVertical: 0,
  },
  unit: {
    ...typography.label,
    color: colors.slateText,
  },
});
