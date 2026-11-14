/**
 * Input — kolom isian dengan label di atas, teks bantuan, pesan error,
 * ikon kiri, dan tombol tampil/sembunyikan sandi (secure).
 * Latar canvas, tinggi 52, fokus berborder accent 2 px, error berborder merah.
 * Semua props TextInput diteruskan (value, onChangeText, onBlur, dll.).
 *
 * Contoh:
 *   <Input label="Email" iconLeft="mail-outline" keyboardType="email-address"
 *          autoCapitalize="none" value={email} onChangeText={setEmail}
 *          error={errors.email} />
 *   <Input label="Kata sandi" iconLeft="lock-closed-outline" secure
 *          helper="Minimal 8 karakter" value={pw} onChangeText={setPw} />
 */
import React, { ComponentRef, Ref, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radii, sizes, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];

export interface InputProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label?: string;
  helper?: string;
  /** Pesan error; bila ada, border merah dan teks error tampil. */
  error?: string | null;
  iconLeft?: IconName;
  /** Kolom sandi dengan tombol tampil/sembunyikan. */
  secure?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

export function Input({
  label,
  helper,
  error,
  iconLeft,
  secure = false,
  containerStyle,
  editable = true,
  onFocus,
  onBlur,
  accessibilityLabel,
  ref,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const hasError = Boolean(error);

  const handleFocus = (e: FocusEvent) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: FocusEvent) => {
    setFocused(false);
    onBlur?.(e);
  };

  const borderColor = hasError ? colors.danger : focused ? colors.accent : 'transparent';

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          { borderColor },
          focused && !hasError ? styles.fieldFocused : null,
          !editable ? styles.fieldDisabled : null,
        ]}
      >
        {iconLeft ? (
          <Icon
            name={iconLeft}
            size={sizes.iconMd}
            color={focused ? colors.accent : colors.muted}
          />
        ) : null}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          secureTextEntry={secure && hidden}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={hasError ? (error ?? undefined) : helper}
          accessibilityState={{ disabled: !editable }}
          style={styles.input}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Tampilkan sandi' : 'Sembunyikan sandi'}
            hitSlop={4}
            style={styles.eye}
          >
            <Icon
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={sizes.iconMd}
              color={colors.slateText}
            />
          </Pressable>
        ) : null}
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
  field: {
    minHeight: sizes.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.canvas,
    borderRadius: radii.input,
    borderWidth: 2,
    paddingLeft: spacing.lg - 2,
    paddingRight: spacing.xs,
  },
  fieldFocused: {
    backgroundColor: colors.white,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  input: {
    ...typography.bodyLg,
    flex: 1,
    minHeight: sizes.inputHeight - 4,
    paddingVertical: 0,
    paddingRight: spacing.sm,
  },
  eye: {
    width: sizes.touchMin - 4,
    height: sizes.touchMin - 4,
    alignItems: 'center',
    justifyContent: 'center',
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
