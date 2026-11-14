import React, { ComponentRef, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Link, Stack, useRouter } from 'expo-router';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage, isEmailNotConfirmedError } from '@/lib/errors';
import { loginSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';
import { Banner, Button, Card, GeoIllustration, Icon, Input } from '@/components/ui';

const HERO_OVERLAP = 32;

export default function LoginScreen() {
  const router = useRouter();
  const { isOnline } = useOnline();
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={[styles.hero, { paddingTop: insets.top + theme.spacing.xl }]}>
            <View style={styles.heroText}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Icon name="ticket" size={18} color={theme.colors.white} />
                </View>
                <Text style={styles.brandName} accessibilityRole="header">
                  AntriYuk
                </Text>
              </View>
              <Text style={styles.tagline}>Antre dari rumah, datang tepat waktu.</Text>
            </View>
            <GeoIllustration variant="hero" size={128} style={styles.heroArt} />
          </View>

          {/* Form */}
          <Card style={styles.formCard}>
            <OfflineBanner />

            <Text style={styles.title}>Masuk</Text>
            <Text style={styles.subtitle}>
              Gunakan akun Anda untuk mengambil atau mengelola antrean.
            </Text>

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
                label="Email"
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
                label="Kata sandi"
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

            <Link href="/(auth)/lupa-password" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Lupa kata sandi"
                style={({ pressed }) => [styles.forgotLink, pressed ? styles.linkPressed : null]}
              >
                <Text style={styles.linkText}>Lupa kata sandi?</Text>
              </Pressable>
            </Link>

            <Button
              label="Masuk"
              size="l"
              onPress={submit}
              loading={submitting}
              disabled={isActionDisabled}
              accessibilityLabel="Masuk ke akun AntriYuk"
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Belum punya akun?</Text>
              <Link href="/(auth)/daftar" asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Daftar sekarang"
                  style={({ pressed }) => [styles.inlineLink, pressed ? styles.linkPressed : null]}
                >
                  <Text style={styles.linkText}>Daftar sekarang</Text>
                </Pressable>
              </Link>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    backgroundColor: theme.colors.ink,
    borderBottomLeftRadius: theme.radii.sheet,
    borderBottomRightRadius: theme.radii.sheet,
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xl + HERO_OVERLAP,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  heroText: {
    flex: 1,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    ...theme.typography.title,
    color: theme.colors.onInk,
  },
  tagline: {
    ...theme.typography.subtitle,
    fontWeight: '500',
    color: theme.colors.onInkSecondary,
  },
  heroArt: {
    marginRight: -theme.spacing.sm,
  },
  formCard: {
    marginTop: -HERO_OVERLAP,
    marginHorizontal: theme.spacing.screen,
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.title,
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.slateText,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  banner: {
    marginBottom: theme.spacing.lg,
  },
  fields: {
    gap: theme.spacing.lg,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    minHeight: theme.sizes.touchMin,
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  inlineLink: {
    minHeight: theme.sizes.touchMin,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  linkPressed: {
    opacity: 0.6,
  },
  linkText: {
    ...theme.typography.bodyLgStrong,
    color: theme.colors.accent,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  footerText: {
    ...theme.typography.bodyLg,
    color: theme.colors.slateText,
  },
});
