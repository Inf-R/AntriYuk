import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/lib/theme';

export default function IndexRedirectScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>Menyiapkan aplikasi AntriYuk...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
});
