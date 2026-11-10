import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCreateBusiness } from '@/hooks/useMyBusiness';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { BUSINESS_CATEGORIES, businessFormSchema } from '@/lib/validation';
import { theme } from '@/lib/theme';
import type { BusinessCategory } from '@/types/database';

export default function OnboardingPemilikScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Daftarkan Usaha Anda</Text>
            <Text style={styles.subtitle}>
              Lengkapi informasi usaha agar pelanggan dapat mengambil nomor antrean dari rumah.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama Usaha</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Klinik Pratama Sehat"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={80}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kategori Usaha</Text>
              <View style={styles.chipsWrap}>
                {BUSINESS_CATEGORIES.map((item) => {
                  const selected = category === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setCategory(item.value)}
                      disabled={isSubmitting}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Alamat Usaha</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="Contoh: Jl. Melati No. 10, Bandung"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={200}
                multiline
                numberOfLines={2}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, styles.halfField]}>
                <Text style={styles.label}>Rata-rata Layanan (Menit)</Text>
                <TextInput
                  style={styles.input}
                  value={avgServiceMinutesText}
                  onChangeText={(val) =>
                    setAvgServiceMinutesText(val.replace(/\D/g, ''))
                  }
                  placeholder="10"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!isSubmitting}
                />
                <Text style={styles.helperText}>Rentang 1–240 menit</Text>
              </View>

              <View style={[styles.fieldGroup, styles.halfField]}>
                <Text style={styles.label}>Masa Tunggu Panggilan (Menit)</Text>
                <TextInput
                  style={styles.input}
                  value={graceMinutesText}
                  onChangeText={(val) =>
                    setGraceMinutesText(val.replace(/\D/g, ''))
                  }
                  placeholder="5"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!isSubmitting}
                />
                <Text style={styles.helperText}>Bawaan 5 (1–30 menit)</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && !isSubmitting && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Simpan & Buka Dasbor</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  errorBox: {
    backgroundColor: theme.colors.status.cancelled.background,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.status.cancelled.text,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  rowFields: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfField: {
    flex: 1,
  },
  label: {
    ...theme.typography.bodyBold,
    marginBottom: theme.spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    ...theme.typography.body,
  },
  multilineInput: {
    minHeight: 72,
    paddingTop: theme.spacing.sm,
    textAlignVertical: 'top',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
  helperText: {
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
  button: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  buttonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  buttonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
});
