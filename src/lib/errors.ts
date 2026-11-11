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
  QUEUE_CLOSED: 'Antrean sedang tutup',
  ALREADY_HAS_TICKET: 'Anda masih punya tiket aktif di usaha ini',
  RATE_LIMITED: 'Terlalu banyak percobaan, coba lagi nanti',
  TOO_MANY_NO_SHOWS:
    'Anda sementara tidak bisa mengambil nomor karena beberapa kali tidak hadir',
  DEFER_LIMIT:
    'Batas undur giliran (maksimal 2 kali) untuk tiket ini sudah tercapai.',
  NOTHING_BEHIND:
    'Belum ada antrean di belakang Anda untuk mengundur giliran.',
  CANNOT_CANCEL: 'Tiket Anda sudah berubah status. Muat ulang layar',
  CANNOT_DEFER: 'Tiket Anda sudah berubah status. Muat ulang layar',
  CANNOT_MARK_NO_SHOW: 'Tiket Anda sudah berubah status. Muat ulang layar',
  CANNOT_FINISH: 'Tiket Anda sudah berubah status. Muat ulang layar',
  NOT_OWNER: 'Data tidak ditemukan',
  ONLY_CUSTOMER: 'Aksi ini khusus untuk akun pelanggan.',
  TICKET_NOT_FOUND: 'Data tidak ditemukan',
  INVALID_OUTCOME: 'Status penyelesaian antrean tidak valid.',
  INVALID_TOKEN: 'Format token notifikasi perangkat tidak valid.',
  UNAUTHENTICATED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
};

const KNOWN_CODES = new Set<string>(Object.keys(ERROR_MESSAGES));

function extractErrorDetails(error: unknown): { code: string; message: string } {
  if (typeof error === 'string') {
    return { code: '', message: error };
  }
  if (typeof error === 'object' && error !== null) {
    const code =
      'code' in error && typeof error.code === 'string' ? error.code : '';
    const message =
      'message' in error && typeof error.message === 'string' ? error.message : '';
    return { code, message };
  }
  return { code: '', message: '' };
}

/**
 * Mengecek apakah error disebabkan oleh kegagalan jaringan / tidak ada koneksi internet.
 */
export function isNetworkError(error: unknown): boolean {
  const { code, message } = extractErrorDetails(error);
  const lowerCode = code.toLowerCase();
  const lowerMsg = message.toLowerCase();
  const isAbortError =
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError');
  return (
    isAbortError ||
    lowerCode === 'network_error' ||
    lowerCode === 'network_timeout' ||
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('network request timed out') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('aborted') ||
    lowerMsg.includes('network')
  );
}

/**
 * Mengecek apakah error dari Supabase Auth disebabkan karena email belum dikonfirmasi.
 */
export function isEmailNotConfirmedError(error: unknown): boolean {
  const { code, message } = extractErrorDetails(error);
  const lowerCode = code.toLowerCase();
  const lowerMsg = message.toLowerCase();
  return (
    lowerCode === 'email_not_confirmed' ||
    lowerMsg.includes('email not confirmed')
  );
}

/**
 * Menerjemahkan error teknis dari Supabase (Auth, RPC, maupun Jaringan)
 * menjadi pesan ramah berbahasa Indonesia. Pesan teknis mentah tidak pernah ditampilkan.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  const { code, message } = extractErrorDetails(error);
  const combined = `${code} ${message}`.trim();

  // 1. Cek kode error RPC kustom AntriYuk
  for (const rpcCode of KNOWN_CODES) {
    if (code === rpcCode || message === rpcCode || combined.includes(rpcCode)) {
      return ERROR_MESSAGES[rpcCode as RpcErrorCode];
    }
  }

  const lowerCode = code.toLowerCase();
  const lowerMsg = message.toLowerCase();

  // 2. Pemetaan error Supabase Auth
  if (
    lowerCode === 'invalid_credentials' ||
    lowerMsg.includes('invalid login credentials')
  ) {
    return 'Email atau kata sandi yang Anda masukkan salah.';
  }

  if (
    lowerCode === 'email_not_confirmed' ||
    lowerMsg.includes('email not confirmed')
  ) {
    return 'Email Anda belum diverifikasi. Silakan masukkan kode 6 angka yang dikirim ke email Anda.';
  }

  if (
    lowerCode === 'otp_expired' ||
    lowerCode === 'otp_disabled' ||
    lowerMsg.includes('token has expired or is invalid') ||
    lowerMsg.includes('otp')
  ) {
    return 'Kode verifikasi salah atau sudah kedaluwarsa. Silakan periksa kembali atau kirim ulang kode baru.';
  }

  if (
    lowerCode === 'over_email_send_rate_limit' ||
    lowerCode === 'over_request_rate_limit' ||
    lowerCode === 'too_many_requests' ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('for security purposes, you can only request this after') ||
    lowerMsg.includes('too many requests')
  ) {
    return 'Terlalu banyak percobaan, coba lagi nanti';
  }

  if (
    lowerCode === 'user_already_exists' ||
    lowerMsg.includes('user already registered') ||
    lowerMsg.includes('already been registered')
  ) {
    return 'Alamat email ini sudah terdaftar. Silakan masuk atau gunakan fitur lupa kata sandi.';
  }

  if (
    lowerCode === 'same_password' ||
    lowerMsg.includes('new password should be different')
  ) {
    return 'Kata sandi baru harus berbeda dari kata sandi sebelumnya.';
  }

  if (lowerCode === 'weak_password' || lowerMsg.includes('password should be')) {
    return 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.';
  }

  if (
    lowerMsg.includes('error sending confirmation email') ||
    lowerMsg.includes('error sending recovery email')
  ) {
    return 'Gagal mengirim email kode verifikasi. Jika memakai SMTP uji coba (Resend), pastikan mendaftar dengan email pemilik akun SMTP atau gunakan SMTP Gmail.';
  }

  if (
    lowerCode === '23505' &&
    lowerMsg.includes('businesses_owner_id_key')
  ) {
    return 'Akun Anda sudah memiliki usaha yang terdaftar.';
  }

  if (lowerCode === 'pgrst116') {
    return 'Data tidak ditemukan';
  }

  // 3. Pemetaan error konfigurasi & jaringan
  if (lowerMsg.includes('missing_supabase_env')) {
    return 'Konfigurasi koneksi layanan belum lengkap. Pastikan variabel lingkungan Supabase sudah diatur.';
  }

  if (isNetworkError(error)) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.';
  }

  return 'Terjadi kendala saat memproses permintaan Anda. Silakan coba beberapa saat lagi.';
}
