import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '@/lib/theme';

export interface PushPermissionModalProps {
  visible: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Layar penjelasan manfaat notifikasi sebelum memunculkan dialog izin sistem Android.
 */
export function PushPermissionModal({
  visible,
  isLoading,
  onConfirm,
  onDismiss,
}: PushPermissionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconSymbol}>🔔</Text>
          </View>

          <Text style={styles.title}>
            Jangan Lewatkan Giliran Antrean Anda
          </Text>

          <Text style={styles.description}>
            Aktifkan notifikasi agar AntriYuk dapat memberi kabar secara otomatis
            meskipun Anda sedang menutup aplikasi atau berada di rumah:
          </Text>

          <View style={styles.benefitList}>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitBullet}>1.</Text>
              <Text style={styles.benefitText}>
                <Text style={styles.benefitBold}>Peringatan Hampir Tiba:</Text>{' '}
                Pemberitahuan otomatis saat tersisa maksimal 2 orang di depan
                Anda agar Anda bisa mulai bersiap.
              </Text>
            </View>

            <View style={styles.benefitRow}>
              <Text style={styles.benefitBullet}>2.</Text>
              <Text style={styles.benefitText}>
                <Text style={styles.benefitBold}>Panggilan Giliran:</Text>{' '}
                Pemberitahuan prioritas tinggi tepat saat nomor Anda dipanggil
                oleh pemilik usaha sebelum masa tunggu habis.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !isLoading && styles.primaryButtonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>
                Lanjutkan & Izinkan Notifikasi
              </Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !isLoading && styles.secondaryButtonPressed,
            ]}
            onPress={onDismiss}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Nanti Saja</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43, 45, 66, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconSymbol: {
    fontSize: 28,
  },
  title: {
    ...theme.typography.heading,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  benefitList: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  benefitBullet: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
  },
  benefitText: {
    ...theme.typography.body,
    flex: 1,
  },
  benefitBold: {
    ...theme.typography.bodyBold,
  },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  primaryButtonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  primaryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
    textAlign: 'center',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 46,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: theme.colors.background,
  },
  secondaryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textMuted,
  },
});

