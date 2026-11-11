import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBusinessDetail, useTakeTicket } from '@/hooks/useCustomerQueue';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { BUSINESS_CATEGORIES } from '@/lib/validation';
import { theme } from '@/lib/theme';

export default function DetailUsahaScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { isOnline } = useOnline();

  const { data, isLoading, isRefetching, error, refetch } =
    useBusinessDetail(id);
  const takeTicketMutation = useTakeTicket();
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.mutedText}>Memuat informasi usaha...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <OfflineBanner />
        <View style={styles.centerBox}>
          <View style={styles.card}>
            <Text style={styles.errorTitle}>Gagal Memuat Detail Usaha</Text>
            <Text style={styles.errorBody}>
              {error
                ? getFriendlyErrorMessage(error)
                : 'Data usaha tidak ditemukan.'}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                void refetch();
              }}
              accessibilityRole="button"
              accessibilityLabel="Coba muat ulang detail usaha"
            >
              <Text style={styles.buttonText}>Coba Lagi</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const { business, waitingCount, currentNumber, sessionStatus, hasActiveTicketHere } =
    data;
  const isQueueOpen = sessionStatus === 'open' && business.is_queue_open;
  const isSubmitting = takeTicketMutation.isPending;
  const canTakeTicket =
    isOnline && isQueueOpen && !hasActiveTicketHere && !isSubmitting;

  const categoryLabel =
    BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.label ??
    business.category;

  async function handleTakeTicket(): Promise<void> {
    if (!canTakeTicket) {
      return;
    }
    setActionError(null);
    try {
      await takeTicketMutation.mutateAsync(business.id);
      router.navigate('/(pelanggan)/tiket');
    } catch (err: unknown) {
      setActionError(getFriendlyErrorMessage(err));
      void refetch();
    }
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            colors={[theme.colors.primary]}
          />
        }
      >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{business.name}</Text>
            <Text style={styles.category}>{categoryLabel}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isQueueOpen ? styles.statusOpen : styles.statusClosed,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isQueueOpen ? styles.statusOpenText : styles.statusClosedText,
              ]}
            >
              {isQueueOpen ? 'Buka' : 'Tutup'}
            </Text>
          </View>
        </View>

        <Text style={styles.address}>
          {business.address && business.address.trim().length > 0
            ? business.address
            : 'Alamat belum dicantumkan'}
        </Text>

        {/* METRIK ANTREAN HARI INI */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Sedang Dilayani</Text>
            <Text style={styles.metricValue}>{currentNumber}</Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Jumlah Menunggu</Text>
            <Text style={styles.metricValue}>{waitingCount}</Text>
          </View>
        </View>

        {/* KETERANGAN GRACE MINUTES */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            Datang dalam {business.grace_minutes} menit setelah dipanggil
          </Text>
          <Text style={styles.noticeSubtext}>
            Rata-rata layanan sekitar {business.avg_service_minutes} menit per pelanggan.
          </Text>
        </View>

        {actionError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {/* KETERANGAN BILA TOMBOL NONAKTIF */}
        {!isQueueOpen ? (
          <View style={styles.disabledInfoBox}>
            <Text style={styles.disabledInfoText}>
              Antrean saat ini sedang tutup. Anda belum dapat mengambil nomor.
            </Text>
          </View>
        ) : hasActiveTicketHere ? (
          <View style={styles.disabledInfoBox}>
            <Text style={styles.disabledInfoText}>
              Anda masih memiliki tiket antrean aktif di usaha ini.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            !canTakeTicket && styles.buttonDisabled,
            pressed && canTakeTicket && styles.buttonPressed,
          ]}
          onPress={() => {
            void handleTakeTicket();
          }}
          disabled={!canTakeTicket}
          accessibilityRole="button"
          accessibilityLabel="Ambil nomor antrean"
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Ambil Nomor</Text>
          )}
        </Pressable>

        {hasActiveTicketHere ? (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={() => router.navigate('/(pelanggan)/tiket')}
            accessibilityRole="button"
            accessibilityLabel="Lihat tiket saya"
          >
            <Text style={styles.secondaryButtonText}>Lihat Tiket Saya</Text>
          </Pressable>
        ) : null}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  centerBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  mutedText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    ...theme.typography.heading,
    marginBottom: 2,
  },
  category: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  statusOpen: {
    backgroundColor: theme.colors.status.called.background,
  },
  statusClosed: {
    backgroundColor: theme.colors.status.waiting.background,
  },
  statusText: {
    ...theme.typography.bodyBold,
  },
  statusOpenText: {
    color: theme.colors.status.called.text,
  },
  statusClosedText: {
    color: theme.colors.status.waiting.text,
  },
  address: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  metricBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  metricLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  metricValue: {
    ...theme.typography.heading,
    fontSize: 32,
    lineHeight: 38,
  },
  noticeBox: {
    backgroundColor: theme.colors.status.approaching.background,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  noticeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.approaching.text,
    marginBottom: 2,
  },
  noticeSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  disabledInfoBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  disabledInfoText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
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
  errorTitle: {
    ...theme.typography.subheading,
    color: theme.colors.status.cancelled.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  errorBody: {
    ...theme.typography.body,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
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
  secondaryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
});
