import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/lib/theme';

export default function PemilikLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        contentStyle: { backgroundColor: theme.colors.background },
        headerRight: () => (
          <Pressable
            style={styles.profileChip}
            onPress={() => router.push('/(pemilik)/profil')}
          >
            <Text style={styles.profileChipText}>Profil</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="onboarding" options={{ title: 'Pendaftaran Usaha' }} />
      <Stack.Screen name="index" options={{ title: 'Kelola Antrean' }} />
      <Stack.Screen name="ringkasan" options={{ title: 'Ringkasan Harian' }} />
      <Stack.Screen name="pengaturan" options={{ title: 'Pengaturan Usaha' }} />
      <Stack.Screen
        name="profil"
        options={{ title: 'Profil Pemilik', headerRight: () => null }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  profileChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileChipText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
});
