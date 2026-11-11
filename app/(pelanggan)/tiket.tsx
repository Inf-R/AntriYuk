import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useCancelTicket,
  useDeferTicket,
} from '@/hooks/useCustomerQueue';
import { useMyTicket } from '@/hooks/useMyTicket';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { theme } from '@/lib/theme';

export default function TiketPelangganScreen() {
  const router = useRouter();

  const {
    data: ticket,
    isLoading,
    isRefetching,
    error,
    refetch,
    isOnline,
    isOfflineMode,
    offlineBannerText,
  } = useMyTicket();

  const cancelMutation = useCancelTicket();
  const deferMutation = useDeferTicket();
  const [actionError, setActionError] = useState<string | null>(null);

  const isMutating =
    cancelMutation.isPending || deferMutation.isPending || !isOnline || isOfflineMode;

  function handleConfirmCancel(ticketId: string): void {
    if (isMutating) {
      return;
    }
    Alert.alert(
      'Batalkan Nomor Antrean?',
      'Jika dibatalkan, Anda harus mengambil nomor antrean baru dari urutan paling belakang.',
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setActionError(null);
              try {
                await cancelMutation.mutateAsync(ticketId);
              } catch (err: unknown) {
                setActionError(getFriendlyErrorMessage(err));
              }
            })();
          },
        },
      ]
    );
  }

  async function handleDefer(ticketId: string): Promise<void> {
    if (isMutating) {
      return;
    }
    setActionError(null);
    try {
      await deferMutation.mutateAsync(ticketId);
    } catch (err: unknown) {
      setActionError(getFriendlyErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.mutedText}>Memuat posisi antrean Anda...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerBox}>
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Gagal Memuat Tiket</Text>
          <Text style={styles.errorBody}>
            {getFriendlyErrorMessage(error)}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => {
              void refetch();
            }}
            accessibilityRole="button"
            accessibilityLabel="Coba muat ulang tiket antrean"
          >
            <Text style={styles.primaryButtonText}>Coba Lagi</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 1. KONDISI TIDAK PUNYA TIKET
  if (!ticket) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollCenterContent}
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
        {offlineBannerText ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>{offlineBannerText}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.emptyTitle}>Belum Ada Tiket Aktif</Text>
          <Text style={styles.emptySubtitle}>
            Anda belum memiliki nomor antrean aktif saat ini. Pilih usaha di
            Beranda untuk mengambil nomor dari rumah.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => router.navigate('/(pelanggan)')}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke Beranda untuk memilih usaha"
          >
            <Text style={styles.primaryButtonText}>Ke Beranda</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const isWaiting = ticket.ticketStatus === 'waiting';
  const isApproaching = isWaiting && ticket.ahead <= 2;
  const isCalled = ticket.ticketStatus === 'called';
  const isNoShow = ticket.ticketStatus === 'no_show';
  const isExpired = ticket.ticketStatus === 'expired';
  const isDeferLimitReached = ticket.deferCount >= 2;

  return (
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
      {offlineBannerText ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>{offlineBannerText}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.card,
          isApproaching && styles.cardApproaching,
          isCalled && styles.cardCalled,
          (isNoShow || isExpired) && styles.cardCancelled,
        ]}
      >
        <Text style={styles.businessName}>{ticket.businessName}</Text>

        {/* BADGE STATUS */}
        <View
          style={[
            styles.statusBadge,
            isCalled
              ? styles.badgeCalled
              : isApproaching
                ? styles.badgeApproaching
                : isNoShow || isExpired
                  ? styles.badgeCancelled
                  : styles.badgeWaiting,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              isCalled
                ? styles.badgeCalledText
                : isApproaching
                  ? styles.badgeApproachingText
                  : isNoShow || isExpired
                    ? styles.badgeCancelledText
                    : styles.badgeWaitingText,
            ]}
          >
            {isCalled
              ? 'Dipanggil'
              : isApproaching
                ? 'Hampir Giliran Anda'
                : isNoShow
                  ? 'Tiket Hangus (Tidak Hadir)'
                  : isExpired
                    ? 'Antrean Ditutup'
                    : 'Menunggu Giliran'}
          </Text>
        </View>

        {/* ANGKA TIKET JUMBO */}
        <View style={styles.ticketNumberBox}>
          <Text style={styles.ticketNumberLabel}>Nomor Antrean Anda</Text>
          <Text style={styles.ticketNumberValue}>{ticket.ticketNumber}</Text>
        </View>

        {actionError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {/* 2 & 3. KONDISI MENUNGGU / HAMPIR GILIRAN (ahead <= 2) */}
        {isWaiting ? (
          <>
            <View
              style={[
                styles.highlightBox,
                isApproaching && styles.highlightBoxApproaching,
              ]}
            >
              <Text
                style={[
                  styles.aheadTitle,
                  isApproaching && styles.aheadTitleApproaching,
                ]}
              >
                {ticket.ahead} orang di depan Anda
              </Text>
              <Text style={styles.estText}>
                Estimasi tunggu:{' '}
                {ticket.estMinutes <= 0
                  ? 'Sebentar lagi'
                  : `± ${ticket.estMinutes} menit`}
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Sedang Dilayani</Text>
                <Text style={styles.metricValue}>{ticket.currentNumber}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Sisa Kuota Tunda</Text>
                <Text style={styles.metricValue}>{2 - ticket.deferCount}x</Text>
              </View>
            </View>

            {isDeferLimitReached ? (
              <Text style={styles.deferLimitNote}>
                Batas undur giliran (maksimal 2 kali) sudah tercapai untuk tiket ini.
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.deferButton,
                (isDeferLimitReached || isMutating) &&
                  styles.deferButtonDisabled,
                pressed &&
                  !isDeferLimitReached &&
                  !isMutating &&
                  styles.deferButtonPressed,
              ]}
              onPress={() => {
                void handleDefer(ticket.ticketId);
              }}
              disabled={isDeferLimitReached || isMutating}
              accessibilityRole="button"
              accessibilityLabel="Saya butuh waktu untuk mengundur giliran"
            >
              {deferMutation.isPending ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.deferButtonText,
                    (isDeferLimitReached || isMutating) &&
                      styles.deferButtonTextDisabled,
                  ]}
                >
                  Saya butuh waktu
                </Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                isMutating && styles.buttonDisabled,
                pressed && !isMutating && styles.cancelButtonPressed,
              ]}
              onPress={() => handleConfirmCancel(ticket.ticketId)}
              disabled={isMutating}
              accessibilityRole="button"
              accessibilityLabel="Batalkan tiket antrean"
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.cancelButtonText}>Batalkan</Text>
              )}
            </Pressable>
          </>
        ) : null}

        {/* 4. KONDISI DIPANGGIL */}
        {isCalled ? (
          <View style={styles.calledBanner}>
            <Text style={styles.calledBannerTitle}>
              Giliran Anda! Datang dalam {ticket.graceMinutes} menit
            </Text>
            <Text style={styles.calledBannerSub}>
              Silakan segera menuju loket layanan sebelum masa tunggu berakhir.
            </Text>
          </View>
        ) : null}

        {/* 5. KONDISI TIDAK HADIR (NO_SHOW) */}
        {isNoShow ? (
          <View style={styles.terminalBox}>
            <Text style={styles.terminalText}>
              Tiket Anda telah hangus karena masa tunggu panggilan telah lewat.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!isOnline || isOfflineMode) && styles.buttonDisabled,
                pressed && isOnline && !isOfflineMode && styles.primaryButtonPressed,
              ]}
              disabled={!isOnline || isOfflineMode}
              onPress={() =>
                router.push({
                  pathname: '/(pelanggan)/usaha/[id]',
                  params: { id: ticket.businessId },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Ambil nomor antrean lagi"
            >
              <Text style={styles.primaryButtonText}>Ambil Nomor Lagi</Text>
            </Pressable>
          </View>
        ) : null}

        {/* 6. KONDISI ANTREAN DITUTUP (EXPIRED) */}
        {isExpired ? (
          <View style={styles.terminalBox}>
            <Text style={styles.terminalText}>
              Sesi antrean usaha ini telah ditutup oleh pemilik usaha sehingga
              tiket yang tersisa berakhir secara otomatis.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={() => router.navigate('/(pelanggan)')}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke Beranda"
            >
              <Text style={styles.primaryButtonText}>Kembali ke Beranda</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Text style={styles.pullHint}>Tarik layar ke bawah untuk memuat ulang posisi</Text>
    </ScrollView>
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
  offlineBanner: {
    width: '100%',
    backgroundColor: theme.colors.status.approaching.background,
    borderWidth: 1,
    borderColor: theme.colors.status.approaching.text,
    borderRadius: theme.radii.card,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  offlineBannerText: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.approaching.text,
    textAlign: 'center',
  },
  scrollCenterContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    alignItems: 'center',
  },
  cardApproaching: {
    borderColor: theme.colors.status.approaching.text,
    borderWidth: 2,
  },
  cardCalled: {
    backgroundColor: theme.colors.status.called.background,
    borderColor: theme.colors.status.called.text,
    borderWidth: 2,
  },
  cardCancelled: {
    borderColor: theme.colors.status.cancelled.text,
  },
  businessName: {
    ...theme.typography.heading,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    marginBottom: theme.spacing.lg,
  },
  badgeWaiting: {
    backgroundColor: theme.colors.status.waiting.background,
  },
  badgeApproaching: {
    backgroundColor: theme.colors.status.approaching.background,
  },
  badgeCalled: {
    backgroundColor: theme.colors.status.called.text,
  },
  badgeCancelled: {
    backgroundColor: theme.colors.status.cancelled.background,
  },
  statusBadgeText: {
    ...theme.typography.bodyBold,
  },
  badgeWaitingText: {
    color: theme.colors.status.waiting.text,
  },
  badgeApproachingText: {
    color: theme.colors.status.approaching.text,
  },
  badgeCalledText: {
    color: theme.colors.surface,
  },
  badgeCancelledText: {
    color: theme.colors.status.cancelled.text,
  },
  ticketNumberBox: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  ticketNumberLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
  },
  ticketNumberValue: {
    ...theme.typography.displayTicket,
  },
  highlightBox: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  highlightBoxApproaching: {
    backgroundColor: theme.colors.status.approaching.background,
  },
  aheadTitle: {
    ...theme.typography.subheading,
    marginBottom: 4,
  },
  aheadTitleApproaching: {
    color: theme.colors.status.approaching.text,
  },
  estText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  metricsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  metricItem: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  metricLabel: {
    ...theme.typography.caption,
    marginBottom: 4,
  },
  metricValue: {
    ...theme.typography.heading,
  },
  deferLimitNote: {
    ...theme.typography.caption,
    color: theme.colors.status.approaching.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  deferButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    borderRadius: theme.radii.card,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  deferButtonPressed: {
    backgroundColor: theme.colors.background,
  },
  deferButtonDisabled: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  deferButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  deferButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  cancelButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.status.cancelled.text,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  cancelButtonPressed: {
    opacity: 0.85,
  },
  cancelButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
  calledBanner: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.status.called.text,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  calledBannerTitle: {
    ...theme.typography.subheading,
    color: theme.colors.status.called.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  calledBannerSub: {
    ...theme.typography.body,
    textAlign: 'center',
  },
  terminalBox: {
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  terminalText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyTitle: {
    ...theme.typography.heading,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  primaryButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButtonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  primaryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  errorBox: {
    width: '100%',
    backgroundColor: theme.colors.status.cancelled.background,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.status.cancelled.text,
    textAlign: 'center',
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
  pullHint: {
    ...theme.typography.caption,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
