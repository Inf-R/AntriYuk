import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { useOnline } from '@/hooks/useOnline';
import {
  formatWibTimeOnly,
  useCallNext,
  useCloseQueue,
  useFinishTicket,
  useMarkNoShow,
  useOpenQueue,
  useOwnerQueue,
  useOwnerSession,
} from '@/hooks/useOwnerSession';
import { OfflineBanner } from '@/components/OfflineBanner';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { BUSINESS_CATEGORIES } from '@/lib/validation';
import { theme } from '@/lib/theme';

function formatCountdown(remainingSeconds: number): string {
  const safeSeconds = Math.max(0, remainingSeconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function KelolaAntreanDashboardScreen() {
  const router = useRouter();
  const { isOnline } = useOnline();
  const {
    data: business,
    isLoading: businessLoading,
    error: businessError,
    refetch: refetchBusiness,
  } = useMyBusiness();

  const {
    data: todaySession,
    isLoading: sessionLoading,
    isRefetching: sessionRefetching,
    error: sessionError,
    refetch: refetchSession,
  } = useOwnerSession(business?.id);

  const {
    data: queueItems = [],
    isLoading: queueLoading,
    isRefetching: queueRefetching,
    error: queueError,
    refetch: refetchQueue,
  } = useOwnerQueue(business?.id);

  const openQueueMutation = useOpenQueue();
  const closeQueueMutation = useCloseQueue();
  const callNextMutation = useCallNext();
  const finishTicketMutation = useFinishTicket();
  const markNoShowMutation = useMarkNoShow();

  const [actionError, setActionError] = useState<string | null>(null);
  const [emptyQueueNotice, setEmptyQueueNotice] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const calledTicket =
    queueItems.find((item) => item.status === 'called') ?? null;
  const waitingTickets = queueItems.filter((item) => item.status === 'waiting');
  const hasCalled = calledTicket !== null;
  const hasWaiting = waitingTickets.length > 0;

  // Penghitung mundur dari called_at + grace_minutes (hanya tampilan)
  useEffect(() => {
    if (!calledTicket?.called_at) {
      return;
    }
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [calledTicket?.ticket_id, calledTicket?.called_at]);

  // Bersihkan info "Tidak ada antrean menunggu" bila ada tiket baru yang masuk
  useEffect(() => {
    if (hasWaiting || hasCalled) {
      setEmptyQueueNotice(null);
    }
  }, [hasWaiting, hasCalled]);

  if (businessLoading || sessionLoading || queueLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat dasbor antrean...</Text>
      </SafeAreaView>
    );
  }

  if (businessError || !business) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OfflineBanner />
        <View style={styles.centeredContainer}>
          <View style={styles.card}>
            <Text style={styles.errorTitle}>Gagal Memuat Dasbor</Text>
            <Text style={styles.errorText}>
              {businessError
                ? getFriendlyErrorMessage(businessError)
                : 'Data usaha belum tersedia.'}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.openButton,
                styles.retryButtonMargin,
                pressed && styles.openButtonPressed,
              ]}
              onPress={() => {
                void refetchBusiness();
              }}
              accessibilityRole="button"
              accessibilityLabel="Coba muat ulang data usaha"
            >
              <Text style={styles.primaryButtonText}>Coba Lagi</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isQueueOpen =
    todaySession?.status === 'open' && business.is_queue_open;
  const currentNumber = todaySession?.current_number ?? 0;
  const lastNumber = todaySession?.last_number ?? 0;
  const waitingCount = todaySession?.waiting_count ?? 0;

  const categoryLabel =
    BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.label ??
    business.category;

  const isMutating =
    !isOnline ||
    openQueueMutation.isPending ||
    closeQueueMutation.isPending ||
    callNextMutation.isPending ||
    finishTicketMutation.isPending ||
    markNoShowMutation.isPending;

  const isRefreshing = sessionRefetching || queueRefetching;

  // Hitung sisa waktu untuk kartu "Sedang dipanggil"
  let remainingSeconds = 0;
  let isGraceExpired = false;
  if (calledTicket?.called_at) {
    const calledAtMs = new Date(calledTicket.called_at).getTime();
    const deadlineMs = calledAtMs + business.grace_minutes * 60 * 1000;
    remainingSeconds = Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
    isGraceExpired = remainingSeconds <= 0;
  }

  async function handleRefreshAll(): Promise<void> {
    setActionError(null);
    await Promise.all([refetchBusiness(), refetchSession(), refetchQueue()]);
  }

  async function handleOpenQueue(): Promise<void> {
    if (!business || isMutating) {
      return;
    }
    setActionError(null);
    setEmptyQueueNotice(null);
    try {
      await openQueueMutation.mutateAsync(business.id);
    } catch (err: unknown) {
      setActionError(getFriendlyErrorMessage(err));
    }
  }

  function handleConfirmCloseQueue(): void {
    if (!business || isMutating) {
      return;
    }
    Alert.alert(
      'Tutup Antrean Hari Ini?',
      'Menutup antrean akan menghentikan pengambilan nomor baru dan seluruh tiket yang masih menunggu atau sedang dipanggil akan otomatis hangus (kedaluwarsa).',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Ya, Tutup Antrean',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setActionError(null);
              setEmptyQueueNotice(null);
              try {
                await closeQueueMutation.mutateAsync(business.id);
              } catch (err: unknown) {
                setActionError(getFriendlyErrorMessage(err));
              }
            })();
          },
        },
      ]
    );
  }

  async function handleCallNext(previous: 'done' | 'no_show'): Promise<void> {
    if (!business || isMutating) {
      return;
    }
    setActionError(null);
    setEmptyQueueNotice(null);
    try {
      const nextTicket = await callNextMutation.mutateAsync({
        businessId: business.id,
        previous,
      });
      if (nextTicket === null) {
        setEmptyQueueNotice('Tidak ada antrean menunggu');
      }
    } catch (err: unknown) {
      setActionError(getFriendlyErrorMessage(err));
    }
  }

  async function handleFinishTicket(ticketId: string): Promise<void> {
    if (isMutating) {
      return;
    }
    setActionError(null);
    setEmptyQueueNotice(null);
    try {
      await finishTicketMutation.mutateAsync(ticketId);
    } catch (err: unknown) {
      setActionError(getFriendlyErrorMessage(err));
    }
  }

  async function handleMarkNoShow(ticketId: string): Promise<void> {
    if (isMutating) {
      return;
    }
    setActionError(null);
    setEmptyQueueNotice(null);
    try {
      await markNoShowMutation.mutateAsync(ticketId);
    } catch (err: unknown) {
      setActionError(getFriendlyErrorMessage(err));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void handleRefreshAll();
            }}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* 1. KARTU HEADER USAHA, METRIK, DAN BUKA/TUTUP ANTREAN */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{business.name}</Text>
              <Text style={styles.categoryText}>
                {categoryLabel}
                {business.address ? ` • ${business.address}` : ''}
              </Text>
            </View>

            <View
              style={[
                styles.statusPill,
                isQueueOpen ? styles.statusOpenPill : styles.statusClosedPill,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  isQueueOpen
                    ? styles.statusOpenText
                    : styles.statusClosedText,
                ]}
              >
                {isQueueOpen ? 'Buka' : 'Tutup'}
              </Text>
            </View>
          </View>

          {sessionError || queueError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {getFriendlyErrorMessage(sessionError ?? queueError)}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.inlineRetryButton,
                  pressed && styles.inlineRetryButtonPressed,
                ]}
                onPress={() => {
                  void handleRefreshAll();
                }}
                accessibilityRole="button"
                accessibilityLabel="Coba muat ulang data antrean"
              >
                <Text style={styles.inlineRetryButtonText}>Coba Lagi</Text>
              </Pressable>
            </View>
          ) : null}

          {actionError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{actionError}</Text>
            </View>
          ) : null}

          {/* METRIK UTAMA: NOMOR SEDANG DILAYANI (JUMBO) */}
          <View style={styles.heroMetricBox}>
            <Text style={styles.heroMetricLabel}>Nomor Sedang Dilayani</Text>
            <Text style={styles.heroMetricValue}>{currentNumber}</Text>
          </View>

          {/* METRIK SEKUNDER: NOMOR TERAKHIR & JUMLAH MENUNGGU */}
          <View style={styles.secondaryMetricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Nomor Terakhir</Text>
              <Text style={styles.metricNumber}>{lastNumber}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Jumlah Menunggu</Text>
              <Text style={styles.metricNumber}>{waitingCount}</Text>
            </View>
          </View>

          {/* TOMBOL AKSI BUKA / TUTUP ANTREAN */}
          {!isQueueOpen ? (
            <Pressable
              style={({ pressed }) => [
                styles.openButton,
                pressed && !isMutating && styles.openButtonPressed,
                isMutating && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleOpenQueue();
              }}
              disabled={isMutating}
              accessibilityRole="button"
              accessibilityLabel="Buka antrean usaha hari ini"
            >
              {openQueueMutation.isPending ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>Buka antrean</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && !isMutating && styles.closeButtonPressed,
                isMutating && styles.buttonDisabled,
              ]}
              onPress={handleConfirmCloseQueue}
              disabled={isMutating}
              accessibilityRole="button"
              accessibilityLabel="Tutup antrean usaha hari ini"
            >
              {closeQueueMutation.isPending ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>Tutup antrean</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* 2. KARTU "SEDANG DIPANGGIL" DENGAN PENGHITUNG MUNDUR */}
        {calledTicket ? (
          <View
            style={[
              styles.calledCard,
              isGraceExpired
                ? styles.calledCardExpired
                : styles.calledCardActive,
            ]}
          >
            <View style={styles.calledHeaderRow}>
              <Text
                style={[
                  styles.calledSectionLabel,
                  isGraceExpired
                    ? styles.calledTextExpired
                    : styles.calledTextActive,
                ]}
              >
                Sedang dipanggil
              </Text>
              <View
                style={[
                  styles.timerBadge,
                  isGraceExpired
                    ? styles.timerBadgeExpired
                    : styles.timerBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.timerBadgeText,
                    isGraceExpired
                      ? styles.timerBadgeTextExpired
                      : styles.timerBadgeTextActive,
                  ]}
                >
                  {isGraceExpired
                    ? `00:00 • Waktu Habis`
                    : `Sisa ${formatCountdown(remainingSeconds)}`}
                </Text>
              </View>
            </View>

            <View style={styles.calledMainRow}>
              <Text
                style={[
                  styles.calledNumber,
                  isGraceExpired
                    ? styles.calledTextExpired
                    : styles.calledTextActive,
                ]}
              >
                #{calledTicket.number}
              </Text>
              <View style={styles.calledCustomerBlock}>
                <Text style={styles.calledCustomerName}>
                  {calledTicket.display_name}
                </Text>
                <Text
                  style={[
                    styles.calledSubtext,
                    isGraceExpired && styles.calledTextExpired,
                  ]}
                >
                  {isGraceExpired
                    ? `Batas tunggu ${business.grace_minutes} menit telah terlampaui`
                    : `Batas kedatangan ${business.grace_minutes} menit sejak dipanggil`}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 3. KARTU KONTROL PANGGILAN ANTREAN (TOMBOL JUMBO SATU TANGAN) */}
        {isQueueOpen ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Kontrol Panggilan</Text>

            {emptyQueueNotice ? (
              <View style={styles.emptyNoticeBox}>
                <Text style={styles.emptyNoticeText}>{emptyQueueNotice}</Text>
              </View>
            ) : null}

            {/* KONDISI A: Belum ada yang dipanggil */}
            {!hasCalled ? (
              <Pressable
                style={({ pressed }) => [
                  styles.jumboActionButton,
                  styles.callNextPrimaryButton,
                  pressed && !isMutating && styles.callNextPrimaryPressed,
                  isMutating && styles.buttonDisabled,
                ]}
                onPress={() => {
                  void handleCallNext('done');
                }}
                disabled={isMutating}
                accessibilityRole="button"
                accessibilityLabel="Panggil nomor antrean berikutnya"
              >
                {callNextMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.jumboActionButtonText}>
                    Panggil berikutnya
                  </Text>
                )}
              </Pressable>
            ) : null}

            {/* KONDISI B: Ada yang dipanggil dan masih ada yang menunggu */}
            {hasCalled && hasWaiting ? (
              <View style={styles.actionButtonsStack}>
                <Pressable
                  style={({ pressed }) => [
                    styles.jumboActionButton,
                    styles.doneNextButton,
                    pressed && !isMutating && styles.doneNextButtonPressed,
                    isMutating && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    void handleCallNext('done');
                  }}
                  disabled={isMutating}
                  accessibilityRole="button"
                  accessibilityLabel="Tandai selesai dan panggil berikutnya"
                >
                  {callNextMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.surface} />
                  ) : (
                    <Text style={styles.jumboActionButtonText}>
                      Selesai, panggil berikutnya
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.jumboActionButton,
                    styles.noShowNextButton,
                    pressed && !isMutating && styles.noShowNextButtonPressed,
                    isMutating && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    void handleCallNext('no_show');
                  }}
                  disabled={isMutating}
                  accessibilityRole="button"
                  accessibilityLabel="Tandai tidak hadir dan panggil berikutnya"
                >
                  {callNextMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.surface} />
                  ) : (
                    <Text style={styles.jumboActionButtonText}>
                      Tidak hadir, panggil berikutnya
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/* KONDISI C: Ada yang dipanggil dan tidak ada yang menunggu */}
            {hasCalled && !hasWaiting && calledTicket ? (
              <View style={styles.actionButtonsStack}>
                <Pressable
                  style={({ pressed }) => [
                    styles.jumboActionButton,
                    styles.doneNextButton,
                    pressed && !isMutating && styles.doneNextButtonPressed,
                    isMutating && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    void handleFinishTicket(calledTicket.ticket_id);
                  }}
                  disabled={isMutating}
                  accessibilityRole="button"
                  accessibilityLabel="Tandai tiket selesai"
                >
                  {finishTicketMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.surface} />
                  ) : (
                    <Text style={styles.jumboActionButtonText}>Selesai</Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.jumboActionButton,
                    styles.noShowNextButton,
                    pressed && !isMutating && styles.noShowNextButtonPressed,
                    isMutating && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    void handleMarkNoShow(calledTicket.ticket_id);
                  }}
                  disabled={isMutating}
                  accessibilityRole="button"
                  accessibilityLabel="Tandai pelanggan tidak hadir"
                >
                  {markNoShowMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.surface} />
                  ) : (
                    <Text style={styles.jumboActionButtonText}>
                      Tidak hadir
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 4. DAFTAR ANTREAN AKTIF (DARI owner_queue) */}
        <View style={styles.card}>
          <View style={styles.queueHeaderRow}>
            <Text style={styles.sectionTitle}>Daftar Antrean Aktif</Text>
            <Text style={styles.queueCountText}>{queueItems.length} tiket</Text>
          </View>

          {queueItems.length === 0 ? (
            <View style={styles.emptyQueueBox}>
              <Text style={styles.emptyQueueText}>
                Tidak ada antrean menunggu
              </Text>
            </View>
          ) : (
            <View style={styles.queueList}>
              {queueItems.map((item) => {
                const isItemCalled = item.status === 'called';
                return (
                  <View
                    key={item.ticket_id}
                    style={[
                      styles.queueItemRow,
                      isItemCalled && styles.queueItemRowCalled,
                    ]}
                  >
                    <View style={styles.queueNumberBadge}>
                      <Text style={styles.queueNumberText}>#{item.number}</Text>
                    </View>

                    <View style={styles.queueItemInfo}>
                      <Text style={styles.queueCustomerName} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                      <Text style={styles.queueTimeText}>
                        Diambil pukul {formatWibTimeOnly(item.created_at)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.queueStatusBadge,
                        isItemCalled
                          ? styles.queueStatusCalled
                          : styles.queueStatusWaiting,
                      ]}
                    >
                      <Text
                        style={[
                          styles.queueStatusText,
                          isItemCalled
                            ? styles.queueStatusCalledText
                            : styles.queueStatusWaitingText,
                        ]}
                      >
                        {isItemCalled ? 'Dipanggil' : 'Menunggu'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 5. PINTASAN RINGKASAN HARIAN & PENGATURAN USAHA */}
        <View style={styles.navButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryNavButton,
              pressed && styles.secondaryNavButtonPressed,
            ]}
            onPress={() => router.push('/(pemilik)/ringkasan')}
            accessibilityRole="button"
            accessibilityLabel="Buka halaman Ringkasan Harian"
          >
            <Text style={styles.secondaryNavButtonText}>Ringkasan Harian</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryNavButton,
              pressed && styles.secondaryNavButtonPressed,
            ]}
            onPress={() => router.push('/(pemilik)/pengaturan')}
            accessibilityRole="button"
            accessibilityLabel="Buka halaman Pengaturan Usaha"
          >
            <Text style={styles.secondaryNavButtonText}>Pengaturan Usaha</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
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
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    ...theme.typography.heading,
    marginBottom: theme.spacing.xs,
  },
  categoryText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  statusOpenPill: {
    backgroundColor: theme.colors.status.called.background,
  },
  statusClosedPill: {
    backgroundColor: theme.colors.status.waiting.background,
  },
  statusPillText: {
    ...theme.typography.bodyBold,
  },
  statusOpenText: {
    color: theme.colors.status.called.text,
  },
  statusClosedText: {
    color: theme.colors.status.waiting.text,
  },
  errorBox: {
    backgroundColor: theme.colors.status.cancelled.background,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  errorTitle: {
    ...theme.typography.subheading,
    color: theme.colors.status.cancelled.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.status.cancelled.text,
  },
  retryButtonMargin: {
    marginTop: theme.spacing.md,
  },
  inlineRetryButton: {
    minHeight: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.status.cancelled.text,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  inlineRetryButtonPressed: {
    opacity: 0.85,
  },
  inlineRetryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.cancelled.text,
  },
  heroMetricBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroMetricLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  heroMetricValue: {
    ...theme.typography.displayTicket,
  },
  secondaryMetricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
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
  metricNumber: {
    ...theme.typography.heading,
    fontSize: 28,
    lineHeight: 34,
  },
  openButton: {
    width: '100%',
    minHeight: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  openButtonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  closeButton: {
    width: '100%',
    minHeight: 56,
    backgroundColor: theme.colors.status.cancelled.text,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  closeButtonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  primaryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
    fontSize: 16,
  },
  calledCard: {
    borderRadius: theme.radii.card,
    borderWidth: 2,
    padding: theme.spacing.xl,
  },
  calledCardActive: {
    backgroundColor: theme.colors.status.called.background,
    borderColor: theme.colors.status.called.text,
  },
  calledCardExpired: {
    backgroundColor: theme.colors.status.cancelled.background,
    borderColor: theme.colors.status.cancelled.text,
  },
  calledHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  calledSectionLabel: {
    ...theme.typography.subheading,
  },
  calledTextActive: {
    color: theme.colors.status.called.text,
  },
  calledTextExpired: {
    color: theme.colors.status.cancelled.text,
  },
  timerBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  timerBadgeActive: {
    backgroundColor: theme.colors.status.called.text,
  },
  timerBadgeExpired: {
    backgroundColor: theme.colors.status.cancelled.text,
  },
  timerBadgeText: {
    ...theme.typography.bodyBold,
  },
  timerBadgeTextActive: {
    color: theme.colors.surface,
  },
  timerBadgeTextExpired: {
    color: theme.colors.surface,
  },
  calledMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  calledNumber: {
    fontFamily: 'Roboto',
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '700',
  },
  calledCustomerBlock: {
    flex: 1,
  },
  calledCustomerName: {
    ...theme.typography.heading,
    marginBottom: 2,
  },
  calledSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    marginBottom: theme.spacing.md,
  },
  emptyNoticeBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  emptyNoticeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textMuted,
  },
  actionButtonsStack: {
    gap: theme.spacing.md,
  },
  jumboActionButton: {
    width: '100%',
    minHeight: 60,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  callNextPrimaryButton: {
    backgroundColor: theme.colors.primary,
  },
  callNextPrimaryPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  doneNextButton: {
    backgroundColor: theme.colors.status.called.text,
  },
  doneNextButtonPressed: {
    opacity: 0.88,
  },
  noShowNextButton: {
    backgroundColor: theme.colors.status.cancelled.text,
  },
  noShowNextButtonPressed: {
    opacity: 0.88,
  },
  jumboActionButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
    fontSize: 16,
    textAlign: 'center',
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  queueCountText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
  },
  emptyQueueBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyQueueText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  queueList: {
    gap: theme.spacing.sm,
  },
  queueItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  queueItemRowCalled: {
    backgroundColor: theme.colors.status.called.background,
    borderColor: theme.colors.status.called.text,
  },
  queueNumberBadge: {
    minWidth: 52,
    height: 44,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  queueNumberText: {
    ...theme.typography.subheading,
    color: theme.colors.primaryDark,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueCustomerName: {
    ...theme.typography.bodyBold,
    marginBottom: 2,
  },
  queueTimeText: {
    ...theme.typography.caption,
  },
  queueStatusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  queueStatusCalled: {
    backgroundColor: theme.colors.status.called.text,
  },
  queueStatusWaiting: {
    backgroundColor: theme.colors.status.waiting.background,
  },
  queueStatusText: {
    ...theme.typography.bodyBold,
    fontSize: 12,
  },
  queueStatusCalledText: {
    color: theme.colors.surface,
  },
  queueStatusWaitingText: {
    color: theme.colors.status.waiting.text,
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  secondaryNavButton: {
    flex: 1,
    minHeight: 54,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  secondaryNavButtonPressed: {
    backgroundColor: theme.colors.background,
  },
  secondaryNavButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    textAlign: 'center',
  },
});
