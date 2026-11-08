import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { theme } from '@/lib/theme';

/**
 * Menampilkan notifikasi meskipun aplikasi sedang terbuka di foreground.
 * [VERIFIKASI: opsi NotificationBehavior perlu diverifikasi di dokumentasi resmi expo-notifications]
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface SessionCheckResult {
  hasActiveSession: boolean;
}

async function checkSupabaseConnection(): Promise<SessionCheckResult> {
  if (!isSupabaseConfigured) {
    throw new Error('MISSING_SUPABASE_ENV');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  return {
    hasActiveSession: data.session !== null,
  };
}

function getEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export default function FeasibilityGateScreen() {
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['supabase-connection-test'],
    queryFn: checkSupabaseConnection,
    retry: false,
  });

  // State autentikasi akun uji (diperlukan karena RPC register_push_token mewajibkan user login)
  const [email, setEmail] = useState('pelanggan.dev@antriyuk.test');
  const [password, setPassword] = useState('PasswordDev123!');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // State pengujian Push Notification
  const [pushLoading, setPushLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('Belum diminta');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [rpcSaveSuccess, setRpcSaveSuccess] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<{
    title: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      setLastNotification({
        title: content.title ?? 'Notifikasi Masuk',
        body: content.body ?? '(Tanpa isi pesan)',
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function handleTestLogin(): Promise<void> {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setAuthError('Gagal masuk ke akun uji. Pastikan npm run seed:dev sudah dijalankan.');
      } else {
        await refetch();
      }
    } catch (err: unknown) {
      setAuthError(getFriendlyErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRequestAndSavePushToken(): Promise<void> {
    setPushLoading(true);
    setPushError(null);
    setRpcSaveSuccess(false);

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notifikasi Antrean AntriYuk',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: theme.colors.primary,
        });
      }

      if (!Device.isDevice) {
        setPushError(
          'Push notification memerlukan perangkat fisik Android (Development Build).'
        );
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus === 'granted' ? 'Diizinkan' : 'Ditolak');

      if (finalStatus !== 'granted') {
        setPushError('Izin notifikasi ditolak. Aktifkan izin notifikasi di pengaturan HP.');
        return;
      }

      const projectId = getEasProjectId();
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const token = tokenResponse.data;
      setExpoPushToken(token);

      // Simpan ke tabel push_tokens lewat RPC register_push_token
      const { error: rpcError } = await supabase.rpc('register_push_token', {
        p_token: token,
      });

      if (rpcError) {
        setPushError(getFriendlyErrorMessage(rpcError));
        return;
      }

      setRpcSaveSuccess(true);
    } catch (err: unknown) {
      setPushError(getFriendlyErrorMessage(err));
    } finally {
      setPushLoading(false);
    }
  }

  const isLoggedIn = Boolean(data?.hasActiveSession);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* KARTU 1: STATUS KONEKSI SUPABASE */}
        <View style={styles.card}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>AY →</Text>
          </View>
          <Text style={styles.title}>AntriYuk — Feasibility Gate</Text>
          <Text style={styles.subtitle}>1. Koneksi & Sesi Supabase</Text>

          {isLoading || isFetching ? (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Memeriksa koneksi ke Supabase...</Text>
            </View>
          ) : error ? (
            <View style={[styles.statusBadge, styles.statusError]}>
              <Text style={styles.statusErrorTitle}>Gagal Terhubung</Text>
              <Text style={styles.statusErrorBody}>{getFriendlyErrorMessage(error)}</Text>
            </View>
          ) : data ? (
            <View style={[styles.statusBadge, styles.statusSuccess]}>
              <Text style={styles.statusSuccessTitle}>Terhubung ke Supabase</Text>
              <Text style={styles.statusSuccessBody}>
                {isLoggedIn
                  ? 'Sesi akun uji aktif (siap menyimpan push token).'
                  : 'Belum login. Masuk ke akun uji di bawah untuk memanggil register_push_token.'}
              </Text>
            </View>
          ) : null}

          {!isLoggedIn ? (
            <View style={styles.loginBox}>
              <Text style={styles.label}>Email Akun Uji</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email akun uji"
                placeholderTextColor={theme.colors.textMuted}
              />
              <Text style={styles.label}>Kata Sandi Akun Uji</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Kata sandi"
                placeholderTextColor={theme.colors.textMuted}
              />
              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={() => {
                  void handleTestLogin();
                }}
                disabled={authLoading}
              >
                <Text style={styles.buttonText}>
                  {authLoading ? 'Sedang Masuk...' : 'Masuk Akun Uji'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* KARTU 2: UJI PUSH NOTIFICATION */}
        <View style={styles.card}>
          <Text style={styles.title}>2. Uji Push Notification</Text>
          <Text style={styles.subtitle}>
            Meminta izin Android, mengambil Expo Push Token, dan menyimpannya lewat RPC
            register_push_token.
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status Izin:</Text>
            <Text style={styles.infoValue}>{permissionStatus}</Text>
          </View>

          {expoPushToken ? (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Expo Push Token (Tekan tahan untuk salin):</Text>
              <Text style={styles.tokenValue} selectable>
                {expoPushToken}
              </Text>
            </View>
          ) : null}

          {rpcSaveSuccess ? (
            <View style={[styles.statusBadge, styles.statusSuccess]}>
              <Text style={styles.statusSuccessTitle}>Token Tersimpan di Database</Text>
              <Text style={styles.statusSuccessBody}>
                RPC register_push_token berhasil dieksekusi. Silakan kirim notifikasi uji dari
                Expo Push Tool.
              </Text>
            </View>
          ) : null}

          {pushError ? (
            <View style={[styles.statusBadge, styles.statusError]}>
              <Text style={styles.statusErrorTitle}>Kendala Push Token</Text>
              <Text style={styles.statusErrorBody}>{pushError}</Text>
            </View>
          ) : null}

          {lastNotification ? (
            <View style={[styles.statusBadge, styles.statusWarning]}>
              <Text style={styles.statusWarningTitle}>
                Notifikasi Diterima: {lastNotification.title}
              </Text>
              <Text style={styles.statusSuccessBody}>{lastNotification.body}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              !isLoggedIn && styles.buttonDisabled,
              pressed && isLoggedIn && styles.buttonPressed,
            ]}
            onPress={() => {
              void handleRequestAndSavePushToken();
            }}
            disabled={!isLoggedIn || pushLoading}
          >
            <Text style={styles.buttonText}>
              {pushLoading
                ? 'Memproses Token...'
                : isLoggedIn
                  ? 'Minta Izin & Simpan Push Token'
                  : 'Masuk Akun Uji Dulu di Atas'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
  },
  logoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryDark,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
    marginBottom: theme.spacing.sm,
  },
  logoText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
    letterSpacing: 1,
  },
  title: {
    ...theme.typography.heading,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  statusBadge: {
    width: '100%',
    borderRadius: theme.radii.card,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statusSuccess: {
    backgroundColor: theme.colors.status.called.background,
  },
  statusSuccessTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.called.text,
    marginBottom: theme.spacing.xs,
  },
  statusSuccessBody: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  statusWarning: {
    backgroundColor: theme.colors.status.approaching.background,
  },
  statusWarningTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.approaching.text,
    marginBottom: theme.spacing.xs,
  },
  statusError: {
    backgroundColor: theme.colors.status.cancelled.background,
  },
  statusErrorTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.cancelled.text,
    marginBottom: theme.spacing.xs,
  },
  statusErrorBody: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  loginBox: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.status.cancelled.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  infoLabel: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  infoValue: {
    ...theme.typography.bodyBold,
  },
  tokenBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tokenLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
  },
  tokenValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
  },
  button: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xs,
  },
  buttonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  buttonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
});
