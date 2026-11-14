/**
 * ScreenHeader — judul besar, subjudul opsional, tombol kembali bulat putih
 * berbayangan lembut, dan slot aksi di kanan.
 *
 * Contoh:
 *   <ScreenHeader title="Riwayat" subtitle="Antrean yang pernah kamu ambil" />
 *   <ScreenHeader title="Detail Usaha" onBack={() => router.back()}
 *                 right={<IconButton icon="share-outline" ... />} />
 */
import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, sizes, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Teks kecil di atas judul, mis. nama usaha. */
  eyebrow?: string;
  /** Bila diisi, tampilkan tombol kembali. */
  onBack?: () => void;
  backAccessibilityLabel?: string;
  /** Slot aksi di kanan (mis. IconButton). */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backAccessibilityLabel = 'Kembali',
  right,
  style,
}: ScreenHeaderProps) {
  const showTopBar = Boolean(onBack) || Boolean(right);

  return (
    <View style={[styles.container, style]}>
      {showTopBar ? (
        <View style={styles.topBar}>
          {onBack ? (
            <IconButton
              icon="chevron-back"
              onPress={onBack}
              accessibilityLabel={backAccessibilityLabel}
            />
          ) : (
            <View />
          )}
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      ) : null}
      {eyebrow ? (
        <Text style={styles.eyebrow} numberOfLines={1}>
          {eyebrow}
        </Text>
      ) : null}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  /** Warna ikon. Default ink. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * IconButton — tombol bulat putih 48 px berbayangan lembut.
 *
 * Contoh:
 *   <IconButton icon="refresh" onPress={refetch} accessibilityLabel="Muat ulang" />
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled = false,
  color = colors.ink,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        pressed ? styles.iconButtonPressed : null,
        disabled ? styles.iconButtonDisabled : null,
        style,
      ]}
    >
      <Icon name={icon} size={sizes.iconLg - 2} color={disabled ? colors.muted : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.captionStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.slateText,
    marginTop: spacing.xs,
  },
  iconButton: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  iconButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  iconButtonDisabled: {
    opacity: 0.6,
  },
});

