import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  formatWibDateTime,
  useTicketHistory,
  type TicketHistoryItem,
} from '@/hooks/useCustomerQueue';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { theme } from '@/lib/theme';
import type { TicketStatus } from '@/types/database';

function getTicketStatusStyle(status: TicketStatus): {
  label: string;
  textColor: string;
  bgColor: string;
} {
  switch (status) {
    case 'waiting':
      return {
        label: 'Menunggu',
        textColor: theme.colors.status.waiting.text,
        bgColor: theme.colors.status.waiting.background,
      };
    case 'called':
      return {
        label: 'Dipanggil',
        textColor: theme.colors.status.called.text,
        bgColor: theme.colors.status.called.background,
      };
    case 'done':
      return {
        label: 'Selesai',
        textColor: theme.colors.status.called.text,
        bgColor: theme.colors.status.called.background,
      };
    case 'cancelled':
      return {
        label: 'Dibatalkan',
        textColor: theme.colors.status.cancelled.text,
        bgColor: theme.colors.status.cancelled.background,
      };
    case 'no_show':
      return {
        label: 'Tidak Hadir',
        textColor: theme.colors.status.cancelled.text,
        bgColor: theme.colors.status.cancelled.background,
      };
    case 'expired':
      return {
        label: 'Kedaluwarsa',
        textColor: theme.colors.status.approaching.text,
        bgColor: theme.colors.status.approaching.background,
      };
  }
}

export default function RiwayatPelangganScreen() {
  const { isOnline } = useOnline();
  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    error,
    refetch,
    fetchNextPage,
  } = useTicketHistory();

  const items = data?.pages.flat() ?? [];

  function renderHistoryItem({ item }: { item: TicketHistoryItem }) {
    const statusStyle = getTicketStatusStyle(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{item.businessName}</Text>
            <Text style={styles.dateText}>
              {formatWibDateTime(item.createdAt)}
            </Text>
          </View>

          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeLabel}>Nomor</Text>
            <Text style={styles.numberBadgeValue}>{item.number}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusStyle.bgColor },
            ]}
          >
            <Text
              style={[styles.statusPillText, { color: statusStyle.textColor }]}
            >
              {statusStyle.label}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.mutedText}>Memuat riwayat antrean...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <OfflineBanner />
        <View style={styles.centerBox}>
          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>Gagal Memuat Riwayat</Text>
            <Text style={styles.errorBody}>
              {getFriendlyErrorMessage(error)}
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
              accessibilityLabel="Coba muat ulang riwayat antrean"
            >
              <Text style={styles.buttonText}>Coba Lagi</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => {
              void refetch();
            }}
            colors={[theme.colors.primary]}
          />
        }
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        ListEmptyComponent={
          <View style={styles.stateCard}>
            <Text style={styles.emptyTitle}>Belum Ada Riwayat Antrean</Text>
            <Text style={styles.mutedText}>
              Semua nomor antrean yang pernah Anda ambil akan tercatat di sini.
            </Text>
          </View>
        }
        ListFooterComponent={
          hasNextPage ? (
            <Pressable
              style={({ pressed }) => [
                styles.loadMoreButton,
                (!isOnline || isFetchingNextPage) && styles.loadMoreButtonDisabled,
                pressed && isOnline && !isFetchingNextPage && styles.loadMoreButtonPressed,
              ]}
              onPress={() => {
                void fetchNextPage();
              }}
              disabled={isFetchingNextPage || !isOnline}
              accessibilityRole="button"
              accessibilityLabel="Muat lebih banyak riwayat antrean"
            >
              {isFetchingNextPage ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.loadMoreText,
                    !isOnline && styles.loadMoreTextDisabled,
                  ]}
                >
                  Muat Lebih Banyak
                </Text>
              )}
            </Pressable>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
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
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    ...theme.typography.subheading,
    marginBottom: 4,
  },
  dateText: {
    ...theme.typography.caption,
  },
  numberBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    minWidth: 64,
  },
  numberBadgeLabel: {
    ...theme.typography.caption,
    fontSize: 10,
  },
  numberBadgeValue: {
    ...theme.typography.heading,
  },
  footerRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
  },
  statusPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
  },
  statusPillText: {
    ...theme.typography.bodyBold,
    fontSize: 12,
  },
  stateCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.subheading,
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
  button: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  buttonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
  loadMoreButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  loadMoreButtonPressed: {
    backgroundColor: theme.colors.background,
  },
  loadMoreButtonDisabled: {
    borderColor: theme.colors.border,
  },
  loadMoreText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  loadMoreTextDisabled: {
    color: theme.colors.textMuted,
  },
});
