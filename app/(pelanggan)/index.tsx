import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBusinessesList, type BusinessRow } from '@/hooks/useCustomerQueue';
import { useSession } from '@/hooks/useSession';
import { OfflineBanner } from '@/components/OfflineBanner';
import { getFriendlyErrorMessage } from '@/lib/errors';
import {
  BUSINESS_CATEGORIES,
  businessSearchFilterSchema,
} from '@/lib/validation';
import { theme } from '@/lib/theme';
import type { BusinessCategory } from '@/types/database';
import {
  Banner,
  Card,
  CategoryTile,
  Chip,
  EmptyState,
  Icon,
  Screen,
  SectionTitle,
  Skeleton,
  StatusPill,
} from '@/components/ui';

type FilterCategory = 'semua' | BusinessCategory;

const FILTER_OPTIONS: readonly { value: FilterCategory; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  ...BUSINESS_CATEGORIES,
];

export default function PelangganBerandaScreen() {
  const router = useRouter();
  const { profile } = useSession();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>('semua');
  const [searchFocused, setSearchFocused] = useState(false);

  // Debounce pencarian nama 300 ms dengan validasi Zod
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = businessSearchFilterSchema.safeParse({
        search: searchInput,
        category: selectedCategory,
      });
      setDebouncedSearch(
        parsed.success ? parsed.data.search : searchInput.trim().slice(0, 80)
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, selectedCategory]);

  const {
    data: businesses,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useBusinessesList({
    search: debouncedSearch,
    category: selectedCategory,
  });

  const displayName = profile?.display_name?.trim() || 'Pelanggan';

  function renderBusinessCard({ item }: { item: BusinessRow }) {
    const categoryLabel =
      BUSINESS_CATEGORIES.find((c) => c.value === item.category)?.label ??
      item.category;
    const addressText =
      item.address && item.address.trim().length > 0
        ? item.address
        : 'Alamat belum dicantumkan';

    return (
      <Card
        padding="md"
        onPress={() =>
          router.push({
            pathname: '/(pelanggan)/usaha/[id]',
            params: { id: item.id },
          })
        }
        accessibilityLabel={`${item.name}, kategori ${categoryLabel}, status ${
          item.is_queue_open ? 'Buka' : 'Tutup'
        }`}
        style={!item.is_queue_open ? styles.cardClosed : undefined}
      >
        <View style={styles.cardRow}>
          <CategoryTile category={item.category} />

          <View style={styles.cardCenter}>
            <View style={styles.titlePillRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <StatusPill
                status={item.is_queue_open ? 'open' : 'closed'}
                size="sm"
              />
            </View>

            <Text style={styles.cardCategory} numberOfLines={1}>
              {categoryLabel}
            </Text>

            <View style={styles.addressRow}>
              <Icon
                name="location-outline"
                size={14}
                color={theme.colors.slateText}
              />
              <Text style={styles.cardAddress} numberOfLines={1}>
                {addressText}
              </Text>
            </View>
          </View>

          <Icon
            name="chevron-forward"
            size={20}
            color={theme.colors.muted}
          />
        </View>
      </Card>
    );
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <OfflineBanner />

      {/* Sapaan */}
      <View style={styles.greetingBox}>
        <Text style={styles.greetingTitle} accessibilityRole="header">
          Halo, {displayName}
        </Text>
        <Text style={styles.greetingSubtitle}>
          Mau antre di mana hari ini?
        </Text>
      </View>

      {/* Kolom Cari Putih */}
      <View
        style={[
          styles.searchBox,
          searchFocused ? styles.searchBoxFocused : null,
        ]}
      >
        <Icon
          name="search"
          size={20}
          color={searchFocused ? theme.colors.accent : theme.colors.muted}
        />
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Cari nama usaha..."
          placeholderTextColor={theme.colors.muted}
          selectionColor={theme.colors.accent}
          cursorColor={theme.colors.accent}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Cari nama usaha"
        />
        {searchInput.length > 0 ? (
          <Pressable
            onPress={() => setSearchInput('')}
            accessibilityRole="button"
            accessibilityLabel="Bersihkan kata kunci pencarian"
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Icon name="close-circle" size={18} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Chips Kategori Berikon */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {FILTER_OPTIONS.map((item) => {
          const active = selectedCategory === item.value;
          return (
            <Chip
              key={item.value}
              label={item.label}
              category={item.value}
              active={active}
              onPress={() => setSelectedCategory(item.value)}
              accessibilityLabel={`Filter kategori ${item.label}`}
            />
          );
        })}
      </ScrollView>

      <SectionTitle
        title="Daftar usaha"
        caption="Pilih tempat usaha untuk melihat antrean"
        style={styles.sectionTitle}
      />
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      {isLoading ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {listHeader}
          <View style={styles.skeletonList} accessibilityLabel="Memuat daftar usaha">
            {[0, 1, 2].map((key) => (
              <Card key={key} padding="md">
                <View style={styles.cardRow}>
                  <Skeleton width={56} height={56} radius={theme.radii.tile} />
                  <View style={styles.skeletonCol}>
                    <Skeleton width="65%" height={18} />
                    <Skeleton width="40%" height={14} />
                    <Skeleton width="85%" height={14} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {listHeader}
          <Banner
            tone="danger"
            title="Gagal memuat daftar usaha"
            message={getFriendlyErrorMessage(error)}
            actionLabel="Coba lagi"
            onAction={() => {
              void refetch();
            }}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={businesses ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderBusinessCard}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <Card>
              <EmptyState
                illustration="empty"
                title="Usaha tidak ditemukan"
                description="Coba ubah kata kunci pencarian atau pilih kategori lainnya."
              />
            </Card>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  headerBlock: {
    gap: theme.spacing.md,
  },
  greetingBox: {
    paddingTop: theme.spacing.xs,
    gap: 2,
  },
  greetingTitle: {
    ...theme.typography.title,
  },
  greetingSubtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.slateText,
  },
  searchBox: {
    minHeight: theme.sizes.inputHeight,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.input,
    borderWidth: 2,
    borderColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
    ...theme.shadows.soft,
  },
  searchBoxFocused: {
    borderColor: theme.colors.accent,
  },
  searchInput: {
    ...theme.typography.bodyLg,
    flex: 1,
    minHeight: theme.sizes.inputHeight - 4,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sectionTitle: {
    marginTop: theme.spacing.xs,
    marginBottom: 0,
  },
  cardClosed: {
    opacity: 0.74,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  cardCenter: {
    flex: 1,
    gap: 4,
  },
  titlePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.subtitle,
    fontSize: 17,
    flex: 1,
  },
  cardCategory: {
    ...theme.typography.captionStrong,
    color: theme.colors.accent,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAddress: {
    ...theme.typography.caption,
    fontSize: 13,
    flex: 1,
  },
  skeletonList: {
    gap: theme.spacing.md,
  },
  skeletonCol: {
    flex: 1,
    gap: theme.spacing.sm,
  },
});
