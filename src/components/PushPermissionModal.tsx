import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Icon } from '@/components/ui';
import { colors, radii, spacing, typography } from '@/lib/theme';

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
        <Card style={styles.card}>
          <View style={styles.iconCircle}>
            <Icon name="notifications" size={30} color={colors.accent} />
          </View>

          <Text style={styles.title} accessibilityRole="header">
            Jangan Lewatkan Giliran Antrean Anda
          </Text>

          <Text style={styles.description}>
            Aktifkan notifikasi agar AntriYuk dapat memberi kabar secara otomatis
            meskipun Anda sedang menutup aplikasi atau berada di rumah:
          </Text>

          <View style={styles.benefitList}>
            <View style={styles.benefitRow}>
              <View style={styles.benefitBadge}>
                <Text style={styles.benefitBullet}>1</Text>
              </View>
              <Text style={styles.benefitText}>
                <Text style={styles.benefitBold}>Peringatan Hampir Tiba:</Text>{' '}
                Pemberitahuan otomatis saat tersisa maksimal 2 orang di depan
                Anda agar Anda bisa mulai bersiap.
              </Text>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitBadge}>
                <Text style={styles.benefitBullet}>2</Text>
              </View>
              <Text style={styles.benefitText}>
                <Text style={styles.benefitBold}>Panggilan Giliran:</Text>{' '}
                Pemberitahuan prioritas tinggi tepat saat nomor Anda dipanggil
                oleh pemilik usaha sebelum masa tunggu habis.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              label="Lanjutkan & Izinkan Notifikasi"
              size="l"
              onPress={onConfirm}
              loading={isLoading}
              disabled={isLoading}
              accessibilityLabel="Lanjutkan dan izinkan notifikasi"
            />
            <Button
              label="Nanti Saja"
              variant="ghost"
              onPress={onDismiss}
              disabled={isLoading}
              accessibilityLabel="Tunda izin notifikasi"
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screen,
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.subtitle,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyLg,
    color: colors.slateText,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  benefitList: {
    width: '100%',
    backgroundColor: colors.canvas,
    borderRadius: radii.tile,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  benefitBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitBullet: {
    ...typography.captionStrong,
    color: colors.primary,
  },
  benefitText: {
    ...typography.body,
    flex: 1,
  },
  benefitBold: {
    ...typography.bodyBold,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
});
