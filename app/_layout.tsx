import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { PushPermissionModal } from '@/components/PushPermissionModal';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { SessionProvider, useSession } from '@/hooks/useSession';
import { initSentry } from '@/lib/sentry';
import { theme } from '@/lib/theme';

initSentry();

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, ownerBusinessId, isLoading, isResettingPassword } =
    useSession();
  const {
    showBenefitPrompt,
    isRegistering,
    requestPermissionAndRegister,
    dismissBenefitPrompt,
  } = usePushRegistration();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isResettingPassword) {
      return;
    }

    const firstSegment = segments[0];
    const secondSegment = segments[1];
    const inAuthGroup = firstSegment === '(auth)';
    const inCustomerGroup = firstSegment === '(pelanggan)';
    const inOwnerGroup = firstSegment === '(pemilik)';
    const inPrivacyPolicy = firstSegment === 'kebijakan-privasi';

    // 1. Belum login -> arahkan ke /(auth)/login (izinkan tetap di (auth) atau kebijakan-privasi)
    if (!session) {
      if (!inAuthGroup && !inPrivacyPolicy) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Jika sesi ada namun profil masih dimuat
    if (!profile) {
      return;
    }

    // 2. Pelanggan -> arahkan ke /(pelanggan)
    if (profile.role === 'customer') {
      if (!inCustomerGroup && !inPrivacyPolicy) {
        router.replace('/(pelanggan)');
      }
      return;
    }

    // 3. Pemilik usaha
    if (profile.role === 'owner') {
      if (!ownerBusinessId) {
        // Pemilik tanpa usaha -> arahkan ke /(pemilik)/onboarding (izinkan akses profil untuk tombol Keluar)
        const onAllowedScreen =
          (inOwnerGroup &&
            (secondSegment === 'onboarding' || secondSegment === 'profil')) ||
          inPrivacyPolicy;
        if (!onAllowedScreen) {
          router.replace('/(pemilik)/onboarding');
        }
      } else {
        // Pemilik dengan usaha -> arahkan ke /(pemilik) (index)
        const onOnboarding = inOwnerGroup && secondSegment === 'onboarding';
        if ((!inOwnerGroup && !inPrivacyPolicy) || onOnboarding) {
          router.replace('/(pemilik)');
        }
      }
    }
  }, [
    session,
    profile,
    ownerBusinessId,
    isLoading,
    isResettingPassword,
    segments,
    router,
  ]);

  if (isLoading || (session !== null && profile === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat sesi dan peran akun...</Text>
      </View>
    );
  }

  return (
    <>
      {children}
      <PushPermissionModal
        visible={showBenefitPrompt}
        isLoading={isRegistering}
        onConfirm={() => {
          void requestPermissionAndRegister();
        }}
        onDismiss={dismissBenefitPrompt}
      />
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Coba ulang terbatas maksimal 2 kali dengan jeda eksponensial
            retry: 2,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 4000),
            staleTime: 1000 * 30,
          },
          mutations: {
            // Mutasi (ambil nomor, panggil, batal) tidak diulang otomatis untuk mencegah aksi ganda
            retry: 0,
          },
        },
      })
  );

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style="dark" />
          <NavigationGuard>
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
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(pelanggan)" options={{ headerShown: false }} />
              <Stack.Screen name="(pemilik)" options={{ headerShown: false }} />
              <Stack.Screen
                name="kebijakan-privasi"
                options={{ title: 'Kebijakan Privasi' }}
              />
            </Stack>
          </NavigationGuard>
        </SessionProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
});
