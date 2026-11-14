/**
 * SectionTitle — judul seksi 18 semi-tebal, keterangan opsional,
 * dan tautan aksi di kanan.
 *
 * Contoh:
 *   <SectionTitle title="Usaha terdekat" />
 *   <SectionTitle title="Antrean hari ini" caption="Diperbarui otomatis"
 *                 actionLabel="Lihat semua" onAction={openAll} />
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

export interface SectionTitleProps {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionTitle({ title, caption, actionLabel, onAction, style }: SectionTitleProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.texts}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={12}
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.subtitle,
  },
  caption: {
    ...typography.caption,
  },
  action: {
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  actionLabel: {
    ...typography.bodyLgStrong,
    fontSize: 14,
    color: colors.accent,
  },
});

