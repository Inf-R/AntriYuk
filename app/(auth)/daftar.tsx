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
import { supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { registerSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';
import type { ProfileRole } from '@/types/database';

export default function DaftarScreen() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ProfileRole>('customer');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegister(): Promise<void> {
    setErrorMessage(null);

    const parsed = registerSchema.safeParse({
      displayName,
      email,
      password,
      role,
      acceptedPrivacy,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setErrorMessage(firstIssue?.message ?? 'Mohon periksa kembali data pendaftaran Anda.');
      return;
    }

    setSubmitting(true);
    try {
      /**
       * Pendaftaran mengirimkan role dan display_name lewat options.data.
       * Baris di tabel public.profiles dibuat otomatis oleh trigger database private.handle_new_user().
       * [VERIFIKASI: opsi options.data pada supabase.auth.signUp perlu diverifikasi di dokumentasi resmi Supabase Auth]
       */
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            role: parsed.data.role,
            display_name: parsed.data.displayName,
          },
        },
      });

      if (error) {
        setErrorMessage(getFriendlyErrorMessage(error));
        return;
      }

      // Bila konfirmasi email aktif, Supabase mengembalikan session = null sampai OTP diverifikasi
      if (!data.session) {
        router.push({
          pathname: '/(auth)/verifikasi',
          params: { email: parsed.data.email },
        });
      }
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Buat Akun Baru</Text>
            <Text style={styles.subtitle}>
              Isi data berikut untuk mulai menggunakan layanan antrean digital AntriYuk.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama Tampilan</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={50}
                editable={!submitting}
              />
            </View>

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
              <Text style={styles.label}>Kata Sandi (Minimal 8 Karakter)</Text>
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

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Daftar Sebagai</Text>
              <View style={styles.roleRow}>
                <Pressable
                  style={[
                    styles.rolePill,
                    role === 'customer' && styles.rolePillActive,
                  ]}
                  onPress={() => setRole('customer')}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.rolePillText,
                      role === 'customer' && styles.rolePillTextActive,
                    ]}
                  >
                    Pelanggan
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.rolePill,
                    role === 'owner' && styles.rolePillActive,
                  ]}
                  onPress={() => setRole('owner')}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.rolePillText,
                      role === 'owner' && styles.rolePillTextActive,
                    ]}
                  >
                    Pemilik Usaha
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Peran akun bersifat tetap dan tidak dapat diubah setelah pendaftaran.
              </Text>
            </View>

            <View style={styles.privacyRow}>
              <Pressable
                style={[
                  styles.checkbox,
                  acceptedPrivacy && styles.checkboxChecked,
                ]}
                onPress={() => setAcceptedPrivacy((prev) => !prev)}
                disabled={submitting}
              >
                {acceptedPrivacy ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
              <Text style={styles.privacyText}>
                Saya menyetujui{' '}
                <Link href="/kebijakan-privasi" style={styles.linkText}>
                  Kebijakan Privasi
                </Link>{' '}
                AntriYuk.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && !submitting && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleRegister();
              }}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Daftar & Kirim Kode Verifikasi</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Sudah punya akun? </Text>
              <Link href="/(auth)/login" style={styles.linkText}>
                Masuk di sini
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
  roleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rolePill: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  rolePillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rolePillText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  rolePillTextActive: {
    color: theme.colors.surface,
  },
  helperText: {
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  privacyText: {
    flex: 1,
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
