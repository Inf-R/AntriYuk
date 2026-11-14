/**
 * ListRow — baris daftar: ikon kiri dalam lingkaran lembut, judul,
 * subjudul, slot kanan, dan chevron bila bisa ditekan. Tinggi min 56.
 *
 * Contoh:
 *   <ListRow icon="person-outline" title="Ubah profil" onPress={goEdit} />
 *   <ListRow icon="log-out-outline" title="Keluar" destructive onPress={confirmLogout} />
 *   <ListRow title="Kopi Senja" subtitle="Hari ini, 09.12"
 *            right={<StatusPill status="done" size="sm" />} />
 */
import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  right?: ReactNode;
  onPress?: () => void;
  /** Tampilkan chevron. Default true bila onPress ada. */
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Garis pemisah bawah. */
  divider?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  title,
  subtitle,
  icon,
  right,
  onPress,
  showChevron,
  destructive = false,
  disabled = false,
  divider = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ListRowProps) {
  const chevron = showChevron ?? Boolean(onPress);
  const titleColor = destructive ? colors.statusInk.cancelled : colors.ink;
  const iconColor = destructive ? colors.danger : colors.accent;
  const iconBg = destructive ? colors.status.cancelled.background : colors.primarySoft;

  const content = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={sizes.iconMd} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {chevron ? <Icon name="chevron-forward" size={18} color={colors.muted} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.row,
          divider ? styles.divider : null,
          pressed ? styles.pressed : null,
          disabled ? styles.disabled : null,
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      style={[styles.row, divider ? styles.divider : null, style]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.canvas,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: sizes.avatar,
    height: sizes.avatar,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyLgStrong,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
  },
});

