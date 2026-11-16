import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import {
  formatWibDateTime,
  useTicketHistory,
  type TicketHistoryItem,
} from '@/hooks/useCustomerQueue';
import {
  formatWibDateLabel,
  formatWibTimeOnly,
  getTodayWibDateString,
  shiftWibDateString,
} from '@/hooks/useOwnerSession';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { theme } from '@/lib/theme';
import type { TicketStatus } from '@/types/database';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  IconName,
  PillStatus,
  Screen,
  ScreenHeader,
  Skeleton,
  StatusPill,
} from '@/components/ui';

function getHistoryStatusVisual(status: TicketStatus): {
  pillStatus: PillStatus;
  icon: IconName;
  iconColor: string;
  iconBg: string;
} {
  switch (status) {
    case 'waiting':
      return {
        pillStatus: 'waiting',
        icon: 'time-outline',
        iconColor: theme.colors.slateText,
        iconBg: theme.colors.status.waiting.background,
      };
    case 'called':
      return {
        pillStatus: 'called',
        icon: 'megaphone-outline',
        iconColor: theme.colors.status.called.text,
        iconBg: theme.colors.status.called.background,
      };
    case 'done':
      return {
        pillStatus: 'done',
        icon: 'checkmark-circle',
        iconColor: theme.colors.status.called.text,
        iconBg: theme.colors.status.called.background,
      };
    case 'cancelled':
      return {
        pillStatus: 'cancelled',
        icon: 'close-circle-outline',
        iconColor: theme.colors.status.cancelled.text,
        iconBg: theme.colors.status.cancelled.background,
      };
    case 'no_show':
      return {
        pillStatus: 'no_show',
        icon: 'person-remove-outline',
        iconColor: theme.colors.status.cancelled.text,
        iconBg: theme.colors.status.cancelled.background,
      };
    case 'expired':
      return {
        pillStatus: 'expired',
        icon: 'alert-circle-outline',
        iconColor: theme.colors.slateText,
        iconBg: theme.colors.canvas,
      };
  }
}

function getWibDateGroupLabel(
  isoString: string,
  todayWib: string,
  yesterdayWib: string
): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return 'Riwayat';
  }
  const dateKey = getTodayWibDateString(parsed);
  if (dateKey === todayWib) {
    return 'Hari Ini';
  }
  if (dateKey === yesterdayWib) {
    return 'Kemarin';
  }
  return formatWibDateLabel(dateKey);
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
  const todayWib = getTodayWibDateString();
  const yesterdayWib = shiftWibDateString(todayWib, -1);

  function renderHistoryItem({
    item,
    index,
  }: {
    item: TicketHistoryItem;
    index: number;
  }) {
    const visual = getHistoryStatusVisual(item.status);
    const currentGroup = getWibDateGroupLabel(
      item.createdAt,
      todayWib,
      yesterdayWib
    );
    const prevItem = index > 0 ? items[index - 1] : undefined;
    const prevGroup = prevItem
      ? getWibDateGroupLabel(prevItem.createdAt, todayWib, yesterdayWib)
      : null;
    const showGroupHeader = currentGroup !== prevGroup;

    return (
      <View style={styles.itemWrapper}>
        {showGroupHeader ? (
          <Text style={styles.groupHeader} accessibilityRole="header">
            {currentGroup}
          </Text>
        ) : null}

        <Card padding="md">
          <View style={styles.rowBetween}>
            <View
              style={[
                styles.statusCircle,
                { backgroundColor: visual.iconBg },
              ]}
            >
              <Icon name={visual.icon} size={22} color={visual.iconColor} />
            </View>

            <View style={styles.businessInfo}>
              <Text style={styles.businessName} numberOfLines={1}>
                {item.businessName}
              </Text>
              <Text style={styles.dateText}>
                Pukul {formatWibTimeOnly(item.createdAt)} •{' '}
                {formatWibDateTime(item.createdAt)}
              </Text>
              <View style={styles.pillRow}>
                <StatusPill status={visual.pillStatus} size="sm" />
              </View>
            </View>

            <View style={styles.numberChip}>
              <Text style={styles.numberChipLabel}>Nomor</Text>
              <Text style={styles.numberChipValue}>{item.number}</Text>
            </View>
          </View>
        </Card>
      </View>
    );
  }

  if (isLoading) {
    return (
      <Screen header={<ScreenHeader title="Riwayat Antrean" />}>
        <View style={styles.skeletonList} accessibilityLabel="Memuat riwayat antrean">
          {[0, 1, 2, 3].map((key) => (
            <Card key={key} padding="md">
              <View style={styles.rowBetween}>
                <Skeleton width={44} height={44} radius={theme.radii.pill} />
                <View style={styles.skeletonTexts}>
                  <Skeleton width="60%" height={18} />
                  <Skeleton width="45%" height={14} />
                </View>
                <Skeleton width={56} height={48} radius={theme.radii.button} />
              </View>
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen header={<ScreenHeader title="Riwayat Antrean" />}>
        <OfflineBanner />
        <Banner
          tone="danger"
          title="Gagal Memuat Riwayat"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Coba Lagi"
          onAction={() => {
            void refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll={false}
      padded={false}
      header={
        <View style={styles.headerWrap}>
          <ScreenHeader title="Riwayat Antrean" />
        </View>
      }
    >
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        ListHeaderComponent={<OfflineBanner />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
          <Card>
            <EmptyState
              illustration="empty"
              title="Belum Ada Riwayat Antrean"
              description="Semua nomor antrean yang pernah Anda ambil akan tercatat di sini."
            />
          </Card>
        }
        ListFooterComponent={
          hasNextPage ? (
            <Button
              label="Muat Lebih Banyak"
              variant="secondary"
              iconLeft="refresh"
              onPress={() => {
                void fetchNextPage();
              }}
              loading={isFetchingNextPage}
              disabled={isFetchingNextPage || !isOnline}
              accessibilityLabel="Muat lebih banyak riwayat antrean"
              style={styles.loadMoreBtn}
            />
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: theme.spacing.screen,
  },
  listContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  skeletonList: {
    gap: theme.spacing.md,
  },
  skeletonTexts: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  itemWrapper: {
    gap: theme.spacing.xs + 2,
  },
  groupHeader: {
    ...theme.typography.label,
    color: theme.colors.slateText,
    marginTop: theme.spacing.xs,
    paddingHorizontal: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  statusCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInfo: {
    flex: 1,
    gap: 3,
  },
  businessName: {
    ...theme.typography.subtitle,
    fontSize: 16,
  },
  dateText: {
    ...theme.typography.caption,
  },
  pillRow: {
    marginTop: 2,
    flexDirection: 'row',
  },
  numberChip: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
  },
  numberChipLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 14,
    color: theme.colors.primary,
  },
  numberChipValue: {
    ...theme.typography.subtitle,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  loadMoreBtn: {
    marginTop: theme.spacing.sm,
  },
});
