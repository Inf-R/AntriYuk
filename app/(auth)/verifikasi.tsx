import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { verifyOtpSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';
import { Banner, Button, Card, Input, OtpInput, Screen, ScreenHeader } from '@/components/ui';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifikasiScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { isOnline } = useOnline();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    'Kami telah mengirimkan kode verifikasi 6 angka ke email Anda.'
  );

  useEffect(() => {
    if (params.email) {
      setEmail(params.email);
    }
  }, [params.email]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerifyOtp(): Promise<void> {
    setErrorMessage(null);
    setInfoMessage(null);

    const parsed = verifyOtpSchema.safeParse({ email, code });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setErrorMessage(firstIssue?.message ?? 'Masukkan kode 6 angka yang valid.');
      return;
    }

    setSubmitting(true);
    try {
      /**
       * Verifikasi kode OTP pendaftaran menggunakan tipe 'signup'.
       * [VERIFIKASI: tipe 'signup' dan parameter { email, token, type } pada supabase.auth.verifyOtp perlu diverifikasi di dokumentasi resmi Supabase Auth]
       */
      const { error } = await supabase.auth.verifyOtp({
        email: parsed.data.email,
        token: parsed.data.code,
        type: 'signup',
      });

      if (error) {
        setErrorMessage(getFriendlyErrorMessage(error));
        return;
      }
      // Saat berhasil, onAuthStateChange di useSession otomatis mendeteksi sesi dan mengarahkan pengguna
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode(): Promise<void> {
    if (cooldown > 0 || resending) {
      return;
    }
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Masukkan alamat email Anda terlebih dahulu.');
      return;
    }

    setResending(true);
    try {
      /**
       * Mengirim ulang OTP pendaftaran menggunakan supabase.auth.resend({ type: 'signup', email }).
       * [VERIFIKASI: parameter supabase.auth.resend perlu diverifikasi di dokumentasi resmi Supabase Auth]
       */
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
      });

      if (error) {
        setErrorMessage(getFriendlyErrorMessage(error));
        return;
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfoMessage('Kode verifikasi baru telah dikirim ke email Anda.');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  const isVerifyDisabled = submitting || !isOnline;
  const isResendDisabled = cooldown > 0 || resending || !isOnline;

  const resendLabel = resending
    ? 'Mengirim ulang...'
    : cooldown > 0
      ? `Kirim ulang kode dalam ${cooldown} dtk`
      : 'Kirim ulang kode';

  return (
    <Screen
      edges={['top', 'left', 'right', 'bottom']}
      header={
        <ScreenHeader
          title="Cek email Anda"
          subtitle="Masukkan kode 6 angka yang kami kirim untuk mengaktifkan akun."
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <OfflineBanner />

      {infoMessage ? <Banner tone="success" message={infoMessage} style={styles.banner} /> : null}
      {errorMessage ? <Banner tone="danger" message={errorMessage} style={styles.banner} /> : null}

      <Card>
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
            editable={!submitting}
          />
          <OtpInput
            label="Kode verifikasi"
            value={code}
            onChangeText={(val) => setCode(val.replace(/\D/g, '').slice(0, 6))}
            editable={!submitting}
            accessibilityLabel="Kode verifikasi 6 angka"
          />
        </View>

        <Button
          label="Verifikasi akun"
          size="l"
          onPress={() => {
            void handleVerifyOtp();
          }}
          loading={submitting}
          disabled={isVerifyDisabled}
          accessibilityLabel="Verifikasi kode OTP akun"
          style={styles.primaryButton}
        />
      </Card>

      <Button
        label={resendLabel}
        variant="ghost"
        iconLeft={cooldown > 0 ? 'time-outline' : 'refresh'}
        onPress={() => {
          void handleResendCode();
        }}
        loading={resending}
        disabled={isResendDisabled}
        accessibilityLabel="Kirim ulang kode verifikasi ke email"
        accessibilityHint={cooldown > 0 ? `Tersedia dalam ${cooldown} detik` : undefined}
        style={styles.resend}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing.lg,
  },
  fields: {
    gap: theme.spacing.xl,
  },
  primaryButton: {
    marginTop: theme.spacing.xl,
  },
  resend: {
    marginTop: theme.spacing.md,
  },
});
