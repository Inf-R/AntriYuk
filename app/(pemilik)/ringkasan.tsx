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
import { SafeAreaView } from 'react-native-safe-area-context';
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
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat data usaha...</Text>
      </SafeAreaView>
    );
  }

  if (businessError || !business) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OfflineBanner />
        <View style={styles.centeredContainer}>
          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>Gagal Memuat Usaha</Text>
            <Text style={styles.errorText}>
              {businessError
                ? getFriendlyErrorMessage(businessError)
                : 'Data usaha tidak ditemukan.'}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={() => {
                void refetchBusiness();
              }}
              accessibilityRole="button"
              accessibilityLabel="Coba muat ulang data usaha"
            >
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const hasData = Boolean(summary && summary.total > 0);
  const avgServiceText =
    summary?.avg_service_minutes !== null &&
    summary?.avg_service_minutes !== undefined
      ? `${summary.avg_service_minutes.toFixed(1)} menit`
      : '-';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <ScrollView
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
        {/* NAVIGASI TANGGAL (HARI SEBELUMNYA / HARI SESUDAHNYA) */}
        <View style={styles.dateCard}>
          <Text style={styles.businessTitle}>{business.name}</Text>
          <View style={styles.dateRow}>
            <Pressable
              style={({ pressed }) => [
                styles.dateNavButton,
                isBusy && styles.dateNavButtonDisabled,
                pressed && !isBusy && styles.dateNavButtonPressed,
              ]}
              onPress={handlePrevDay}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Lihat ringkasan hari sebelumnya"
            >
              <Text style={styles.dateNavButtonText}>← Sebelumnya</Text>
            </Pressable>

            <View style={styles.dateCenterBlock}>
              <Text style={styles.dateLabelText}>
                {formatWibDateLabel(selectedDate)}
              </Text>
              <Text style={styles.dateSubText}>
                {isToday ? 'Hari Ini (WIB)' : `${selectedDate} (WIB)`}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.dateNavButton,
                isBusy && styles.dateNavButtonDisabled,
                pressed && !isBusy && styles.dateNavButtonPressed,
              ]}
              onPress={handleNextDay}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Lihat ringkasan hari sesudahnya"
            >
              <Text style={styles.dateNavButtonText}>Sesudahnya →</Text>
            </Pressable>
          </View>

          {!isToday ? (
            <Pressable
              style={({ pressed }) => [
                styles.todayResetChip,
                pressed && !isBusy && styles.todayResetChipPressed,
              ]}
              onPress={() => {
                if (!isBusy) {
                  setSelectedDate(todayWib);
                }
              }}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke ringkasan hari ini"
            >
              <Text style={styles.todayResetChipText}>Kembali ke Hari Ini</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ISI RINGKASAN HARIAN */}
        {summaryLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Memuat ringkasan harian...</Text>
          </View>
        ) : summaryError ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>Gagal Memuat Ringkasan</Text>
            <Text style={styles.errorText}>
              {getFriendlyErrorMessage(summaryError)}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={() => {
                void refetch();
              }}
              accessibilityRole="button"
              accessibilityLabel="Coba muat ulang ringkasan harian"
            >
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </Pressable>
          </View>
        ) : !hasData ? (
          <View style={styles.stateCard}>
            <Text style={styles.emptyTitle}>Belum ada data</Text>
            <Text style={styles.emptySubtext}>
              Belum terdapat tiket antrean yang tercatat pada tanggal ini.
            </Text>
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            {/* KARTU UTAMA: TOTAL & RATA-RATA MENIT LAYANAN */}
            <View style={styles.metricsRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Tiket</Text>
                <Text style={styles.summaryBigValue}>{summary?.total ?? 0}</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Rata-rata Layanan</Text>
                <Text style={styles.summaryAvgValue}>{avgServiceText}</Text>
              </View>
            </View>

            {/* KARTU RINCIAN STATUS: SELESAI & BATAL */}
            <View style={styles.metricsRow}>
              <View style={[styles.summaryCard, styles.cardDone]}>
                <Text style={styles.summaryLabelDone}>Selesai</Text>
                <Text style={styles.summaryValueDone}>
                  {summary?.done ?? 0}
                </Text>
              </View>

              <View style={[styles.summaryCard, styles.cardCancelled]}>
                <Text style={styles.summaryLabelCancelled}>Batal</Text>
                <Text style={styles.summaryValueCancelled}>
                  {summary?.cancelled ?? 0}
                </Text>
              </View>
            </View>

            {/* KARTU RINCIAN STATUS: TIDAK HADIR & KEDALUWARSA */}
            <View style={styles.metricsRow}>
              <View style={[styles.summaryCard, styles.cardNoShow]}>
                <Text style={styles.summaryLabelNoShow}>Tidak Hadir</Text>
                <Text style={styles.summaryValueNoShow}>
                  {summary?.no_show ?? 0}
                </Text>
              </View>

              <View style={[styles.summaryCard, styles.cardExpired]}>
                <Text style={styles.summaryLabelExpired}>Kedaluwarsa</Text>
                <Text style={styles.summaryValueExpired}>
                  {summary?.expired ?? 0}
                </Text>
              </View>
            </View>
          </View>
        )}
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
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  dateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  businessTitle: {
    ...theme.typography.subheading,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  dateRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  dateNavButton: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavButtonPressed: {
    backgroundColor: theme.colors.border,
  },
  dateNavButtonDisabled: {
    opacity: 0.5,
  },
  dateNavButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    fontSize: 13,
  },
  dateCenterBlock: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabelText: {
    ...theme.typography.bodyBold,
    textAlign: 'center',
  },
  dateSubText: {
    ...theme.typography.caption,
    marginTop: 2,
    textAlign: 'center',
  },
  todayResetChip: {
    marginTop: theme.spacing.md,
    minHeight: 44,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayResetChipPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  todayResetChipText: {
    ...theme.typography.caption,
    color: theme.colors.surface,
    fontWeight: '600',
  },
  stateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.heading,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  retryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
  metricsGrid: {
    gap: theme.spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  summaryLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  summaryBigValue: {
    ...theme.typography.heading,
    fontSize: 32,
    lineHeight: 38,
  },
  summaryAvgValue: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.primaryDark,
    textAlign: 'center',
  },
  cardDone: {
    backgroundColor: theme.colors.status.called.background,
    borderColor: theme.colors.status.called.text,
  },
  summaryLabelDone: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.called.text,
    marginBottom: theme.spacing.xs,
  },
  summaryValueDone: {
    ...theme.typography.heading,
    fontSize: 30,
    lineHeight: 36,
    color: theme.colors.status.called.text,
  },
  cardCancelled: {
    backgroundColor: theme.colors.status.waiting.background,
    borderColor: theme.colors.border,
  },
  summaryLabelCancelled: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.waiting.text,
    marginBottom: theme.spacing.xs,
  },
  summaryValueCancelled: {
    ...theme.typography.heading,
    fontSize: 30,
    lineHeight: 36,
    color: theme.colors.status.waiting.text,
  },
  cardNoShow: {
    backgroundColor: theme.colors.status.cancelled.background,
    borderColor: theme.colors.status.cancelled.text,
  },
  summaryLabelNoShow: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.cancelled.text,
    marginBottom: theme.spacing.xs,
  },
  summaryValueNoShow: {
    ...theme.typography.heading,
    fontSize: 30,
    lineHeight: 36,
    color: theme.colors.status.cancelled.text,
  },
  cardExpired: {
    backgroundColor: theme.colors.status.approaching.background,
    borderColor: theme.colors.status.approaching.text,
  },
  summaryLabelExpired: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.approaching.text,
    marginBottom: theme.spacing.xs,
  },
  summaryValueExpired: {
    ...theme.typography.heading,
    fontSize: 30,
    lineHeight: 36,
    color: theme.colors.status.approaching.text,
  },
});
