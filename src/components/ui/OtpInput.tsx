/**
 * OtpInput — enam kotak kode yang terpisah secara visual, dikendalikan oleh
 * satu TextInput tersembunyi yang menutupi kotak (ketuk di mana saja untuk
 * fokus, tempel kode juga didukung). Nilai dan pembersihan karakter tetap
 * diurus oleh layar lewat value / onChangeText.
 *
 * Contoh:
 *   <OtpInput label="Kode verifikasi" value={code}
 *             onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
 *             editable={!submitting} />
 */
import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';
import { Icon } from './Icon';

export interface OtpInputProps {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  label?: string;
  helper?: string;
  error?: string | null;
  editable?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function OtpInput({
  value,
  onChangeText,
  length = 6,
  label,
  helper,
  error,
  editable = true,
  autoFocus = false,
  onSubmitEditing,
  accessibilityLabel,
  style,
}: OtpInputProps) {
  const [focused, setFocused] = useState(false);
  const digits = value.split('').slice(0, length);
  const activeIndex = Math.min(digits.length, length - 1);
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const char = digits[i] ?? '';
          const isActive = focused && i === activeIndex;
          const isFilled = char !== '';
          return (
            <View
              key={i}
              style={[
                styles.box,
                isFilled ? styles.boxFilled : null,
                isActive ? styles.boxActive : null,
                hasError ? styles.boxError : null,
                !editable ? styles.boxDisabled : null,
              ]}
            >
              {isFilled ? (
                <Text style={styles.digit}>{char}</Text>
              ) : isActive ? (
                <View style={styles.caret} />
              ) : null}
            </View>
          );
        })}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          maxLength={length}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          editable={editable}
          caretHidden
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={accessibilityLabel ?? label ?? `Kode ${length} angka`}
          accessibilityHint={hasError ? (error ?? undefined) : `${digits.length} dari ${length} angka terisi`}
          style={styles.hiddenInput}
        />
      </View>
      {hasError ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
  },
  label: {
    ...typography.label,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    position: 'relative',
  },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 58,
    borderRadius: radii.input,
    backgroundColor: colors.canvas,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    backgroundColor: colors.white,
    borderColor: colors.primarySoft,
  },
  boxActive: {
    backgroundColor: colors.white,
    borderColor: colors.accent,
  },
  boxError: {
    borderColor: colors.danger,
  },
  boxDisabled: {
    opacity: 0.6,
  },
  digit: {
    ...typography.subtitle,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  caret: {
    width: 2,
    height: 24,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.011,
    color: 'transparent',
    fontSize: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.statusInk.cancelled,
    flex: 1,
  },
  helper: {
    ...typography.caption,
  },
});
