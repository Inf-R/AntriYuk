import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { getFriendlyErrorMessage } from '@/lib/errors';
import { BUSINESS_CATEGORIES } from '@/lib/validation';
import { theme } from '@/lib/theme';
import type { BusinessCategory } from '@/types/database';

type FilterCategory = 'semua' | BusinessCategory;

const FILTER_OPTIONS: readonly { value: FilterCategory; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  ...BUSINESS_CATEGORIES,
];

export default function PelangganBerandaScreen() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>('semua');

  // Debounce pencarian nama 300 ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

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

  function renderBusinessCard({ item }: { item: BusinessRow }) {
    const categoryLabel =
      BUSINESS_CATEGORIES.find((c) => c.value === item.category)?.label ??
      item.category;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() =>
          router.push({
            pathname: '/(pelanggan)/usaha/[id]',
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardCategory}>{categoryLabel}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              item.is_queue_open ? styles.statusOpen : styles.statusClosed,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.is_queue_open
                  ? styles.statusOpenText
                  : styles.statusClosedText,
              ]}
            >
              {item.is_queue_open ? 'Buka' : 'Tutup'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardAddress} numberOfLines={2}>
          {item.address && item.address.trim().length > 0
            ? item.address
            : 'Alamat belum dicantumkan'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* BAR PENCARIAN & FILTER CHIPS */}
      <View style={styles.filterHeader}>
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Cari nama usaha..."
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {FILTER_OPTIONS.map((item) => {
            const active = selectedCategory === item.value;
            return (
              <Pressable
                key={item.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(item.value)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ISI DAFTAR USAHA */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Memuat daftar usaha...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>Gagal Memuat Daftar Usaha</Text>
            <Text style={styles.errorBody}>
              {getFriendlyErrorMessage(error)}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={() => {
                void refetch();
              }}
            >
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={businesses ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderBusinessCard}
          contentContainerStyle={styles.listContent}
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
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Usaha tidak ditemukan</Text>
              <Text style={styles.mutedText}>
                Coba ubah kata kunci pencarian atau pilih kategori lainnya.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterHeader: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  searchInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    ...theme.typography.body,
  },
  chipsContainer: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    color: theme.colors.surface,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    ...theme.typography.subheading,
    marginBottom: 2,
  },
  cardCategory: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  statusOpen: {
    backgroundColor: theme.colors.status.called.background,
  },
  statusClosed: {
    backgroundColor: theme.colors.status.waiting.background,
  },
  statusText: {
    ...theme.typography.bodyBold,
    fontSize: 12,
  },
  statusOpenText: {
    color: theme.colors.status.called.text,
  },
  statusClosedText: {
    color: theme.colors.status.waiting.text,
  },
  cardAddress: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  mutedText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  stateCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
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
  retryButton: {
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
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.subheading,
    textAlign: 'center',
  },
});
