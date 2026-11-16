import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBusinessDetail, useTakeTicket } from '@/hooks/useCustomerQueue';
import { useOnline } from '@/hooks/useOnline';
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
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  Skeleton,
  StatusPill,
} from '@/components/ui';

const HERO_OVERLAP = 28;

export default function DetailUsahaScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOnline } = useOnline();

  const { data, isLoading, isRefetching, error, refetch } =
    useBusinessDetail(id);
  const takeTicketMutation = useTakeTicket();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(pelanggan)');
    }
  };

  if (isLoading) {
    return (
      <Screen
        edges={['top', 'left', 'right', 'bottom']}
        header={
          <ScreenHeader
            title="Detail Usaha"
            onBack={handleBack}
            backAccessibilityLabel="Kembali ke daftar usaha"
          />
        }
      >
        <StatusBar style="dark" />
        <Card style={styles.skeletonCard}>
          <Skeleton width={64} height={64} radius={theme.radii.card} />
          <Skeleton width="70%" height={24} />
          <Skeleton width="50%" height={16} />
          <Skeleton width="100%" height={76} radius={theme.radii.tile} />
        </Card>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen
        edges={['top', 'left', 'right', 'bottom']}
        header={
          <ScreenHeader
            title="Detail Usaha"
            onBack={handleBack}
            backAccessibilityLabel="Kembali ke daftar usaha"
          />
        }
      >
        <StatusBar style="dark" />
        <OfflineBanner />
        <Card>
          <EmptyState
            illustration="empty"
            title="Gagal Memuat Detail Usaha"
            description={
              error
                ? getFriendlyErrorMessage(error)
                : 'Data usaha tidak ditemukan.'
            }
            actionLabel="Coba Lagi"
            onAction={() => {
              void refetch();
            }}
          />
        </Card>
      </Screen>
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
  const addressText =
    business.address && business.address.trim().length > 0
      ? business.address
      : 'Alamat belum dicantumkan';

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
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
        {/* Blok Hero #2B2D42 (ink) */}
        <View
          style={[
            styles.hero,
            { paddingTop: insets.top + theme.spacing.sm },
          ]}
        >
          <View style={styles.heroTopBar}>
            <IconButton
              icon="chevron-back"
              onPress={handleBack}
              accessibilityLabel="Kembali ke daftar usaha"
            />
            <StatusPill status={isQueueOpen ? 'open' : 'closed'} />
          </View>

          <View style={styles.heroBody}>
            <CategoryTile
              category={business.category}
              size={64}
              iconSize={32}
            />
            <View style={styles.heroTexts}>
              <Text style={styles.heroCategory}>{categoryLabel}</Text>
              <Text style={styles.heroTitle} accessibilityRole="header">
                {business.name}
              </Text>
              <View style={styles.heroAddressRow}>
                <Icon
                  name="location-outline"
                  size={15}
                  color={theme.colors.onInkSecondary}
                />
                <Text style={styles.heroAddress}>{addressText}</Text>
              </View>
            </View>
          </View>
        </View>

        <FadeInView style={styles.bodyContent}>
          <OfflineBanner />

          {/* Kartu 4 Metrik Sejajar */}
          <Card style={styles.metricsCard} padding="md">
            <View style={styles.metricsRow}>
              <View
                style={styles.metricCol}
                accessible
                accessibilityLabel={`Menunggu: ${waitingCount} orang`}
              >
                <Text style={styles.metricValue}>{waitingCount}</Text>
                <Text style={styles.metricLabel} numberOfLines={2}>
                  Menunggu
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View
                style={styles.metricCol}
                accessible
                accessibilityLabel={`Sedang dilayani: nomor ${currentNumber}`}
              >
                <Text style={[styles.metricValue, styles.metricValuePrimary]}>
                  {currentNumber}
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>
                  Sedang dilayani
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View
                style={styles.metricCol}
                accessible
                accessibilityLabel={`Rata-rata layanan: ${business.avg_service_minutes} menit`}
              >
                <Text style={styles.metricValue}>
                  {business.avg_service_minutes}
                  <Text style={styles.metricUnit}> mnt</Text>
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>
                  Rata-rata layanan
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View
                style={styles.metricCol}
                accessible
                accessibilityLabel={`Masa tunggu: ${business.grace_minutes} menit`}
              >
                <Text style={styles.metricValue}>
                  {business.grace_minutes}
                  <Text style={styles.metricUnit}> mnt</Text>
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>
                  Masa tunggu
                </Text>
              </View>
            </View>
          </Card>

          {/* Informasi Usaha & Ketentuan Antrean */}
          <Card>
            <Text style={styles.infoHeading} accessibilityRole="header">
              Informasi Antrean
            </Text>
            <ListRow
              icon="hourglass-outline"
              title={`Datang dalam ${business.grace_minutes} menit setelah dipanggil`}
              subtitle="Pastikan Anda berada di sekitar lokasi saat giliran hampir tiba agar tiket tidak hangus."
              divider
            />
            <ListRow
              icon="timer-outline"
              title={`Rata-rata layanan ± ${business.avg_service_minutes} menit`}
              subtitle="Waktu tunggu dihitung otomatis berdasarkan jumlah antrean di depan Anda."
              divider
            />
            <ListRow
              icon="location-outline"
              title="Lokasi Usaha"
              subtitle={addressText}
            />
          </Card>

          {actionError ? (
            <Banner tone="danger" message={actionError} />
          ) : null}
        </FadeInView>
      </ScrollView>

      {/* Bar Tombol Tetap di Bawah */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
        ]}
      >
        {!isQueueOpen ? (
          <View style={styles.disabledHintRow}>
            <Icon
              name="moon-outline"
              size={16}
              color={theme.colors.slateText}
            />
            <Text style={styles.disabledHintText}>
              Antrean saat ini sedang tutup. Anda belum dapat mengambil nomor.
            </Text>
          </View>
        ) : hasActiveTicketHere ? (
          <View style={styles.disabledHintRow}>
            <Icon
              name="information-circle-outline"
              size={16}
              color={theme.colors.accent}
            />
            <Text style={styles.disabledHintText}>
              Anda masih memiliki tiket antrean aktif di usaha ini.
            </Text>
          </View>
        ) : null}

        <Button
          label="Ambil Nomor"
          size="l"
          iconLeft="ticket-outline"
          onPress={() => {
            void handleTakeTicket();
          }}
          loading={isSubmitting}
          disabled={!canTakeTicket}
          accessibilityLabel="Ambil nomor antrean"
        />

        {hasActiveTicketHere ? (
          <Button
            label="Lihat Tiket Saya"
            variant="secondary"
            iconRight="arrow-forward"
            onPress={() => router.navigate('/(pelanggan)/tiket')}
            accessibilityLabel="Lihat tiket saya"
          />
        ) : null}
      </View>
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
  skeletonCard: {
    gap: theme.spacing.md,
  },
  hero: {
    backgroundColor: theme.colors.ink,
    borderBottomLeftRadius: theme.radii.sheet,
    borderBottomRightRadius: theme.radii.sheet,
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xl + HERO_OVERLAP,
    gap: theme.spacing.lg,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  heroTexts: {
    flex: 1,
    gap: 4,
  },
  heroCategory: {
    ...theme.typography.captionStrong,
    color: theme.colors.primarySoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    ...theme.typography.title,
    fontSize: 24,
    lineHeight: 30,
    color: theme.colors.onInk,
  },
  heroAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroAddress: {
    ...theme.typography.body,
    color: theme.colors.onInkSecondary,
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: theme.spacing.screen,
    gap: theme.spacing.lg,
  },
  metricsCard: {
    marginTop: -HERO_OVERLAP,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: 2,
    gap: 4,
  },
  metricValue: {
    ...theme.typography.subtitle,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  metricValuePrimary: {
    color: theme.colors.primary,
  },
  metricUnit: {
    ...theme.typography.captionStrong,
    color: theme.colors.slateText,
  },
  metricLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: theme.colors.borderSoft,
    marginVertical: theme.spacing.xs,
  },
  infoHeading: {
    ...theme.typography.subtitle,
    fontSize: 17,
    marginBottom: theme.spacing.xs,
  },
  bottomBar: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSoft,
    gap: theme.spacing.sm,
    ...theme.shadows.soft,
  },
  disabledHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs + 2,
    paddingVertical: 2,
  },
  disabledHintText: {
    ...theme.typography.caption,
    color: theme.colors.slateText,
    textAlign: 'center',
    flex: 1,
  },
});
