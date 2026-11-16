import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateBusiness } from '@/hooks/useMyBusiness';
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
  GeoIllustration,
  IconButton,
  Input,
  Screen,
  ScreenHeader,
  Stepper,
} from '@/components/ui';

export default function OnboardingPemilikScreen() {
  const router = useRouter();
  const { isOnline } = useOnline();
  const createBusinessMutation = useCreateBusiness();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('klinik');
  const [address, setAddress] = useState('');
  const [avgServiceMinutesText, setAvgServiceMinutesText] = useState('10');
  const [graceMinutesText, setGraceMinutesText] = useState('5');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    setErrorMessage(null);

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
        firstIssue?.message ?? 'Periksa kembali data usaha yang Anda masukkan.'
      );
      return;
    }

    try {
      await createBusinessMutation.mutateAsync(parsed.data);
      router.replace('/(pemilik)');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    }
  }

  const isSubmitting = createBusinessMutation.isPending;
  const isActionDisabled = isSubmitting || !isOnline;

  return (
    <Screen
      edges={['top', 'left', 'right', 'bottom']}
      header={
        <ScreenHeader
          title="Daftarkan usaha Anda"
          subtitle="Lengkapi informasi usaha agar pelanggan dapat mengambil nomor antrean dari rumah."
          right={
            <IconButton
              icon="person-circle-outline"
              onPress={() => router.push('/(pemilik)/profil')}
              accessibilityLabel="Buka profil pemilik"
            />
          }
        />
      }
      footer={
        <Button
          label="Simpan & Buka Dasbor"
          size="l"
          iconRight="arrow-forward"
          onPress={() => {
            void handleSubmit();
          }}
          loading={isSubmitting}
          disabled={isActionDisabled}
          accessibilityLabel="Simpan data usaha dan buka dasbor"
        />
      }
    >
      <OfflineBanner />

      <View style={styles.contentStack}>
        <View style={styles.illustrationWrap}>
          <GeoIllustration variant="hero" size={120} />
        </View>

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
                Pilih kategori dan tulis nama usaha yang mudah dikenali pelanggan.
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
            editable={!isSubmitting}
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
                    disabled={isSubmitting}
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
            placeholder="Contoh: Jl. Melati No. 10, Bandung"
            maxLength={200}
            editable={!isSubmitting}
          />
        </Card>

        {/* Kartu 2: Pengaturan Antrean */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderBlock}>
            <Text style={styles.sectionHeading} accessibilityRole="header">
              Pengaturan Antrean
            </Text>
            <Text style={styles.sectionCaption}>
              Anda dapat mengubah pengaturan ini kapan saja di menu Pengaturan.
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
            disabled={isSubmitting}
          />

          <Stepper
            label="Masa tunggu panggilan"
            valueText={graceMinutesText}
            onChangeText={setGraceMinutesText}
            min={1}
            max={30}
            unit="menit"
            helper="Bawaan 5 (1–30 menit)"
            disabled={isSubmitting}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentStack: {
    gap: theme.spacing.lg,
  },
  illustrationWrap: {
    alignItems: 'center',
    marginVertical: -theme.spacing.xs,
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
