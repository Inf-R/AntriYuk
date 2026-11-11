import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage, isEmailNotConfirmedError } from '@/lib/errors';
import { loginSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { isOnline } = useOnline();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  async function handleLogin(): Promise<void> {
    setErrorMessage(null);
    setNeedsEmailVerification(false);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setErrorMessage(firstIssue?.message ?? 'Periksa kembali email dan kata sandi Anda.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        setErrorMessage(getFriendlyErrorMessage(error));
        if (isEmailNotConfirmedError(error)) {
          setNeedsEmailVerification(true);
        }
        return;
      }
      // Sesi login otomatis ditangani oleh useSession dan penjaga pintu di app/_layout.tsx
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const isActionDisabled = submitting || !isOnline;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>AY →</Text>
            </View>
            <Text style={styles.title}>Selamat Datang di AntriYuk</Text>
            <Text style={styles.subtitle}>
              Masuk dengan akun Anda untuk mengambil atau mengelola antrean.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                {needsEmailVerification ? (
                  <Pressable
                    style={styles.verifyRedirectButton}
                    onPress={() =>
                      router.push({
                        pathname: '/(auth)/verifikasi',
                        params: { email: email.trim().toLowerCase() },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Masukkan kode verifikasi 6 angka"
                  >
                    <Text style={styles.verifyRedirectText}>
                      Masukkan Kode Verifikasi 6 Angka →
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Alamat Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="nama@email.com"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Kata Sandi</Text>
                <Link href="/(auth)/lupa-password" style={styles.linkText}>
                  Lupa Kata Sandi?
                </Link>
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan kata sandi"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                editable={!submitting}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && !isActionDisabled && styles.buttonPressed,
                isActionDisabled && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleLogin();
              }}
              disabled={isActionDisabled}
              accessibilityRole="button"
              accessibilityLabel="Masuk ke akun AntriYuk"
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Masuk</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Belum punya akun? </Text>
              <Link href="/(auth)/daftar" style={styles.linkText}>
                Daftar sekarang
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
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
    marginBottom: theme.spacing.md,
  },
  logoText: {
    ...theme.typography.subheading,
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
  errorBox: {
    backgroundColor: theme.colors.status.cancelled.background,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.status.cancelled.text,
  },
  verifyRedirectButton: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  verifyRedirectText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    ...theme.typography.bodyBold,
    marginBottom: theme.spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    ...theme.typography.body,
  },
  linkText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  button: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
});
