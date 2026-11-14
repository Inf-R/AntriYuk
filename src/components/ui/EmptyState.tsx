/**
 * EmptyState — ilustrasi, judul, deskripsi, dan tombol opsional.
 * Juga cocok untuk state error (tone error + tombol "Coba lagi").
 *
 * Contoh:
 *   <EmptyState title="Belum ada riwayat"
 *               description="Antrean yang kamu ambil akan muncul di sini." />
 *   <EmptyState illustration="empty" title="Gagal memuat"
 *               description="Periksa koneksi lalu coba lagi."
 *               actionLabel="Coba lagi" onAction={refetch} actionLoading={isFetching} />
 */
import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';
import { Button, ButtonVariant } from './Button';
import { GeoIllustration, GeoVariant } from './GeoIllustration';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Varian GeoIllustration, atau node kustom. Default 'empty'. */
  illustration?: GeoVariant | ReactNode;
  illustrationSize?: number;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

function isGeoVariant(v: unknown): v is GeoVariant {
  return v === 'hero' || v === 'empty' || v === 'success';
}

export function EmptyState({
  title,
  description,
  illustration = 'empty',
  illustrationSize = 140,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  actionLoading = false,
  actionDisabled = false,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {isGeoVariant(illustration) ? (
        <GeoIllustration variant={illustration} size={illustrationSize} />
      ) : (
        illustration
      )}
      <View style={styles.texts} accessible>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <View style={styles.actions}>
          {actionLabel && onAction ? (
            <Button
              label={actionLabel}
              onPress={onAction}
              variant={actionVariant}
              loading={actionLoading}
              disabled={actionDisabled}
            />
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button label={secondaryActionLabel} onPress={onSecondaryAction} variant="ghost" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  texts: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 320,
  },
  title: {
    ...typography.subtitle,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyLg,
    color: colors.slateText,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
});

