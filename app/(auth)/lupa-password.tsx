import React, { useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { forgotPasswordEmailSchema, resetPasswordSchema } from '@/lib/validation';
import { useOnline } from '@/hooks/useOnline';
import { useSession } from '@/hooks/useSession';
import { OfflineBanner } from '@/components/OfflineBanner';
import { theme } from '@/lib/theme';

const RESEND_COOLDOWN_SECONDS = 60;

export default function LupaPasswordScreen() {
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
            <Text style={styles.title}>Atur Ulang Kata Sandi</Text>
            <Text style={styles.subtitle}>
              {step === 'request'
                ? 'Masukkan email akun Anda untuk menerima kode pemulihan 6 angka.'
                : 'Masukkan kode 6 angka dari email beserta kata sandi baru Anda.'}
            </Text>

            {infoMessage ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
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
                editable={!submitting && step === 'request'}
              />
            </View>

            {step === 'request' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && !isActionDisabled && styles.buttonPressed,
                  isActionDisabled && styles.buttonDisabled,
                ]}
                onPress={() => {
                  void handleSendRecoveryCode();
                }}
                disabled={isActionDisabled}
                accessibilityRole="button"
                accessibilityLabel="Kirim kode pemulihan ke email"
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.buttonText}>Kirim Kode Pemulihan</Text>
                )}
              </Pressable>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Kode Pemulihan (6 Angka)</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={code}
                    onChangeText={(val) => setCode(val.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Kata Sandi Baru (Minimal 8 Karakter)</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Masukkan kata sandi baru"
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
                    void handleVerifyAndUpdatePassword();
                  }}
                  disabled={isActionDisabled}
                  accessibilityRole="button"
                  accessibilityLabel="Simpan kata sandi baru"
                >
                  {submitting ? (
                    <ActivityIndicator color={theme.colors.surface} />
                  ) : (
                    <Text style={styles.buttonText}>Simpan Kata Sandi Baru</Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    isResendDisabled && styles.secondaryButtonDisabled,
                    pressed && !isResendDisabled && styles.secondaryButtonPressed,
                  ]}
                  onPress={() => {
                    void handleSendRecoveryCode();
                  }}
                  disabled={isResendDisabled}
                  accessibilityRole="button"
                  accessibilityLabel="Kirim ulang kode pemulihan"
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isResendDisabled && styles.secondaryButtonTextDisabled,
                    ]}
                  >
                    {cooldown > 0
                      ? `Kirim Ulang Kode (${cooldown} dtk)`
                      : 'Kirim Ulang Kode'}
                  </Text>
                </Pressable>
              </>
            )}
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
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
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
  infoBox: {
    backgroundColor: theme.colors.status.called.background,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.status.called.text,
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
  fieldGroup: {
    marginBottom: theme.spacing.md,
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
  otpInput: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    color: theme.colors.textPrimary,
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
  secondaryButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  secondaryButtonPressed: {
    backgroundColor: theme.colors.background,
  },
  secondaryButtonDisabled: {
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  secondaryButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});
