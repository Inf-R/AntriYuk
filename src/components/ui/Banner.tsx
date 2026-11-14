/**
 * Banner — pesan sebaris dengan ikon. Nada: info, warning, success, danger.
 * Aksi opsional (mis. "Coba lagi") ditampilkan sebagai tautan di kanan bawah.
 *
 * Contoh:
 *   <Banner tone="warning" title="Kamu sedang offline"
 *           message="Data terakhir tetap bisa dilihat." />
 *   <Banner tone="danger" message="Gagal memuat." actionLabel="Coba lagi" onAction={refetch} />
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

export type BannerTone = 'info' | 'warning' | 'success' | 'danger';

export interface BannerProps {
  tone?: BannerTone;
  title?: string;
  message: string;
  /** Ganti ikon bawaan nada. */
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

interface ToneTokens {
  icon: IconName;
  iconColor: string;
  background: string;
  border: string;
  title: string;
}

const toneTokens: Record<BannerTone, ToneTokens> = {
  info: {
    icon: 'information-circle',
    iconColor: colors.accent,
    background: colors.primarySoft,
    border: 'rgba(50, 109, 218, 0.18)',
    title: colors.primary,
  },
  warning: {
    icon: 'warning',
    iconColor: colors.status.approaching.text,
    background: colors.status.approaching.background,
    border: 'rgba(217, 119, 6, 0.22)',
    title: colors.statusInk.approaching,
  },
  success: {
    icon: 'checkmark-circle',
    iconColor: colors.status.called.text,
    background: colors.status.called.background,
    border: 'rgba(5, 150, 105, 0.2)',
    title: colors.statusInk.called,
  },
  danger: {
    icon: 'alert-circle',
    iconColor: colors.status.cancelled.text,
    background: colors.status.cancelled.background,
    border: 'rgba(220, 38, 38, 0.2)',
    title: colors.statusInk.cancelled,
  },
};

export function Banner({
  tone = 'info',
  title,
  message,
  icon,
  actionLabel,
  onAction,
  actionDisabled = false,
  accessibilityLabel,
  style,
}: BannerProps) {
  const t = toneTokens[tone];
  const urgent = tone === 'warning' || tone === 'danger';

  return (
    <View
      accessibilityRole={urgent ? 'alert' : undefined}
      accessibilityLiveRegion={urgent ? 'polite' : 'none'}
      style={[styles.base, { backgroundColor: t.background, borderColor: t.border }, style]}
    >
      <View style={styles.iconWrap}>
        <Icon name={icon ?? t.icon} size={20} color={t.iconColor} />
      </View>
      <View style={styles.body}>
        <View accessible accessibilityLabel={accessibilityLabel ?? [title, message].filter(Boolean).join('. ')}>
          {title ? <Text style={[styles.title, { color: t.title }]}>{title}</Text> : null}
          <Text style={styles.message}>{message}</Text>
        </View>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            disabled={actionDisabled}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            accessibilityState={{ disabled: actionDisabled }}
            hitSlop={12}
            style={({ pressed }) => [
              styles.action,
              pressed ? styles.actionPressed : null,
              actionDisabled ? styles.actionDisabled : null,
            ]}
          >
            <Text style={[styles.actionLabel, { color: t.title }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.tile,
    borderWidth: 1,
  },
  iconWrap: {
    paddingTop: 1,
  },
  body: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyLgStrong,
    marginBottom: 2,
  },
  message: {
    ...typography.body,
    color: colors.ink,
  },
  action: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    ...typography.bodyLgStrong,
    textDecorationLine: 'underline',
  },
});

