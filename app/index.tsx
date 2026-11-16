import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GeoIllustration } from '@/components/ui';
import { theme } from '@/lib/theme';

export default function IndexRedirectScreen() {
  return (
    <View style={styles.container}>
      <GeoIllustration variant="hero" size={140} />
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>Menyiapkan aplikasi AntriYuk...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
  },
  text: {
    ...theme.typography.bodyLg,
    color: theme.colors.slateText,
  },
});
