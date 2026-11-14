import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Link, Stack, useRouter } from 'expo-router';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { supabase } from '@/lib/supabase';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { registerSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';
import type { ProfileRole } from '@/types/database';
import { Banner, Button, Card, Icon, IconName, Input, Screen, ScreenHeader } from '@/components/ui';

interface RoleOption {
  value: ProfileRole;
  title: string;
  description: string;
  icon: IconName;
  a11y: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'customer',
    title: 'Pelanggan',
    description: 'Ambil nomor antrean dan pantau giliran dari mana saja.',
    icon: 'person-outline',
    a11y: 'Daftar sebagai Pelanggan',
  },
  {
    value: 'owner',
    title: 'Pemilik Usaha',
    description: 'Buka antrean untuk usaha Anda dan panggil pelanggan.',
    icon: 'storefront-outline',
    a11y: 'Daftar sebagai Pemilik Usaha',
  },
];

export default function DaftarScreen() {
  const router = useRouter();
  const { isOnline } = useOnline();

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

  const isActionDisabled = submitting || !isOnline;

  return (
    <Screen
      edges={['top', 'left', 'right', 'bottom']}
      header={
        <ScreenHeader
          title="Buat akun"
          subtitle="Cukup beberapa langkah untuk mulai memakai AntriYuk."
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <OfflineBanner />

      <Card style={styles.card}>
        <View style={styles.fields}>
          <Input
            label="Nama tampilan"
            iconLeft="person-outline"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Contoh: Budi Santoso"
            maxLength={50}
            autoComplete="name"
            textContentType="name"
            editable={!submitting}
          />
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
            editable={!submitting}
          />
          <Input
            label="Kata sandi"
            iconLeft="lock-closed-outline"
            secure
            helper="Minimal 8 karakter."
            value={password}
            onChangeText={setPassword}
            placeholder="Buat kata sandi"
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!submitting}
          />
        </View>
      </Card>

      <Text style={styles.sectionLabel} accessibilityRole="header">
        Daftar sebagai
      </Text>
      <View style={styles.roleList} accessibilityRole="radiogroup">
        {ROLE_OPTIONS.map((opt) => {
          const selected = role === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setRole(opt.value)}
              disabled={submitting}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected, disabled: submitting }}
              accessibilityLabel={opt.a11y}
              accessibilityHint={opt.description}
              style={({ pressed }) => [
                styles.roleCard,
                selected ? styles.roleCardSelected : null,
                pressed && !selected ? styles.roleCardPressed : null,
              ]}
            >
              <View style={[styles.roleIcon, selected ? styles.roleIconSelected : null]}>
                <Icon
                  name={opt.icon}
                  size={24}
                  color={selected ? theme.colors.white : theme.colors.accent}
                />
              </View>
              <View style={styles.roleTexts}>
                <Text style={styles.roleTitle}>{opt.title}</Text>
                <Text style={styles.roleDesc}>{opt.description}</Text>
              </View>
              <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.helperRow}>
        <Icon name="information-circle-outline" size={16} color={theme.colors.slateText} />
        <Text style={styles.helperText}>
          Peran akun bersifat tetap dan tidak dapat diubah setelah pendaftaran.
        </Text>
      </View>

      <View style={styles.privacyRow}>
        <Pressable
          onPress={() => setAcceptedPrivacy((prev) => !prev)}
          disabled={submitting}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedPrivacy, disabled: submitting }}
          accessibilityLabel="Setujui Kebijakan Privasi AntriYuk"
          style={styles.checkboxHit}
        >
          <View style={[styles.checkbox, acceptedPrivacy ? styles.checkboxChecked : null]}>
            {acceptedPrivacy ? (
              <Icon name="checkmark" size={16} color={theme.colors.white} />
            ) : null}
          </View>
        </Pressable>
        <Text style={styles.privacyText}>
          Saya menyetujui{' '}
          <Link href="/kebijakan-privasi" style={styles.linkText}>
            Kebijakan Privasi
          </Link>{' '}
          AntriYuk.
        </Text>
      </View>

      {errorMessage ? <Banner tone="danger" message={errorMessage} style={styles.banner} /> : null}

      <Button
        label="Daftar & kirim kode verifikasi"
        size="l"
        onPress={() => {
          void handleRegister();
        }}
        loading={submitting}
        disabled={isActionDisabled}
        accessibilityLabel="Daftar dan kirim kode verifikasi"
      />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Sudah punya akun?</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Masuk di sini"
            style={({ pressed }) => [styles.inlineLink, pressed ? styles.linkPressed : null]}
          >
            <Text style={styles.linkText}>Masuk di sini</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.xl,
  },
  fields: {
    gap: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.md,
  },
  roleList: {
    gap: theme.spacing.md,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md + 2,
    padding: theme.spacing.lg,
    minHeight: 88,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.white,
    ...theme.shadows.soft,
  },
  roleCardSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.accent,
  },
  roleCardPressed: {
    borderColor: theme.colors.primarySoft,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.tile,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconSelected: {
    backgroundColor: theme.colors.accent,
  },
  roleTexts: {
    flex: 1,
    gap: 2,
  },
  roleTitle: {
    ...theme.typography.bodyLgStrong,
    fontSize: 16,
  },
  roleDesc: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: theme.radii.pill,
    borderWidth: 2,
    borderColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  radioSelected: {
    borderColor: theme.colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs + 2,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  helperText: {
    ...theme.typography.caption,
    flex: 1,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    marginLeft: -theme.spacing.md,
  },
  checkboxHit: {
    width: theme.sizes.touchMin,
    height: theme.sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.muted,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  privacyText: {
    ...theme.typography.bodyLg,
    flex: 1,
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
