import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

export default function KebijakanPrivasiScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Kebijakan Privasi AntriYuk</Text>
          <Text style={styles.caption}>Isi Sementara — Dokumen Pratinjau Tugas Kuliah INF2528</Text>

          <Text style={styles.sectionTitle}>1. Data yang Kami Kumpulkan</Text>
          <Text style={styles.paragraph}>
            AntriYuk hanya mengumpulkan data minimum yang diperlukan untuk layanan antrean digital,
            yaitu alamat email, nama tampilan, peran akun (Pelanggan atau Pemilik Usaha), riwayat
            nomor antrean, serta token notifikasi perangkat Android.
          </Text>

          <Text style={styles.sectionTitle}>2. Penggunaan Data</Text>
          <Text style={styles.paragraph}>
            Data Anda digunakan semata-mata untuk mencatat nomor antrean, menampilkan estimasi waktu
            tunggu, dan mengirimkan pemberitahuan saat giliran Anda hampir tiba atau dipanggil. Kami
            tidak mengumpulkan rekam medis atau data kesehatan sensitif.
          </Text>

          <Text style={styles.sectionTitle}>3. Keamanan & Penghapusan Akun</Text>
          <Text style={styles.paragraph}>
            Sesi login disimpan secara terenkripsi di perangkat Anda. Anda dapat menghapus akun
            beserta seluruh data profil dan riwayat antrean kapan saja melalui menu Profil di dalam
            aplikasi.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  caption: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  paragraph: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
});
