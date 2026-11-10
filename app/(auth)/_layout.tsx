import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Masuk ke AntriYuk' }} />
      <Stack.Screen name="daftar" options={{ title: 'Daftar Akun' }} />
      <Stack.Screen name="verifikasi" options={{ title: 'Verifikasi Kode Email' }} />
      <Stack.Screen name="lupa-password" options={{ title: 'Lupa Kata Sandi' }} />
    </Stack>
  );
}
