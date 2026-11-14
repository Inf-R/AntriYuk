/**
 * StatusPill — label status berisi ikon kecil + teks (tidak hanya warna).
 * Warna diambil dari colors.status yang sudah ada.
 *
 * Contoh:
 *   <StatusPill status="open" />
 *   <StatusPill status="almost" label="2 lagi" />
 *   <StatusPill status={ticket.status} size="sm" />
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

export type PillStatus =
  | 'open'
  | 'closed'
  | 'waiting'
  | 'almost'
  | 'called'
  | 'done'
  | 'cancelled'
  | 'no_show'
  | 'expired';

interface PillTokens {
  icon: IconName;
  label: string;
  /** Warna ikon. */
  tint: string;
  /** Warna teks (dipastikan kontras untuk teks kecil). */
  text: string;
  background: string;
}

/**
 * Catatan kontras: status.waiting.text (#8D99AE) dan status.approaching.text
 * (#D97706) kurang kontras untuk teks 12-13 px, jadi teks memakai slateText /
 * warna lebih gelap, sedangkan warna status asli tetap dipakai untuk ikon.
 */
const pillTokens: Record<PillStatus, PillTokens> = {
  open: {
    icon: 'radio-button-on',
    label: 'Buka',
    tint: colors.status.called.text,
    text: colors.statusInk.called,
    background: colors.status.called.background,
  },
  closed: {
    icon: 'moon-outline',
    label: 'Tutup',
    tint: colors.muted,
    text: colors.slateText,
    background: colors.canvas,
  },
  waiting: {
    icon: 'time-outline',
    label: 'Menunggu',
    tint: colors.status.waiting.text,
    text: colors.slateText,
    background: colors.status.waiting.background,
  },
  almost: {
    icon: 'hourglass-outline',
    label: 'Hampir giliran',
    tint: colors.status.approaching.text,
    text: colors.statusInk.approaching,
    background: colors.status.approaching.background,
  },
  called: {
    icon: 'megaphone-outline',
    label: 'Dipanggil',
    tint: colors.status.called.text,
    text: colors.statusInk.called,
    background: colors.status.called.background,
  },
  done: {
    icon: 'checkmark-circle',
    label: 'Selesai',
    tint: colors.primary,
    text: colors.primary,
    background: colors.primarySoft,
  },
  cancelled: {
    icon: 'close-circle-outline',
    label: 'Dibatalkan',
    tint: colors.status.cancelled.text,
    text: colors.statusInk.cancelled,
    background: colors.status.cancelled.background,
  },
  no_show: {
    icon: 'person-remove-outline',
    label: 'Tidak hadir',
    tint: colors.status.cancelled.text,
    text: colors.statusInk.cancelled,
    background: colors.status.cancelled.background,
  },
  expired: {
    icon: 'alert-circle-outline',
    label: 'Kedaluwarsa',
    tint: colors.muted,
    text: colors.slateText,
    background: colors.canvas,
  },
};

export interface StatusPillProps {
  status: PillStatus;
  /** Ganti teks bawaan. */
  label?: string;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({
  status,
  label,
  size = 'md',
  accessibilityLabel,
  style,
}: StatusPillProps) {
  const tokens = pillTokens[status];
  const text = label ?? tokens.label;
  const small = size === 'sm';

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `Status: ${text}`}
      style={[
        styles.base,
        small ? styles.sm : styles.md,
        { backgroundColor: tokens.background },
        style,
      ]}
    >
      <Icon name={tokens.icon} size={small ? 12 : 14} color={tokens.tint} />
      <Text style={[styles.label, small ? styles.labelSm : null, { color: tokens.text }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    gap: spacing.xs + 1,
  },
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  sm: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.captionStrong,
    fontSize: 13,
    lineHeight: 18,
  },
  labelSm: {
    fontSize: 12,
    lineHeight: 16,
  },
});
