/**
 * ScreenHeader — bilah kepala layar dengan judul di tengah (default) atau kiri,
 * tombol kembali bulat putih berbayangan lembut, subjudul opsional, dan slot aksi kanan.
 *
 * Contoh:
 *   <ScreenHeader title="Antrean Saya" />
 *   <ScreenHeader title="Detail Usaha" onBack={() => router.back()} />
 *   <ScreenHeader title="Buat akun" subtitle="Lengkapi data berikut" align="left" onBack={...} />
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
  /** Posisi judul. Default 'center' sesuai acuan visual. */
  align?: 'center' | 'left';
  /** Bila diisi, tampilkan tombol kembali bulat putih. */
  onBack?: () => void;
  backAccessibilityLabel?: string;
  /** Slot aksi di kanan (mis. IconButton atau pemilih tanggal). */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  align = 'center',
  onBack,
  backAccessibilityLabel = 'Kembali',
  right,
  style,
}: ScreenHeaderProps) {
  if (align === 'left') {
    const showTopBar = Boolean(onBack) || Boolean(right);
    return (
      <View style={[styles.containerLeft, style]}>
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
        <Text style={styles.titleLeft} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitleLeft}>{subtitle}</Text> : null}
      </View>
    );
  }

  const hasSideWidget = Boolean(onBack) || Boolean(right);

  return (
    <View style={[styles.containerCenter, style]}>
      <View style={styles.centerBar}>
        <View style={styles.sideSlotLeft}>
          {onBack ? (
            <IconButton
              icon="chevron-back"
              onPress={onBack}
              accessibilityLabel={backAccessibilityLabel}
            />
          ) : hasSideWidget ? (
            <View style={styles.sideSpacer} />
          ) : null}
        </View>

        <View style={styles.centerTitleWrap}>
          {eyebrow ? (
            <Text style={styles.eyebrowCenter} numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={styles.titleCenter} accessibilityRole="header" numberOfLines={2}>
            {title}
          </Text>
        </View>

        <View style={styles.sideSlotRight}>
          {right ? right : hasSideWidget ? <View style={styles.sideSpacer} /> : null}
        </View>
      </View>

      {subtitle ? <Text style={styles.subtitleCenter}>{subtitle}</Text> : null}
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
  containerCenter: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  centerBar: {
    minHeight: sizes.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sideSlotLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideSlotRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sideSpacer: {
    width: sizes.touchMin,
    height: sizes.touchMin,
  },
  centerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowCenter: {
    ...typography.captionStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  titleCenter: {
    ...typography.subtitle,
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  subtitleCenter: {
    ...typography.bodyLg,
    color: colors.slateText,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  containerLeft: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
  titleLeft: {
    ...typography.title,
  },
  subtitleLeft: {
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
