import React, { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import {
  formatWibDateLabel,
  getTodayWibDateString,
  shiftWibDateString,
  useOwnerSummary,
} from '@/hooks/useOwnerSession';
import { OfflineBanner } from '@/components/OfflineBanner';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { theme } from '@/lib/theme';
import {
  Banner,
  Card,
  Chip,
  EmptyState,
  Icon,
  Screen,
  ScreenHeader,
  Skeleton,
  StatTile,
} from '@/components/ui';

export default function RingkasanPemilikScreen() {
  const todayWib = getTodayWibDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayWib);

  const {
    data: business,
    isLoading: businessLoading,
    error: businessError,
    refetch: refetchBusiness,
  } = useMyBusiness();

  const {
    data: summary,
    isLoading: summaryLoading,
    isRefetching,
    error: summaryError,
    refetch,
  } = useOwnerSummary(business?.id, selectedDate);

  const isToday = selectedDate === todayWib;
  const isBusy = businessLoading || summaryLoading || isRefetching;

  function handlePrevDay(): void {
    if (isBusy) {
      return;
    }
    setSelectedDate((prev) => shiftWibDateString(prev, -1));
  }

  function handleNextDay(): void {
    if (isBusy) {
      return;
    }
    setSelectedDate((prev) => shiftWibDateString(prev, 1));
  }

  if (businessLoading) {
    return (
      <Screen header={<ScreenHeader title="Ringkasan Harian" />}>
        <View style={styles.skeletonStack} accessibilityLabel="Memuat ringkasan harian">
          <Skeleton width="100%" height={56} radius={theme.radii.pill} />
          <View style={styles.gridRow}>
            <Skeleton width="48%" height={104} radius={theme.radii.tile} />
            <Skeleton width="48%" height={104} radius={theme.radii.tile} />
          </View>
          <View style={styles.gridRow}>
            <Skeleton width="48%" height={104} radius={theme.radii.tile} />
            <Skeleton width="48%" height={104} radius={theme.radii.tile} />
          </View>
        </View>
      </Screen>
    );
  }

  if (businessError || !business) {
    return (
      <Screen header={<ScreenHeader title="Ringkasan Harian" />}>
        <OfflineBanner />
        <Card>
          <EmptyState
            illustration="empty"
            title="Gagal Memuat Usaha"
            description={
              businessError
                ? getFriendlyErrorMessage(businessError)
                : 'Data usaha tidak ditemukan.'
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

  const hasData = Boolean(summary && summary.total > 0);
  const avgServiceValue =
    summary?.avg_service_minutes !== null &&
    summary?.avg_service_minutes !== undefined
      ? summary.avg_service_minutes.toFixed(1)
      : '-';
  const avgServiceUnit =
    summary?.avg_service_minutes !== null &&
    summary?.avg_service_minutes !== undefined
      ? 'menit'
      : undefined;

  return (
    <Screen
      header={
        <ScreenHeader
          title="Ringkasan Harian"
          eyebrow={business.name}
        />
      }
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
      <OfflineBanner />

      <View style={styles.contentStack}>
        {/* Pemilih Tanggal Berbentuk Pil dengan Panah */}
        <View style={styles.dateSelectorWrap}>
          <View style={styles.datePillBar}>
            <Pressable
              onPress={handlePrevDay}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Lihat ringkasan hari sebelumnya"
              accessibilityState={{ disabled: isBusy }}
              style={({ pressed }) => [
                styles.arrowCircle,
                pressed && !isBusy ? styles.arrowCirclePressed : null,
                isBusy ? styles.arrowCircleDisabled : null,
              ]}
            >
              <Icon
                name="chevron-back"
                size={20}
                color={isBusy ? theme.colors.muted : theme.colors.ink}
              />
            </Pressable>

            <View style={styles.dateCenter}>
              <View style={styles.dateTitleRow}>
                <Icon
                  name="calendar-outline"
                  size={16}
                  color={theme.colors.accent}
                />
                <Text style={styles.dateLabelText} numberOfLines={1}>
                  {formatWibDateLabel(selectedDate)}
                </Text>
              </View>
              <Text style={styles.dateSubText}>
                {isToday ? 'Hari Ini (WIB)' : `${selectedDate} (WIB)`}
              </Text>
            </View>

            <Pressable
              onPress={handleNextDay}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Lihat ringkasan hari sesudahnya"
              accessibilityState={{ disabled: isBusy }}
              style={({ pressed }) => [
                styles.arrowCircle,
                pressed && !isBusy ? styles.arrowCirclePressed : null,
                isBusy ? styles.arrowCircleDisabled : null,
              ]}
            >
              <Icon
                name="chevron-forward"
                size={20}
                color={isBusy ? theme.colors.muted : theme.colors.ink}
              />
            </Pressable>
          </View>

          {!isToday ? (
            <View style={styles.resetChipRow}>
              <Chip
                label="Kembali ke Hari Ini"
                icon="today-outline"
                active
                disabled={isBusy}
                onPress={() => {
                  if (!isBusy) {
                    setSelectedDate(todayWib);
                  }
                }}
                accessibilityLabel="Kembali ke ringkasan hari ini"
              />
            </View>
          ) : null}
        </View>

        {/* Isi Ringkasan Harian */}
        {summaryLoading ? (
          <View style={styles.skeletonStack} accessibilityLabel="Memuat data ringkasan">
            <View style={styles.gridRow}>
              <Skeleton width="48%" height={104} radius={theme.radii.tile} />
              <Skeleton width="48%" height={104} radius={theme.radii.tile} />
            </View>
            <View style={styles.gridRow}>
              <Skeleton width="48%" height={104} radius={theme.radii.tile} />
              <Skeleton width="48%" height={104} radius={theme.radii.tile} />
            </View>
            <View style={styles.gridRow}>
              <Skeleton width="48%" height={104} radius={theme.radii.tile} />
              <Skeleton width="48%" height={104} radius={theme.radii.tile} />
            </View>
          </View>
        ) : summaryError ? (
          <Banner
            tone="danger"
            title="Gagal Memuat Ringkasan"
            message={getFriendlyErrorMessage(summaryError)}
            actionLabel="Coba Lagi"
            onAction={() => {
              void refetch();
            }}
          />
        ) : !hasData ? (
          <Card>
            <EmptyState
              illustration="empty"
              title="Belum ada data"
              description="Belum terdapat tiket antrean yang tercatat pada tanggal ini."
            />
          </Card>
        ) : (
          <View style={styles.metricsGrid}>
            {/* Baris 1: Total Tiket & Selesai */}
            <View style={styles.gridRow}>
              <StatTile
                label="Total Tiket"
                value={summary?.total ?? 0}
                variant="filledPrimary"
                icon="ticket-outline"
              />
              <StatTile
                label="Selesai"
                value={summary?.done ?? 0}
                variant="card"
                icon="checkmark-circle"
                iconTone="success"
              />
            </View>

            {/* Baris 2: Tidak Hadir & Dibatalkan */}
            <View style={styles.gridRow}>
              <StatTile
                label="Tidak Hadir"
                value={summary?.no_show ?? 0}
                variant="card"
                icon="person-remove-outline"
                iconTone="warning"
              />
              <StatTile
                label="Dibatalkan"
                value={summary?.cancelled ?? 0}
                variant="card"
                icon="close-circle"
                iconTone="danger"
              />
            </View>

            {/* Baris 3: Kedaluwarsa & Rata-rata layanan */}
            <View style={styles.gridRow}>
              <StatTile
                label="Kedaluwarsa"
                value={summary?.expired ?? 0}
                variant="card"
                icon="alert-circle-outline"
                iconTone="muted"
              />
              <StatTile
                label="Rata-rata layanan"
                value={avgServiceValue}
                unit={avgServiceUnit}
                variant="filledAccent"
                icon="timer-outline"
              />
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonStack: {
    gap: theme.spacing.md,
  },
  contentStack: {
    gap: theme.spacing.lg,
  },
  dateSelectorWrap: {
    gap: theme.spacing.sm,
  },
  datePillBar: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.pill,
    padding: theme.spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    ...theme.shadows.soft,
  },
  arrowCircle: {
    width: theme.sizes.touchMin,
    height: theme.sizes.touchMin,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCirclePressed: {
    backgroundColor: theme.colors.primarySoft,
  },
  arrowCircleDisabled: {
    opacity: 0.45,
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs + 2,
  },
  dateLabelText: {
    ...theme.typography.bodyLgStrong,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  dateSubText: {
    ...theme.typography.caption,
    textAlign: 'center',
  },
  resetChipRow: {
    alignItems: 'center',
  },
  metricsGrid: {
    gap: theme.spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
