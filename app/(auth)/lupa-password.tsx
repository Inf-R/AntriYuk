import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { forgotPasswordEmailSchema, resetPasswordSchema } from '@/lib/validation';
import { useOnline } from '@/hooks/useOnline';
import { useSession } from '@/hooks/useSession';
import { OfflineBanner } from '@/components/OfflineBanner';
import { theme } from '@/lib/theme';
import {
  Banner,
  Button,
  Card,
  Input,
  OtpInput,
  Screen,
  ScreenHeader,
  StepIndicator,
} from '@/components/ui';

const RESEND_COOLDOWN_SECONDS = 60;
const STEPS = ['Email', 'Kode', 'Sandi baru'];

export default function LupaPasswordScreen() {
  const router = useRouter();
  const { setIsResettingPassword } = useSession();
  const { isOnline } = useOnline();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSendRecoveryCode(): Promise<void> {
    setErrorMessage(null);
    setInfoMessage(null);

    const parsed = forgotPasswordEmailSchema.safeParse({ email });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setErrorMessage(firstIssue?.message ?? 'Masukkan alamat email yang valid.');
      return;
    }

    setSubmitting(true);
    try {
      /**
       * Mengirim email kode OTP pemulihan kata sandi.
       * [VERIFIKASI: pemanggilan supabase.auth.resetPasswordForEmail perlu diverifikasi di dokumentasi resmi Supabase Auth]
       */
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
      if (error) {
        setErrorMessage(getFriendlyErrorMessage(error));
        return;
      }

      setEmail(parsed.data.email);
      setStep('reset');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfoMessage('Kode pemulihan 6 angka telah dikirim ke email Anda.');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyAndUpdatePassword(): Promise<void> {
    setErrorMessage(null);
    setInfoMessage(null);

    const parsed = resetPasswordSchema.safeParse({
      email,
      code,
      newPassword,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setErrorMessage(firstIssue?.message ?? 'Periksa kembali kode dan kata sandi baru Anda.');
      return;
    }

    setSubmitting(true);
    setIsResettingPassword(true);

    try {
      /**
       * Alur pemulihan kata sandi dengan OTP 6 angka:
       * 1. Verifikasi kode OTP bertipe 'recovery' lewat supabase.auth.verifyOtp.
       * 2. Setelah sesi recovery terbentuk, perbarui kata sandi lewat supabase.auth.updateUser({ password }).
       * [VERIFIKASI: alur verifyOtp(type: 'recovery') lalu updateUser({ password }) perlu diverifikasi di dokumentasi resmi Supabase Auth]
       */
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: parsed.data.email,
        token: parsed.data.code,
        type: 'recovery',
      });

      if (otpError) {
        setIsResettingPassword(false);
        setErrorMessage(getFriendlyErrorMessage(otpError));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.newPassword,
      });

      if (updateError) {
        setIsResettingPassword(false);
        setErrorMessage(getFriendlyErrorMessage(updateError));
        return;
      }

      // Selesai: lepaskan flag agar penjaga pintu di app/_layout.tsx mengarahkan user ke beranda perannya
      setIsResettingPassword(false);
    } catch (err: unknown) {
      setIsResettingPassword(false);
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const isActionDisabled = submitting || !isOnline;
  const isResendDisabled = cooldown > 0 || submitting || !isOnline;

  // Indikator langkah murni turunan tampilan dari state yang sudah ada.
  const currentStep = step === 'request' ? 0 : code.length < 6 ? 1 : 2;

  return (
    <Screen
      edges={['top', 'left', 'right', 'bottom']}
      header={
        <ScreenHeader
          title="Atur ulang kata sandi"
          subtitle={
            step === 'request'
              ? 'Masukkan email akun Anda untuk menerima kode pemulihan 6 angka.'
              : 'Masukkan kode dari email, lalu buat kata sandi baru.'
          }
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <OfflineBanner />

      <StepIndicator steps={STEPS} current={currentStep} style={styles.steps} />

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
            autoComplete="email"
            editable={!submitting && step === 'request'}
          />

          {step === 'reset' ? (
            <>
              <OtpInput
                label="Kode pemulihan"
                value={code}
                onChangeText={(val) => setCode(val.replace(/\D/g, '').slice(0, 6))}
                editable={!submitting}
                accessibilityLabel="Kode pemulihan 6 angka"
              />
              <Input
                label="Kata sandi baru"
                iconLeft="lock-closed-outline"
                secure
                helper="Minimal 8 karakter."
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Buat kata sandi baru"
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!submitting}
              />
            </>
          ) : null}
        </View>

        {step === 'request' ? (
          <Button
            label="Kirim kode pemulihan"
            size="l"
            onPress={() => {
              void handleSendRecoveryCode();
            }}
            loading={submitting}
            disabled={isActionDisabled}
            accessibilityLabel="Kirim kode pemulihan ke email"
            style={styles.primaryButton}
          />
        ) : (
          <Button
            label="Simpan kata sandi baru"
            size="l"
            onPress={() => {
              void handleVerifyAndUpdatePassword();
            }}
            loading={submitting}
            disabled={isActionDisabled}
            accessibilityLabel="Simpan kata sandi baru"
            style={styles.primaryButton}
          />
        )}
      </Card>

      {step === 'reset' ? (
        <Button
          label={cooldown > 0 ? `Kirim ulang kode dalam ${cooldown} dtk` : 'Kirim ulang kode'}
          variant="ghost"
          iconLeft={cooldown > 0 ? 'time-outline' : 'refresh'}
          onPress={() => {
            void handleSendRecoveryCode();
          }}
          disabled={isResendDisabled}
          accessibilityLabel="Kirim ulang kode pemulihan"
          accessibilityHint={cooldown > 0 ? `Tersedia dalam ${cooldown} detik` : undefined}
          style={styles.resend}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: {
    marginBottom: theme.spacing.xl,
  },
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
