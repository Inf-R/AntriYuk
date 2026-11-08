export type RpcErrorCode =
  | 'QUEUE_CLOSED'
  | 'ALREADY_HAS_TICKET'
  | 'RATE_LIMITED'
  | 'TOO_MANY_NO_SHOWS'
  | 'DEFER_LIMIT'
  | 'NOTHING_BEHIND'
  | 'CANNOT_CANCEL'
  | 'CANNOT_DEFER'
  | 'CANNOT_MARK_NO_SHOW'
  | 'CANNOT_FINISH'
  | 'NOT_OWNER'
  | 'ONLY_CUSTOMER'
  | 'TICKET_NOT_FOUND'
  | 'INVALID_OUTCOME'
  | 'INVALID_TOKEN'
  | 'UNAUTHENTICATED';

const ERROR_MESSAGES: Record<RpcErrorCode, string> = {
  QUEUE_CLOSED: 'Antrean saat ini sedang ditutup oleh pemilik usaha.',
  ALREADY_HAS_TICKET: 'Anda sudah memiliki nomor antrean aktif di usaha ini.',
  RATE_LIMITED: 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu sebentar.',
  TOO_MANY_NO_SHOWS: 'Anda tidak dapat mengambil antrean karena riwayat tidak hadir melebihi batas hari ini.',
  DEFER_LIMIT: 'Batas undur giliran untuk tiket ini sudah tercapai.',
  NOTHING_BEHIND: 'Belum ada antrean di belakang Anda untuk mengundur giliran.',
  CANNOT_CANCEL: 'Tiket antrean ini sudah tidak dapat dibatalkan.',
  CANNOT_DEFER: 'Tiket antrean ini tidak dapat diundur saat ini.',
  CANNOT_MARK_NO_SHOW: 'Tiket ini tidak dapat ditandai tidak hadir.',
  CANNOT_FINISH: 'Tiket ini tidak dapat diselesaikan.',
  NOT_OWNER: 'Aksi ini hanya dapat dilakukan oleh pemilik usaha terkait.',
  ONLY_CUSTOMER: 'Aksi ini khusus untuk akun pelanggan.',
  TICKET_NOT_FOUND: 'Data tiket antrean tidak ditemukan.',
  INVALID_OUTCOME: 'Status penyelesaian antrean tidak valid.',
  INVALID_TOKEN: 'Format token notifikasi perangkat tidak valid.',
  UNAUTHENTICATED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
};

const KNOWN_CODES = new Set<string>(Object.keys(ERROR_MESSAGES));

function extractMessageFromUnknown(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }
  }
  return '';
}

/**
 * Menerjemahkan error teknis dari Supabase/RPC/jaringan menjadi pesan ramah berbahasa Indonesia.
 * Pesan teknis mentah tidak pernah ditampilkan langsung ke pengguna.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  const rawMessage = extractMessageFromUnknown(error).trim();

  for (const code of KNOWN_CODES) {
    if (rawMessage === code || rawMessage.includes(code)) {
      return ERROR_MESSAGES[code as RpcErrorCode];
    }
  }

  const lower = rawMessage.toLowerCase();
  if (lower.includes('missing_supabase_env')) {
    return 'Konfigurasi koneksi layanan belum lengkap. Pastikan variabel lingkungan Supabase sudah diatur.';
  }
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network')
  ) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.';
  }

  return 'Terjadi kendala saat menghubungkan ke layanan. Silakan coba beberapa saat lagi.';
}

