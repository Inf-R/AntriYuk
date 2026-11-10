import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { theme } from '@/lib/theme';

export default function ProfilPelangganScreen() {
  const { profile, signOut } = useSession();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    setSigningOut(true);
    setErrorMessage(null);
    try {
      await signOut();
      queryClient.clear();
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.card}>
        <Text style={styles.title}>Profil Pelanggan</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Nama Tampilan</Text>
          <Text style={styles.value}>{profile?.display_name ?? '-'}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Peran Akun</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Pelanggan</Text>
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && !signingOut && styles.logoutButtonPressed,
          ]}
          onPress={() => {
            void handleSignOut();
          }}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.logoutButtonText}>Keluar</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    marginBottom: theme.spacing.lg,
  },
  infoBlock: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
  },
  value: {
    ...theme.typography.subheading,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleBadgeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.status.cancelled.text,
    marginBottom: theme.spacing.md,
  },
  logoutButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.status.cancelled.text,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
});
