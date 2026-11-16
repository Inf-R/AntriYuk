import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMyBusiness, useUpdateBusiness } from '@/hooks/useMyBusiness';
import { useOnline } from '@/hooks/useOnline';
import { OfflineBanner } from '@/components/OfflineBanner';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { BUSINESS_CATEGORIES, businessFormSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';
import type { BusinessCategory } from '@/types/database';
import {
  Banner,
  Button,
  Card,
  CategoryTile,
  Chip,
  EmptyState,
  Input,
  Screen,
  ScreenHeader,
  Skeleton,
  Stepper,
} from '@/components/ui';

export default function PengaturanUsahaScreen() {
  const { isOnline } = useOnline();
  const {
    data: business,
    isLoading,
    error: loadError,
    refetch,
  } = useMyBusiness();
  const updateBusinessMutation = useUpdateBusiness(business?.id);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('klinik');
  const [address, setAddress] = useState('');
  const [avgServiceMinutesText, setAvgServiceMinutesText] = useState('10');
  const [graceMinutesText, setGraceMinutesText] = useState('5');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setCategory(business.category);
      setAddress(business.address ?? '');
      setAvgServiceMinutesText(String(business.avg_service_minutes));
      setGraceMinutesText(String(business.grace_minutes));
    }
  }, [business]);

  async function handleSave(): Promise<void> {
    setErrorMessage(null);
    setSuccessMessage(null);

    const avgParsed = Number.parseInt(avgServiceMinutesText.trim(), 10);
    const graceParsed = Number.parseInt(graceMinutesText.trim(), 10);

    const parsed = businessFormSchema.safeParse({
      name,
      category,
      address,
      avgServiceMinutes: Number.isNaN(avgParsed) ? 0 : avgParsed,
      graceMinutes: Number.isNaN(graceParsed) ? 0 : graceParsed,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setErrorMessage(
        firstIssue?.message ?? 'Periksa kembali data pengaturan usaha Anda.'
      );
      return;
    }

    try {
      await updateBusinessMutation.mutateAsync(parsed.data);
      setSuccessMessage('Pengaturan usaha berhasil disimpan.');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <Screen header={<ScreenHeader title="Pengaturan Usaha" />}>
        <View style={styles.skeletonStack} accessibilityLabel="Memuat pengaturan usaha">
          <Card style={styles.skeletonCard}>
            <Skeleton width={56} height={56} radius={theme.radii.tile} />
            <Skeleton width="100%" height={52} radius={theme.radii.input} />
            <Skeleton width="100%" height={40} radius={theme.radii.pill} />
            <Skeleton width="100%" height={52} radius={theme.radii.input} />
          </Card>
          <Card style={styles.skeletonCard}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="100%" height={56} radius={theme.radii.input} />
            <Skeleton width="100%" height={56} radius={theme.radii.input} />
          </Card>
        </View>
      </Screen>
    );
  }

  if (loadError || !business) {
    return (
      <Screen header={<ScreenHeader title="Pengaturan Usaha" />}>
        <OfflineBanner />
        <Card>
          <EmptyState
            illustration="empty"
            title="Gagal Memuat Pengaturan"
            description={
              loadError
                ? getFriendlyErrorMessage(loadError)
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

  const isSaving = updateBusinessMutation.isPending;
  const isActionDisabled = isSaving || !isOnline;
  const selectedCategoryLabel =
    BUSINESS_CATEGORIES.find((c) => c.value === category)?.label ?? category;

  return (
    <Screen
      header={<ScreenHeader title="Pengaturan Usaha" />}
      footer={
        <Button
          label="Simpan Perubahan"
          size="l"
          iconLeft="checkmark-circle-outline"
          onPress={() => {
            void handleSave();
          }}
          loading={isSaving}
          disabled={isActionDisabled}
          accessibilityLabel="Simpan perubahan pengaturan usaha"
        />
      }
    >
      <OfflineBanner />

      <View style={styles.contentStack}>
        {successMessage ? (
          <Banner tone="success" message={successMessage} />
        ) : null}

        {errorMessage ? (
          <Banner tone="danger" message={errorMessage} />
        ) : null}

        {/* Kartu 1: Informasi Usaha */}
        <Card style={styles.sectionCard}>
          <View style={styles.identityPreview}>
            <CategoryTile category={category} size={56} iconSize={28} />
            <View style={styles.identityTexts}>
              <Text style={styles.sectionHeading} accessibilityRole="header">
                Informasi Usaha
              </Text>
              <Text style={styles.sectionCaption}>
                {name.trim() || 'Nama Usaha'} • {selectedCategoryLabel}
              </Text>
            </View>
          </View>

          <Input
            label="Nama Usaha"
            iconLeft="storefront-outline"
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Klinik Pratama Sehat"
            maxLength={80}
            editable={!isSaving}
          />

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Kategori Usaha</Text>
            <View style={styles.chipsWrap}>
              {BUSINESS_CATEGORIES.map((item) => {
                const selected = category === item.value;
                return (
                  <Chip
                    key={item.value}
                    label={item.label}
                    category={item.value}
                    active={selected}
                    disabled={isSaving}
                    onPress={() => setCategory(item.value)}
                    accessibilityLabel={`Kategori ${item.label}`}
                  />
                );
              })}
            </View>
          </View>

          <Input
            label="Alamat"
            iconLeft="location-outline"
            value={address}
            onChangeText={setAddress}
            placeholder="Alamat lengkap lokasi usaha"
            maxLength={200}
            editable={!isSaving}
          />
        </Card>

        {/* Kartu 2: Pengaturan Antrean */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderBlock}>
            <Text style={styles.sectionHeading} accessibilityRole="header">
              Pengaturan Antrean
            </Text>
            <Text style={styles.sectionCaption}>
              Digunakan untuk menghitung estimasi waktu tunggu dan batas kedatangan pelanggan.
            </Text>
          </View>

          <Stepper
            label="Rata-rata layanan"
            valueText={avgServiceMinutesText}
            onChangeText={setAvgServiceMinutesText}
            min={1}
            max={240}
            unit="menit"
            helper="Rentang 1–240 menit"
            disabled={isSaving}
          />

          <Stepper
            label="Masa tunggu panggilan"
            valueText={graceMinutesText}
            onChangeText={setGraceMinutesText}
            min={1}
            max={30}
            unit="menit"
            helper="Rentang 1–30 menit"
            disabled={isSaving}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonStack: {
    gap: theme.spacing.lg,
  },
  skeletonCard: {
    gap: theme.spacing.md,
  },
  contentStack: {
    gap: theme.spacing.lg,
  },
  sectionCard: {
    gap: theme.spacing.lg,
  },
  identityPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
  },
  identityTexts: {
    flex: 1,
    gap: 2,
  },
  cardHeaderBlock: {
    gap: 4,
  },
  sectionHeading: {
    ...theme.typography.subtitle,
  },
  sectionCaption: {
    ...theme.typography.caption,
  },
  fieldBlock: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    ...theme.typography.label,
    color: theme.colors.ink,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
});
