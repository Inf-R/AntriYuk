import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineBanner } from '@/components/OfflineBanner';
import { theme } from '@/lib/theme';

export default function KebijakanPrivasiScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.disclaimerBanner} accessibilityRole="alert">
            <Text style={styles.disclaimerTitle}>Catatan Penting (Bukan Nasihat Hukum)</Text>
            <Text style={styles.disclaimerText}>
              Dokumen ini adalah draf ringkas kebijakan privasi aplikasi proyek akademik AntriYuk
              dan bukan merupakan nasihat hukum resmi. Pengelola usaha atau pengembang yang
              merilis aplikasi ke publik wajib meninjau ulang dokumen ini bersama penasihat hukum.
            </Text>
          </View>

          <Text style={styles.title} accessibilityRole="header">
            Kebijakan Privasi AntriYuk
          </Text>
          <Text style={styles.caption}>
            Disusun dengan merujuk pada Undang-Undang Republik Indonesia Nomor 27 Tahun 2022
            tentang Pelindungan Data Pribadi (UU PDP No. 27/2022).
          </Text>

          <Text style={styles.sectionTitle}>1. Data Pribadi yang Dikumpulkan</Text>
          <Text style={styles.paragraph}>
            Sesuai prinsip minimalisasi data pada UU PDP No. 27/2022, AntriYuk hanya mengumpulkan
            data yang mutlak diperlukan untuk menyelenggarakan layanan antrean digital, meliputi:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Nama tampilan</Text>: digunakan untuk identifikasi saat
              nomor antrean dipanggil di lokasi usaha.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Alamat email</Text>: digunakan untuk autentikasi akun,
              verifikasi kode OTP pendaftaran, dan pemulihan kata sandi.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Data tiket antrean</Text>: meliputi nomor antrean,
              status tiket, waktu pengambilan, dan riwayat kunjungan pada usaha tujuan.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Token notifikasi perangkat</Text> (Expo Push Token):
              digunakan untuk mengirimkan pemberitahuan dorong (push notification) ke perangkat
              Android Anda.
            </Text>
          </View>
          <Text style={styles.paragraph}>
            AntriYuk <Text style={styles.bold}>tidak</Text> mengumpulkan data rekam medis, keluhan
            kesehatan, lokasi GPS, nomor induk kependudukan (NIK), maupun data keuangan.
          </Text>

          <Text style={styles.sectionTitle}>2. Tujuan Pemrosesan Data</Text>
          <Text style={styles.paragraph}>
            Data pribadi Anda diproses semata-mata untuk:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • Mencatat dan mengelola urutan nomor antrean secara adil dan waktu-nyata (realtime).
            </Text>
            <Text style={styles.bulletItem}>
              • Menampilkan estimasi waktu tunggu dan status antrean kepada pelanggan.
            </Text>
            <Text style={styles.bulletItem}>
              • Mengirimkan notifikasi otomatis ketika giliran Anda hampir tiba atau sedang
              dipanggil oleh pemilik usaha.
            </Text>
            <Text style={styles.bulletItem}>
              • Menyajikan ringkasan statistik operasional harian bagi pemilik usaha.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>3. Penyimpanan dan Retensi Data</Text>
          <Text style={styles.paragraph}>
            Data akun dan antrean disimpan pada basis data terkelola dengan pembatasan akses per
            baris (Row Level Security) serta penyimpanan sesi terenkripsi di perangkat. Data
            pribadi Anda disimpan selama akun Anda aktif dan akan{' '}
            <Text style={styles.bold}>dihapus secara permanen bersama akun</Text> apabila Anda
            melakukan penghapusan akun.
          </Text>

          <Text style={styles.sectionTitle}>
            4. Hak Subjek Data (Termasuk Hapus Akun di Aplikasi)
          </Text>
          <Text style={styles.paragraph}>
            Sebagaimana diatur dalam UU PDP No. 27/2022, Anda memiliki hak untuk mengakses,
            memperbarui nama tampilan, menarik persetujuan notifikasi, serta mengakhiri pemrosesan
            dan menghapus data pribadi Anda.
          </Text>
          <Text style={styles.paragraph}>
            Anda dapat menggunakan fitur <Text style={styles.bold}>Hapus Akun Saya</Text> secara
            mandiri kapan saja melalui menu <Text style={styles.bold}>Profil</Text> di dalam
            aplikasi (baik sebagai Pelanggan maupun Pemilik Usaha). Saat akun dihapus, profil,
            usaha terkait, riwayat tiket, token notifikasi, dan cache lokal di perangkat akan
            dihapus seketika.
          </Text>

          <Text style={styles.sectionTitle}>5. Kontak Pengelola</Text>
          <Text style={styles.paragraph}>
            Apabila Anda memiliki pertanyaan, permintaan terkait pelindungan data pribadi, atau
            pengaduan atas pemrosesan data di AntriYuk, silakan hubungi kami melalui:
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactText}>Penanggung Jawab: [ISI NAMA PENGELOLA / TIM]</Text>
            <Text style={styles.contactText}>Email Kontak: [ISI ALAMAT EMAIL KONTAK]</Text>
            <Text style={styles.contactText}>Alamat / Instansi: [ISI ALAMAT / PROGRAM STUDI]</Text>
          </View>
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
  disclaimerBanner: {
    backgroundColor: theme.colors.status.approaching.background,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.status.approaching.text,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  disclaimerTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.status.approaching.text,
    marginBottom: 4,
  },
  disclaimerText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
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
    marginBottom: theme.spacing.sm,
  },
  bulletList: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.xs,
  },
  bulletItem: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  bold: {
    fontWeight: '700',
  },
  contactBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  contactText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
  },
});
