import React from 'react';
import { StyleSheet } from 'react-native';
import { useOnline } from '@/hooks/useOnline';
import { Banner } from '@/components/ui';
import { spacing } from '@/lib/theme';

export interface OfflineBannerProps {
  message?: string;
}

export function OfflineBanner({ message }: OfflineBannerProps) {
  const { isOnline } = useOnline();

  if (isOnline) {
    return null;
  }

  const text =
    message ?? 'Anda sedang offline. Beberapa fitur membutuhkan koneksi internet.';

  return (
    <Banner
      tone="warning"
      icon="cloud-offline-outline"
      message={text}
      accessibilityLabel={text}
      style={styles.banner}
    />
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: spacing.md,
  },
});
