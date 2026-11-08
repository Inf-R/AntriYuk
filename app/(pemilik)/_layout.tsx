import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '@/lib/theme';

export default function PemilikLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="onboarding" options={{ title: 'Pendaftaran Usaha' }} />
      <Stack.Screen name="index" options={{ title: 'Kelola Antrean' }} />
      <Stack.Screen name="ringkasan" options={{ title: 'Ringkasan Harian' }} />
      <Stack.Screen name="pengaturan" options={{ title: 'Pengaturan Usaha' }} />
      <Stack.Screen name="profil" options={{ title: 'Profil Pemilik' }} />
    </Stack>
  );
}

