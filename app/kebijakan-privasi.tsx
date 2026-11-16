import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Banner, Card, Screen, ScreenHeader } from '@/components/ui';
import { theme } from '@/lib/theme';

export default function KebijakanPrivasiScreen() {
  const router = useRouter();

  return (
    <Screen
      edges={['top', 'left', 'right', 'bottom']}
      header={
        <ScreenHeader
          title="Kebijakan Privasi"
          onBack={router.canGoBack() ? () => router.back() : undefined}
          backAccessibilityLabel="Kembali dari Kebijakan Privasi"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <OfflineBanner />

      <View style={styles.stack}>
        <Banner
          tone="warning"
          title="Catatan Penting (Bukan Nasihat Hukum)"
          message="Dokumen ini adalah draf ringkas kebijakan privasi aplikasi proyek akademik AntriYuk dan bukan merupakan nasihat hukum resmi. Pengelola usaha atau pengembang yang merilis aplikasi ke publik wajib meninjau ulang dokumen ini bersama penasihat hukum."
        />

        <Card style={styles.card}>
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
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.lg,
  },
  card: {
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    fontSize: 22,
  },
  caption: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    fontSize: 16,
    marginTop: theme.spacing.sm,
  },
  paragraph: {
    ...theme.typography.bodyLg,
    color: theme.colors.ink,
  },
  bulletList: {
    gap: theme.spacing.xs,
    paddingLeft: theme.spacing.xs,
  },
  bulletItem: {
    ...theme.typography.bodyLg,
    color: theme.colors.ink,
  },
  bold: {
    fontWeight: '700',
  },
  contactBox: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.tile,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  contactText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
});
