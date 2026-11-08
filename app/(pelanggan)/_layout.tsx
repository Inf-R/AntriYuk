import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '@/lib/theme';

export default function PelangganLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Beranda Pelanggan' }} />
      <Stack.Screen name="usaha/[id]" options={{ title: 'Detail Usaha' }} />
      <Stack.Screen name="tiket" options={{ title: 'Tiket Antrean Saya' }} />
      <Stack.Screen name="riwayat" options={{ title: 'Riwayat Antrean' }} />
      <Stack.Screen name="profil" options={{ title: 'Profil Pelanggan' }} />
    </Stack>
  );
}

