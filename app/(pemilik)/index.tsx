import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
import {
  Banner,
  Button,
  Card,
  CategoryTile,
  EmptyState,
  FadeInView,
  Icon,
  Screen,
  ScreenHeader,
  Skeleton,
  StatTile,
  StatusPill,
  useReducedMotion,
} from '@/components/ui';

const HERO_OVERLAP = 32;

function formatCountdown(remainingSeconds: number): string {
  const safeSeconds = Math.max(0, remainingSeconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function KelolaAntreanDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { isOnline } = useOnline();
  const reduceMotion = useReducedMotion();

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

  const currentNumber = todaySession?.current_number ?? 0;
  const numberScale = useRef(new Animated.Value(1)).current;
  const prevNumberRef = useRef<number>(currentNumber);

  // Animasi halus saat angka Sedang Dilayani berubah (hormati reduce motion)
  useEffect(() => {
    if (prevNumberRef.current !== currentNumber) {
      prevNumberRef.current = currentNumber;
      if (reduceMotion) {
        numberScale.setValue(1);
        return;
      }
      numberScale.setValue(0.92);
      Animated.timing(numberScale, {
        toValue: 1,
        duration: theme.motion.base,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [currentNumber, numberScale, reduceMotion]);

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
      <Screen header={<ScreenHeader title="Kelola Antrean" />}>
        <StatusBar style="dark" />
        <View style={styles.skeletonStack} accessibilityLabel="Memuat dasbor antrean">
          <Card style={styles.skeletonCard}>
            <Skeleton width="55%" height={18} />
            <Skeleton width="40%" height={68} radius={theme.radii.tile} />
            <Skeleton width="100%" height={56} radius={theme.radii.button} />
          </Card>
          <View style={styles.tilesRow}>
            <Skeleton width="48%" height={96} radius={theme.radii.tile} />
            <Skeleton width="48%" height={96} radius={theme.radii.tile} />
          </View>
          <Card style={styles.skeletonCard}>
            <Skeleton width="50%" height={20} />
            <Skeleton width="100%" height={56} radius={theme.radii.sm} />
            <Skeleton width="100%" height={56} radius={theme.radii.sm} />
          </Card>
        </View>
      </Screen>
    );
  }

  if (businessError || !business) {
    return (
      <Screen header={<ScreenHeader title="Kelola Antrean" />}>
        <StatusBar style="dark" />
        <OfflineBanner />
        <Card>
          <EmptyState
            illustration="empty"
            title="Gagal Memuat Dasbor"
            description={
              businessError
                ? getFriendlyErrorMessage(businessError)
                : 'Data usaha belum tersedia.'
            }
            actionLabel="Coba Lagi"
            onAction={() => {
              void refetchBusiness();
            }}
          />
        </Card>
      </Screen>
    );
  }

  const isQueueOpen =
    todaySession?.status === 'open' && business.is_queue_open;
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
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
        {/* 1. HEADER GELAP SOLID (#2B2D42) */}
        <View
          style={[
            styles.headerDark,
            { paddingTop: insets.top + theme.spacing.md },
          ]}
        >
          <View style={styles.headerTopRow}>
            <CategoryTile
              category={business.category}
              size={48}
              iconSize={24}
            />
            <View style={styles.headerTexts}>
              <Text
                style={styles.businessName}
                numberOfLines={1}
                accessibilityRole="header"
              >
                {business.name}
              </Text>
              <Text style={styles.categoryAddress} numberOfLines={1}>
                {categoryLabel}
                {business.address ? ` • ${business.address}` : ''}
              </Text>
            </View>
            <StatusPill status={isQueueOpen ? 'open' : 'closed'} />
          </View>
        </View>

        <FadeInView style={styles.bodyContent}>
          {/* 2. KARTU HERO NOMOR ANTREAN SAAT INI */}
          <Card style={styles.heroCard}>
            <Text style={styles.heroLabel}>Nomor Antrean Saat Ini</Text>
            <Animated.View style={{ transform: [{ scale: numberScale }] }}>
              <Text
                style={styles.heroNumber}
                accessibilityRole="header"
                accessibilityLabel={`Nomor sedang dilayani ${currentNumber}`}
              >
                {currentNumber}
              </Text>
            </Animated.View>

            {!isQueueOpen ? (
              <Button
                label="Buka antrean"
                size="xl"
                iconLeft="play"
                onPress={() => {
                  void handleOpenQueue();
                }}
                loading={openQueueMutation.isPending}
                disabled={isMutating}
                accessibilityLabel="Buka antrean usaha hari ini"
                style={styles.heroActionBtn}
              />
            ) : !hasCalled ? (
              <Button
                label="Panggil Berikutnya"
                size="xl"
                iconRight="arrow-forward"
                onPress={() => {
                  void handleCallNext('done');
                }}
                loading={callNextMutation.isPending}
                disabled={isMutating}
                accessibilityLabel="Panggil nomor antrean berikutnya"
                style={styles.heroActionBtn}
              />
            ) : null}
          </Card>

          <OfflineBanner />

          {sessionError || queueError ? (
            <Banner
              tone="danger"
              title="Gagal memuat data antrean"
              message={getFriendlyErrorMessage(sessionError ?? queueError)}
              actionLabel="Coba Lagi"
              onAction={() => {
                void handleRefreshAll();
              }}
            />
          ) : null}

          {actionError ? <Banner tone="danger" message={actionError} /> : null}

          {emptyQueueNotice ? (
            <Banner
              tone="info"
              icon="information-circle"
              message={emptyQueueNotice}
            />
          ) : null}

          {/* 3. DUA STATTILE: NOMOR TERAKHIR & JUMLAH MENUNGGU */}
          <View style={styles.tilesRow}>
            <StatTile
              label="Nomor Terakhir"
              value={lastNumber}
              variant="card"
              icon="pricetag-outline"
              iconTone="primary"
            />
            <StatTile
              label="Jumlah Menunggu"
              value={waitingCount}
              variant="filledAccent"
              icon="people-outline"
            />
          </View>

          {/* 4. KARTU "SEDANG DIPANGGIL" + TOMBOL KONTROL PANGGILAN */}
          {isQueueOpen && calledTicket ? (
            <Card
              style={[
                styles.calledCard,
                isGraceExpired
                  ? styles.calledCardExpired
                  : styles.calledCardActive,
              ]}
            >
              <View style={styles.calledHeaderRow}>
                <View style={styles.calledLabelRow}>
                  <Icon
                    name="megaphone"
                    size={18}
                    color={
                      isGraceExpired
                        ? theme.colors.status.cancelled.text
                        : theme.colors.status.called.text
                    }
                  />
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
                </View>

                <View
                  style={[
                    styles.timerBadge,
                    isGraceExpired
                      ? styles.timerBadgeExpired
                      : styles.timerBadgeActive,
                  ]}
                >
                  <Icon
                    name="timer-outline"
                    size={14}
                    color={
                      isGraceExpired
                        ? theme.colors.statusInk.cancelled
                        : theme.colors.statusInk.called
                    }
                  />
                  <Text
                    style={[
                      styles.timerBadgeText,
                      isGraceExpired
                        ? styles.timerBadgeTextExpired
                        : styles.timerBadgeTextActive,
                    ]}
                  >
                    {isGraceExpired
                      ? '00:00 • Waktu Habis'
                      : `Sisa ${formatCountdown(remainingSeconds)}`}
                  </Text>
                </View>
              </View>

              <View style={styles.calledMainRow}>
                <View
                  style={[
                    styles.calledNumberCircle,
                    isGraceExpired
                      ? styles.calledNumberCircleExpired
                      : styles.calledNumberCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.calledNumber,
                      isGraceExpired
                        ? styles.calledTextExpired
                        : styles.calledTextActive,
                    ]}
                  >
                    {calledTicket.number}
                  </Text>
                </View>

                <View style={styles.calledCustomerBlock}>
                  <Text style={styles.calledCustomerName}>
                    {calledTicket.display_name}
                  </Text>
                  <Text
                    style={[
                      styles.calledSubtext,
                      isGraceExpired ? styles.calledTextExpired : null,
                    ]}
                  >
                    {isGraceExpired
                      ? `Batas tunggu ${business.grace_minutes} menit telah terlampaui`
                      : `Batas kedatangan ${business.grace_minutes} menit sejak dipanggil`}
                  </Text>
                </View>
              </View>

              {/* KONDISI B: Ada yang dipanggil dan masih ada yang menunggu */}
              {hasWaiting ? (
                <View style={styles.actionButtonsStack}>
                  <Button
                    label="Selesai, panggil berikutnya"
                    size="xl"
                    variant="primary"
                    iconLeft="checkmark-done"
                    onPress={() => {
                      void handleCallNext('done');
                    }}
                    loading={callNextMutation.isPending}
                    disabled={isMutating}
                    accessibilityLabel="Tandai selesai dan panggil berikutnya"
                  />
                  <Button
                    label="Tidak hadir, panggil berikutnya"
                    size="l"
                    variant="dangerOutline"
                    iconLeft="person-remove-outline"
                    onPress={() => {
                      void handleCallNext('no_show');
                    }}
                    loading={callNextMutation.isPending}
                    disabled={isMutating}
                    accessibilityLabel="Tandai tidak hadir dan panggil berikutnya"
                  />
                </View>
              ) : (
                /* KONDISI C: Ada yang dipanggil dan tidak ada yang menunggu */
                <View style={styles.actionButtonsStack}>
                  <Button
                    label="Selesai"
                    size="xl"
                    variant="primary"
                    iconLeft="checkmark-circle-outline"
                    onPress={() => {
                      void handleFinishTicket(calledTicket.ticket_id);
                    }}
                    loading={finishTicketMutation.isPending}
                    disabled={isMutating}
                    accessibilityLabel="Tandai tiket selesai"
                  />
                  <Button
                    label="Tidak hadir"
                    size="l"
                    variant="dangerOutline"
                    iconLeft="person-remove-outline"
                    onPress={() => {
                      void handleMarkNoShow(calledTicket.ticket_id);
                    }}
                    loading={markNoShowMutation.isPending}
                    disabled={isMutating}
                    accessibilityLabel="Tandai pelanggan tidak hadir"
                  />
                </View>
              )}
            </Card>
          ) : null}

          {/* 5. DAFTAR ANTREAN AKTIF */}
          <Card>
            <View style={styles.queueHeaderRow}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Daftar Antrean Aktif
              </Text>
              <View style={styles.queueCountChip}>
                <Text style={styles.queueCountText}>
                  {queueItems.length} tiket
                </Text>
              </View>
            </View>

            {queueItems.length === 0 ? (
              <EmptyState
                illustration="empty"
                illustrationSize={128}
                title="Belum ada yang antre"
                description="Tiket pelanggan yang masuk akan otomatis muncul secara waktu-nyata di sini."
              />
            ) : (
              <View style={styles.queueList}>
                {queueItems.map((item) => {
                  const isItemCalled = item.status === 'called';
                  return (
                    <View
                      key={item.ticket_id}
                      style={[
                        styles.queueItemRow,
                        isItemCalled ? styles.queueItemRowCalled : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.queueNumberBadge,
                          isItemCalled ? styles.queueNumberBadgeCalled : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.queueNumberText,
                            isItemCalled ? styles.queueNumberTextCalled : null,
                          ]}
                        >
                          {item.number}
                        </Text>
                      </View>

                      <View style={styles.queueItemInfo}>
                        <Text
                          style={styles.queueCustomerName}
                          numberOfLines={1}
                        >
                          {item.display_name}
                        </Text>
                        <Text style={styles.queueTimeText}>
                          Diambil pukul {formatWibTimeOnly(item.created_at)}
                        </Text>
                      </View>

                      <StatusPill
                        status={isItemCalled ? 'called' : 'waiting'}
                        size="sm"
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* 6. TUTUP ANTREAN (TERPISAH DI BAWAH) */}
          {isQueueOpen ? (
            <Card style={styles.closeSessionCard}>
              <View style={styles.closeSessionTexts}>
                <Text style={styles.closeSessionTitle}>
                  Akhiri Sesi Antrean Hari Ini
                </Text>
                <Text style={styles.closeSessionSub}>
                  Menutup antrean akan menghentikan pengambilan nomor baru dan
                  mengakhiri sisa tiket yang belum selesai.
                </Text>
              </View>
              <Button
                label="Tutup antrean"
                variant="dangerOutline"
                iconLeft="stop-circle-outline"
                onPress={handleConfirmCloseQueue}
                loading={closeQueueMutation.isPending}
                disabled={isMutating}
                accessibilityLabel="Tutup antrean usaha hari ini"
              />
            </Card>
          ) : null}
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  skeletonStack: {
    gap: theme.spacing.lg,
  },
  skeletonCard: {
    gap: theme.spacing.md,
  },
  headerDark: {
    backgroundColor: theme.colors.ink,
    borderBottomLeftRadius: theme.radii.sheet,
    borderBottomRightRadius: theme.radii.sheet,
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xl + HERO_OVERLAP,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  businessName: {
    ...theme.typography.subtitle,
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.onInk,
  },
  categoryAddress: {
    ...theme.typography.caption,
    color: theme.colors.onInkSecondary,
  },
  bodyContent: {
    paddingHorizontal: theme.spacing.screen,
    gap: theme.spacing.lg,
  },
  heroCard: {
    marginTop: -HERO_OVERLAP,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  heroLabel: {
    ...theme.typography.label,
    color: theme.colors.slateText,
    marginBottom: theme.spacing.xs,
  },
  heroNumber: {
    ...theme.typography.displayHero,
    color: theme.colors.primary,
  },
  heroActionBtn: {
    marginTop: theme.spacing.lg,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  calledCard: {
    borderWidth: 2,
    gap: theme.spacing.md,
  },
  calledCardActive: {
    borderColor: theme.colors.status.called.text,
  },
  calledCardExpired: {
    borderColor: theme.colors.status.cancelled.text,
  },
  calledHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  calledLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs + 2,
  },
  calledSectionLabel: {
    ...theme.typography.subtitle,
    fontSize: 16,
  },
  calledTextActive: {
    color: theme.colors.statusInk.called,
  },
  calledTextExpired: {
    color: theme.colors.statusInk.cancelled,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  timerBadgeActive: {
    backgroundColor: theme.colors.status.called.background,
  },
  timerBadgeExpired: {
    backgroundColor: theme.colors.status.cancelled.background,
  },
  timerBadgeText: {
    ...theme.typography.captionStrong,
    fontVariant: ['tabular-nums'],
  },
  timerBadgeTextActive: {
    color: theme.colors.statusInk.called,
  },
  timerBadgeTextExpired: {
    color: theme.colors.statusInk.cancelled,
  },
  calledMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.canvas,
    padding: theme.spacing.md,
    borderRadius: theme.radii.tile,
  },
  calledNumberCircle: {
    minWidth: 56,
    height: 56,
    borderRadius: theme.radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  calledNumberCircleActive: {
    backgroundColor: theme.colors.status.called.background,
  },
  calledNumberCircleExpired: {
    backgroundColor: theme.colors.status.cancelled.background,
  },
  calledNumber: {
    ...theme.typography.title,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
  },
  calledCustomerBlock: {
    flex: 1,
    gap: 2,
  },
  calledCustomerName: {
    ...theme.typography.subtitle,
    fontSize: 17,
  },
  calledSubtext: {
    ...theme.typography.caption,
  },
  actionButtonsStack: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
  },
  queueCountChip: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  queueCountText: {
    ...theme.typography.captionStrong,
    color: theme.colors.primary,
  },
  queueList: {
    gap: theme.spacing.sm,
  },
  queueItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.tile,
    backgroundColor: theme.colors.canvas,
  },
  queueItemRowCalled: {
    backgroundColor: theme.colors.status.called.background,
    borderWidth: 1,
    borderColor: theme.colors.status.called.text,
  },
  queueNumberBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  queueNumberBadgeCalled: {
    backgroundColor: theme.colors.status.called.text,
  },
  queueNumberText: {
    ...theme.typography.bodyLgStrong,
    color: theme.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  queueNumberTextCalled: {
    color: theme.colors.white,
  },
  queueItemInfo: {
    flex: 1,
    gap: 2,
  },
  queueCustomerName: {
    ...theme.typography.bodyLgStrong,
  },
  queueTimeText: {
    ...theme.typography.caption,
  },
  closeSessionCard: {
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorderSoft,
  },
  closeSessionTexts: {
    gap: 4,
  },
  closeSessionTitle: {
    ...theme.typography.subtitle,
    fontSize: 16,
    color: theme.colors.statusInk.cancelled,
  },
  closeSessionSub: {
    ...theme.typography.caption,
  },
});
