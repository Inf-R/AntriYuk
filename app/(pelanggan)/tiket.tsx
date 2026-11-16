import React, { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useCancelTicket,
  useDeferTicket,
} from '@/hooks/useCustomerQueue';
import { formatWibHourMinute, useMyTicket } from '@/hooks/useMyTicket';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { theme } from '@/lib/theme';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  PillStatus,
  Screen,
  ScreenHeader,
  Skeleton,
  TicketCard,
  Timeline,
} from '@/components/ui';

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
      <Screen header={<ScreenHeader title="Antrean Saya" />}>
        <View style={styles.skeletonStack} accessibilityLabel="Memuat posisi antrean">
          <Card style={styles.skeletonCard}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="100%" height={120} radius={theme.radii.tile} />
            <Skeleton width="100%" height={56} radius={theme.radii.button} />
          </Card>
          <Card style={styles.skeletonCard}>
            <Skeleton width="45%" height={18} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="85%" height={16} />
            <Skeleton width="80%" height={16} />
          </Card>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen header={<ScreenHeader title="Antrean Saya" />}>
        {offlineBannerText ? (
          <Banner
            tone="warning"
            icon="cloud-offline-outline"
            message={offlineBannerText}
            style={styles.topBanner}
          />
        ) : null}
        <Card>
          <EmptyState
            illustration="empty"
            title="Gagal Memuat Tiket"
            description={getFriendlyErrorMessage(error)}
            actionLabel="Coba Lagi"
            onAction={() => {
              void refetch();
            }}
          />
        </Card>
      </Screen>
    );
  }

  // 1. KONDISI TIDAK PUNYA TIKET
  if (!ticket) {
    return (
      <Screen
        header={<ScreenHeader title="Antrean Saya" />}
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
          <Banner
            tone="warning"
            icon="cloud-offline-outline"
            message={offlineBannerText}
            style={styles.topBanner}
          />
        ) : null}

        <Card style={styles.emptyCardWrap}>
          <EmptyState
            illustration="empty"
            illustrationSize={152}
            title="Belum ada antrean"
            description="Cari usaha dan ambil nomor antrean sekarang dari rumah tanpa perlu menunggu di lokasi."
            actionLabel="Cari Usaha"
            onAction={() => router.navigate('/(pelanggan)')}
          />
        </Card>
      </Screen>
    );
  }

  const isWaiting = ticket.ticketStatus === 'waiting';
  const isApproaching = isWaiting && ticket.ahead <= 2;
  const isCalled = ticket.ticketStatus === 'called';
  const isNoShow = ticket.ticketStatus === 'no_show';
  const isExpired = ticket.ticketStatus === 'expired';
  const isDeferLimitReached = ticket.deferCount >= 2;

  const pillStatus: PillStatus = isCalled
    ? 'called'
    : isApproaching
      ? 'almost'
      : isNoShow
        ? 'no_show'
        : isExpired
          ? 'expired'
          : 'waiting';

  const activeTimelineStep = isCalled
    ? 3
    : isApproaching
      ? 2
      : isWaiting
        ? 1
        : 0;

  return (
    <Screen
      header={<ScreenHeader title="Antrean Saya" />}
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
      <View style={styles.contentStack}>
        {/* Banner Offline Tipis */}
        {offlineBannerText ? (
          <Banner
            tone="warning"
            icon="cloud-offline-outline"
            message={offlineBannerText}
          />
        ) : null}

        {/* Banner Peringatan Hampir Giliran */}
        {isApproaching ? (
          <Banner
            tone="warning"
            icon="hourglass-outline"
            title="Giliran hampir tiba, bersiaplah"
            message={`Tersisa ${ticket.ahead} orang di depan Anda. Pastikan Anda sudah berada di sekitar lokasi usaha.`}
          />
        ) : null}

        {/* Kartu Penekanan Sukses Saat Dipanggil */}
        {isCalled ? (
          <View
            style={styles.calledHeroCard}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`Giliran Anda! Datang dalam ${ticket.graceMinutes} menit`}
          >
            <View style={styles.calledIconBadge}>
              <Icon
                name="megaphone"
                size={24}
                color={theme.colors.status.called.text}
              />
            </View>
            <View style={styles.calledTexts}>
              <Text style={styles.calledHeroTitle}>Giliran Anda!</Text>
              <Text style={styles.calledHeroSub}>
                Datang dalam {ticket.graceMinutes} menit ke loket layanan{' '}
                {ticket.businessName} sebelum masa tunggu berakhir.
              </Text>
            </View>
          </View>
        ) : null}

        {actionError ? <Banner tone="danger" message={actionError} /> : null}

        {/* Kartu Tiket Utama */}
        <TicketCard
          businessName={ticket.businessName}
          ticketNumber={ticket.ticketNumber}
          status={pillStatus}
          ahead={ticket.ahead}
          estMinutes={ticket.estMinutes}
          currentNumber={ticket.currentNumber}
          timeLabel={`${formatWibHourMinute(ticket.updatedAt)} WIB`}
          deferQuotaLabel={
            isWaiting
              ? `Sisa tunda ${Math.max(0, 2 - ticket.deferCount)}x`
              : undefined
          }
        >
          {/* 2 & 3. KONDISI MENUNGGU / HAMPIR GILIRAN */}
          {isWaiting ? (
            <View style={styles.actionsBox}>
              {isDeferLimitReached ? (
                <View style={styles.deferLimitRow}>
                  <Icon
                    name="information-circle-outline"
                    size={16}
                    color={theme.colors.statusInk.approaching}
                  />
                  <Text style={styles.deferLimitNote}>
                    Batas undur giliran (maksimal 2 kali) sudah tercapai untuk tiket ini.
                  </Text>
                </View>
              ) : null}

              <Button
                label="Saya butuh waktu"
                variant="secondary"
                iconLeft="time-outline"
                onPress={() => {
                  void handleDefer(ticket.ticketId);
                }}
                loading={deferMutation.isPending}
                disabled={isDeferLimitReached || isMutating}
                accessibilityLabel="Saya butuh waktu untuk mengundur giliran"
              />

              <Button
                label="Batalkan tiket"
                variant="dangerGhost"
                iconLeft="close-circle-outline"
                onPress={() => handleConfirmCancel(ticket.ticketId)}
                loading={cancelMutation.isPending}
                disabled={isMutating}
                accessibilityLabel="Batalkan tiket antrean"
              />
            </View>
          ) : null}

          {/* 5. KONDISI TIDAK HADIR (NO_SHOW) */}
          {isNoShow ? (
            <View style={styles.terminalBox}>
              <Banner
                tone="danger"
                title="Tiket Hangus (Tidak Hadir)"
                message="Tiket Anda telah hangus karena masa tunggu panggilan telah lewat."
              />
              <Button
                label="Ambil Nomor Lagi"
                size="l"
                iconLeft="refresh"
                disabled={!isOnline || isOfflineMode}
                onPress={() =>
                  router.push({
                    pathname: '/(pelanggan)/usaha/[id]',
                    params: { id: ticket.businessId },
                  })
                }
                accessibilityLabel="Ambil nomor antrean lagi"
              />
            </View>
          ) : null}

          {/* 6. KONDISI ANTREAN DITUTUP (EXPIRED) */}
          {isExpired ? (
            <View style={styles.terminalBox}>
              <Banner
                tone="warning"
                title="Antrean Ditutup"
                message="Sesi antrean usaha ini telah ditutup oleh pemilik usaha sehingga tiket yang tersisa berakhir secara otomatis."
              />
              <Button
                label="Kembali ke Beranda"
                size="l"
                iconLeft="home-outline"
                onPress={() => router.navigate('/(pelanggan)')}
                accessibilityLabel="Kembali ke Beranda"
              />
            </View>
          ) : null}
        </TicketCard>

        {/* Timeline Posisi Antrean */}
        <Timeline
          activeStep={activeTimelineStep}
          activeSubtext={
            isCalled
              ? `Segera menuju loket dalam ${ticket.graceMinutes} menit.`
              : isApproaching
                ? `Tersisa ${ticket.ahead} orang di depan Anda.`
                : isWaiting
                  ? `${ticket.ahead} orang di depan Anda • estimasi ${
                      ticket.estMinutes <= 0
                        ? 'sebentar lagi'
                        : `± ${ticket.estMinutes} menit`
                    }.`
                  : undefined
          }
        />

        <Text style={styles.pullHint}>
          Tarik layar ke bawah untuk memuat ulang posisi
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBanner: {
    marginBottom: theme.spacing.md,
  },
  emptyCardWrap: {
    marginTop: theme.spacing.md,
  },
  skeletonStack: {
    gap: theme.spacing.lg,
  },
  skeletonCard: {
    gap: theme.spacing.md,
  },
  contentStack: {
    gap: theme.spacing.lg,
  },
  calledHeroCard: {
    backgroundColor: theme.colors.status.called.background,
    borderRadius: theme.radii.card,
    borderWidth: 2,
    borderColor: theme.colors.status.called.text,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  calledIconBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calledTexts: {
    flex: 1,
    gap: 2,
  },
  calledHeroTitle: {
    ...theme.typography.title,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.statusInk.called,
  },
  calledHeroSub: {
    ...theme.typography.body,
    color: theme.colors.ink,
  },
  actionsBox: {
    gap: theme.spacing.sm,
  },
  deferLimitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs + 2,
    backgroundColor: theme.colors.status.approaching.background,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.sm,
  },
  deferLimitNote: {
    ...theme.typography.caption,
    color: theme.colors.statusInk.approaching,
    flex: 1,
  },
  terminalBox: {
    gap: theme.spacing.md,
  },
  pullHint: {
    ...theme.typography.caption,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});
