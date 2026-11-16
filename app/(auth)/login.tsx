import React, { ComponentRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Link, Stack, useRouter } from 'expo-router';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage, isEmailNotConfirmedError } from '@/lib/errors';
import { loginSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';
import {
  Banner,
  Button,
  Card,
  GeoIllustration,
  Icon,
  Input,
  Screen,
} from '@/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { isOnline } = useOnline();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

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

  const submit = () => {
    if (!isActionDisabled) {
      void handleLogin();
    }
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <OfflineBanner />

      {/* Identitas merek, judul utama, dan ilustrasi sesuai acuan visual */}
      <View style={styles.heroSection}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Icon name="people" size={20} color={theme.colors.white} />
          </View>
          <Text style={styles.brandName} accessibilityRole="header">
            AntriYuk
          </Text>
        </View>

        <Text style={styles.heroTitle} accessibilityRole="header">
          Antrean lebih mudah untuk aktivitasmu
        </Text>
        <Text style={styles.heroSubtitle}>
          Solusi antrean digital untuk pelanggan modern.
        </Text>

        <GeoIllustration variant="hero" size={156} style={styles.illustration} />
      </View>

      {/* Kartu Formulir Masuk */}
      <Card style={styles.formCard}>
        {errorMessage ? (
          <Banner
            tone="danger"
            message={errorMessage}
            actionLabel={needsEmailVerification ? 'Masukkan kode verifikasi' : undefined}
            onAction={
              needsEmailVerification
                ? () =>
                    router.push({
                      pathname: '/(auth)/verifikasi',
                      params: { email: email.trim().toLowerCase() },
                    })
                : undefined
            }
            style={styles.banner}
          />
        ) : null}

        <View style={styles.fields}>
          <Input
            label="Alamat Email"
            iconLeft="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
            editable={!submitting}
          />
          <Input
            ref={passwordRef}
            label="Kata Sandi"
            iconLeft="lock-closed-outline"
            secure
            value={password}
            onChangeText={setPassword}
            placeholder="Masukkan kata sandi"
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!submitting}
          />
        </View>

        <Button
          label="Masuk"
          size="l"
          onPress={submit}
          loading={submitting}
          disabled={isActionDisabled}
          accessibilityLabel="Masuk ke akun AntriYuk"
          style={styles.submitButton}
        />

        <View style={styles.footerLinks}>
          <View style={styles.registerRow}>
            <Text style={styles.footerText}>Belum punya akun?</Text>
            <Link href="/(auth)/daftar" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Daftar di sini"
                style={({ pressed }) => [styles.inlineLink, pressed ? styles.linkPressed : null]}
              >
                <Text style={styles.linkText}>Daftar di sini</Text>
              </Pressable>
            </Link>
          </View>

          <Link href="/(auth)/lupa-password" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Lupa password"
              style={({ pressed }) => [styles.forgotLink, pressed ? styles.linkPressed : null]}
            >
              <Text style={styles.linkText}>Lupa password?</Text>
            </Pressable>
          </Link>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
    marginBottom: theme.spacing.md,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    ...theme.typography.title,
    fontSize: 24,
    color: theme.colors.ink,
  },
  heroTitle: {
    ...theme.typography.title,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    maxWidth: 300,
    color: theme.colors.ink,
  },
  heroSubtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.slateText,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    maxWidth: 280,
  },
  illustration: {
    marginTop: theme.spacing.sm,
  },
  formCard: {
    padding: theme.spacing.xl,
  },
  banner: {
    marginBottom: theme.spacing.lg,
  },
  fields: {
    gap: theme.spacing.lg,
  },
  submitButton: {
    marginTop: theme.spacing.xl,
  },
  footerLinks: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  inlineLink: {
    minHeight: theme.sizes.touchMin,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  forgotLink: {
    minHeight: theme.sizes.touchMin,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  linkPressed: {
    opacity: 0.65,
  },
  linkText: {
    ...theme.typography.bodyLgStrong,
    color: theme.colors.accent,
  },
  footerText: {
    ...theme.typography.bodyLg,
    color: theme.colors.slateText,
  },
});
