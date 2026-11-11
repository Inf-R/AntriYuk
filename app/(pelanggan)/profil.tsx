import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useOnline } from '@/hooks/useOnline';
import { useSession } from '@/hooks/useSession';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { deleteAccountConfirmSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';

export default function ProfilPelangganScreen() {
  const router = useRouter();
  const { profile, isLoading, refreshUserContext, signOut, deleteAccount } =
    useSession();
  const { isOnline } = useOnline();
  const queryClient = useQueryClient();

  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isBusy = signingOut || deleting;
  const confirmParsed = deleteAccountConfirmSchema.safeParse({ confirmText });
  const canConfirmDelete = confirmParsed.success && isOnline && !isBusy;

  async function handleSignOut(): Promise<void> {
    if (isBusy) {
      return;
    }
    setSigningOut(true);
    setErrorMessage(null);
    try {
      await signOut();
      queryClient.clear();
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setSigningOut(false);
    }
  }

  function handleOpenDeleteModal(): void {
    if (isBusy) {
      return;
    }
    setConfirmText('');
    setDeleteError(null);
    setShowDeleteModal(true);
  }

  async function handleConfirmDeleteAccount(): Promise<void> {
    const parsed = deleteAccountConfirmSchema.safeParse({ confirmText });
    if (!parsed.success) {
      setDeleteError(
        parsed.error.issues[0]?.message ??
          'Ketik HAPUS untuk mengonfirmasi penghapusan akun.'
      );
      return;
    }
    if (!isOnline || isBusy) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      queryClient.clear();
      setShowDeleteModal(false);
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      setDeleteError(getFriendlyErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.mutedText}>Memuat profil Anda...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Gagal Memuat Profil</Text>
          <Text style={styles.mutedText}>
            Data profil tidak dapat dimuat saat ini.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => {
              void refreshUserContext();
            }}
            accessibilityRole="button"
            accessibilityLabel="Coba muat ulang profil"
          >
            <Text style={styles.primaryButtonText}>Coba Lagi</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OfflineBanner />

        <View style={styles.card}>
          <Text style={styles.title}>Profil Pelanggan</Text>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Nama Tampilan</Text>
            <Text style={styles.value}>{profile.display_name}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Peran Akun</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Pelanggan</Text>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.privacyButton,
              pressed && !isBusy && styles.privacyButtonPressed,
            ]}
            onPress={() => router.push('/kebijakan-privasi')}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Baca Kebijakan Privasi AntriYuk"
          >
            <Text style={styles.privacyButtonText}>Kebijakan Privasi</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && !isBusy && styles.logoutButtonPressed,
              isBusy && styles.buttonDisabled,
            ]}
            onPress={() => {
              void handleSignOut();
            }}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun"
          >
            {signingOut ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.logoutButtonText}>Keluar</Text>
            )}
          </Pressable>
        </View>

        {/* ZONA BERBAHAYA: HAPUS AKUN */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Penghapusan Akun</Text>
          <Text style={styles.dangerDescription}>
            Menghapus akun akan menghapus profil, seluruh riwayat tiket antrean,
            serta token notifikasi Anda secara permanen.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.deleteTriggerButton,
              (!isOnline || isBusy) && styles.deleteTriggerDisabled,
              pressed && isOnline && !isBusy && styles.deleteTriggerPressed,
            ]}
            onPress={handleOpenDeleteModal}
            disabled={!isOnline || isBusy}
            accessibilityRole="button"
            accessibilityLabel="Hapus akun secara permanen"
          >
            <Text
              style={[
                styles.deleteTriggerText,
                (!isOnline || isBusy) && styles.deleteTriggerTextDisabled,
              ]}
            >
              Hapus Akun Saya
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* MODAL KONFIRMASI DUA TAHAP (KETIK HAPUS) */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hapus Akun Permanen?</Text>
            <Text style={styles.modalDescription}>
              Tindakan ini tidak dapat dibatalkan. Seluruh data profil, tiket
              antrean, dan cache di perangkat ini akan dihapus selamanya.
            </Text>

            <Text style={styles.modalInstruction}>
              Ketik <Text style={styles.modalKeyword}>HAPUS</Text> dengan huruf
              kapital di bawah ini untuk mengonfirmasi:
            </Text>

            {deleteError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.confirmInput}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Ketik HAPUS"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
              accessibilityLabel="Kolom konfirmasi ketik HAPUS"
            />

            <Pressable
              style={({ pressed }) => [
                styles.confirmDeleteButton,
                !canConfirmDelete && styles.buttonDisabled,
                pressed && canConfirmDelete && styles.logoutButtonPressed,
              ]}
              onPress={() => {
                void handleConfirmDeleteAccount();
              }}
              disabled={!canConfirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Konfirmasi hapus akun permanen"
            >
              {deleting ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.logoutButtonText}>
                  Hapus Akun Selamanya
                </Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.cancelModalButton,
                pressed && !deleting && styles.privacyButtonPressed,
              ]}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel="Batalkan penghapusan akun"
            >
              <Text style={styles.cancelModalText}>Batal</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  mutedText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  card: {
    width: '100%',
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
  errorTitle: {
    ...theme.typography.subheading,
    color: theme.colors.status.cancelled.text,
    textAlign: 'center',
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
  primaryButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  primaryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
  privacyButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  privacyButtonPressed: {
    backgroundColor: theme.colors.background,
  },
  privacyButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  logoutButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primaryDark,
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
  buttonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  dangerCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.status.cancelled.text,
    padding: theme.spacing.xl,
  },
  dangerTitle: {
    ...theme.typography.subheading,
    color: theme.colors.status.cancelled.text,
    marginBottom: theme.spacing.xs,
  },
  dangerDescription: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  deleteTriggerButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    borderRadius: theme.radii.card,
    borderWidth: 1.5,
    borderColor: theme.colors.status.cancelled.text,
    backgroundColor: theme.colors.status.cancelled.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteTriggerPressed: {
    opacity: 0.85,
  },
  deleteTriggerDisabled: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  deleteTriggerText: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.cancelled.text,
  },
  deleteTriggerTextDisabled: {
    color: theme.colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(43, 45, 66, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
  },
  modalTitle: {
    ...theme.typography.heading,
    color: theme.colors.status.cancelled.text,
    marginBottom: theme.spacing.sm,
  },
  modalDescription: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  modalInstruction: {
    ...theme.typography.body,
    marginBottom: theme.spacing.sm,
  },
  modalKeyword: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.cancelled.text,
  },
  confirmInput: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    ...theme.typography.bodyBold,
    marginBottom: theme.spacing.lg,
  },
  confirmDeleteButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.status.cancelled.text,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cancelModalButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
});
