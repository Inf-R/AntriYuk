import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useOnline } from '@/hooks/useOnline';
import { useSession } from '@/hooks/useSession';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { deleteAccountConfirmSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  ListRow,
  Screen,
  ScreenHeader,
  Skeleton,
} from '@/components/ui';

function getInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return 'PL';
  }
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

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
      <Screen header={<ScreenHeader title="Profil" />}>
        <Card style={styles.skeletonCard}>
          <Skeleton width={80} height={80} radius={theme.radii.pill} />
          <Skeleton width="55%" height={22} />
          <Skeleton width="35%" height={28} radius={theme.radii.pill} />
        </Card>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen header={<ScreenHeader title="Profil" />}>
        <OfflineBanner />
        <Card>
          <EmptyState
            illustration="empty"
            title="Gagal Memuat Profil"
            description="Data profil tidak dapat dimuat saat ini."
            actionLabel="Coba Lagi"
            onAction={() => {
              void refreshUserContext();
            }}
          />
        </Card>
      </Screen>
    );
  }

  const initials = getInitials(profile.display_name);

  return (
    <Screen header={<ScreenHeader title="Profil" />}>
      <OfflineBanner />

      <View style={styles.contentStack}>
        {/* Kartu Identitas dengan Avatar Inisial & Chip Peran */}
        <Card style={styles.identityCard}>
          <View
            style={styles.avatarCircle}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Avatar inisial ${profile.display_name}`}
          >
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>

          <Text style={styles.displayName} accessibilityRole="header">
            {profile.display_name}
          </Text>

          <View style={styles.roleChip}>
            <Icon name="person-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.roleChipText}>Pelanggan</Text>
          </View>
        </Card>

        {errorMessage ? <Banner tone="danger" message={errorMessage} /> : null}

        {/* Menu & Aksi Akun */}
        <Card padding="md" style={styles.menuCard}>
          <ListRow
            icon="shield-checkmark-outline"
            title="Kebijakan Privasi"
            subtitle="Pelindungan data pribadi dan hak pengguna"
            onPress={() => router.push('/kebijakan-privasi')}
            disabled={isBusy}
            accessibilityLabel="Baca Kebijakan Privasi AntriYuk"
          />
        </Card>

        <Button
          label="Keluar"
          variant="secondary"
          iconLeft="log-out-outline"
          onPress={() => {
            void handleSignOut();
          }}
          loading={signingOut}
          disabled={isBusy}
          accessibilityLabel="Keluar dari akun"
        />

        {/* ZONA BERBAHAYA: HAPUS AKUN */}
        <Card style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerIconWrap}>
              <Icon
                name="trash-outline"
                size={18}
                color={theme.colors.danger}
              />
            </View>
            <Text style={styles.dangerTitle}>Zona Berbahaya</Text>
          </View>

          <Text style={styles.dangerDescription}>
            Menghapus akun akan menghapus profil, seluruh riwayat tiket antrean,
            serta token notifikasi Anda secara permanen.
          </Text>

          <Button
            label="Hapus Akun Saya"
            variant="dangerOutline"
            onPress={handleOpenDeleteModal}
            disabled={!isOnline || isBusy}
            accessibilityLabel="Hapus akun secara permanen"
          />
        </Card>
      </View>

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
          <Card style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Icon
                name="warning-outline"
                size={26}
                color={theme.colors.danger}
              />
            </View>

            <Text style={styles.modalTitle} accessibilityRole="header">
              Hapus Akun Permanen?
            </Text>
            <Text style={styles.modalDescription}>
              Tindakan ini tidak dapat dibatalkan. Seluruh data profil, tiket
              antrean, dan cache di perangkat ini akan dihapus selamanya.
            </Text>

            <Text style={styles.modalInstruction}>
              Ketik <Text style={styles.modalKeyword}>HAPUS</Text> dengan huruf
              kapital di bawah ini untuk mengonfirmasi:
            </Text>

            {deleteError ? (
              <Banner
                tone="danger"
                message={deleteError}
                style={styles.modalErrorBanner}
              />
            ) : null}

            <Input
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Ketik HAPUS"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
              accessibilityLabel="Kolom konfirmasi ketik HAPUS"
              containerStyle={styles.confirmInputWrap}
            />

            <View style={styles.modalButtons}>
              <Button
                label="Hapus Akun Selamanya"
                variant="dangerOutline"
                iconLeft="trash-outline"
                onPress={() => {
                  void handleConfirmDeleteAccount();
                }}
                loading={deleting}
                disabled={!canConfirmDelete}
                accessibilityLabel="Konfirmasi hapus akun permanen"
              />
              <Button
                label="Batal"
                variant="ghost"
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
                accessibilityLabel="Batalkan penghapusan akun"
              />
            </View>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  contentStack: {
    gap: theme.spacing.lg,
  },
  identityCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 3,
    borderColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
    ...theme.shadows.soft,
  },
  avatarInitials: {
    ...theme.typography.title,
    fontSize: 28,
    color: theme.colors.primary,
  },
  displayName: {
    ...theme.typography.title,
    fontSize: 22,
    textAlign: 'center',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs + 1,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radii.pill,
  },
  roleChipText: {
    ...theme.typography.captionStrong,
    fontSize: 13,
    color: theme.colors.primary,
  },
  menuCard: {
    paddingVertical: theme.spacing.xs,
  },
  dangerCard: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorderSoft,
    gap: theme.spacing.md,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dangerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.status.cancelled.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTitle: {
    ...theme.typography.subtitle,
    fontSize: 16,
    color: theme.colors.statusInk.cancelled,
  },
  dangerDescription: {
    ...theme.typography.body,
    color: theme.colors.slateText,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.screen,
  },
  modalCard: {
    width: '100%',
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.status.cancelled.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.subtitle,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.statusInk.cancelled,
    marginBottom: theme.spacing.xs,
  },
  modalDescription: {
    ...theme.typography.body,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  modalInstruction: {
    ...theme.typography.body,
    marginBottom: theme.spacing.sm,
  },
  modalKeyword: {
    ...theme.typography.bodyBold,
    color: theme.colors.statusInk.cancelled,
  },
  modalErrorBanner: {
    marginBottom: theme.spacing.md,
  },
  confirmInputWrap: {
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    gap: theme.spacing.xs,
  },
});
