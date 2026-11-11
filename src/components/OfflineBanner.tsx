import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useOnline } from '@/hooks/useOnline';
import { theme } from '@/lib/theme';

export interface OfflineBannerProps {
  message?: string;
}

export function OfflineBanner({ message }: OfflineBannerProps) {
  const { isOnline } = useOnline();

  if (isOnline) {
    return null;
  }

  return (
    <View
      style={styles.banner}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={
        message ??
        'Anda sedang offline. Beberapa fitur membutuhkan koneksi internet.'
      }
    >
      <Text style={styles.text}>
        {message ??
          'Anda sedang offline. Beberapa fitur membutuhkan koneksi internet.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    backgroundColor: theme.colors.status.approaching.background,
    borderWidth: 1,
    borderColor: theme.colors.status.approaching.text,
    borderRadius: theme.radii.card,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  text: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.approaching.text,
    textAlign: 'center',
  },
});

