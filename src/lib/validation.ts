import { z } from 'zod';

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Nama tampilan wajib diisi.')
    .max(50, 'Nama tampilan maksimal 50 karakter.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format alamat email tidak valid.'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter.'),
  role: z.enum(['customer', 'owner'], {
    message: 'Silakan pilih peran akun Anda.',
  }),
  acceptedPrivacy: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Anda wajib menyetujui Kebijakan Privasi untuk mendaftar.',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format alamat email tidak valid.'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Kode verifikasi harus berupa 6 angka.'),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format alamat email tidak valid.'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format alamat email tidak valid.'),
});

export type ForgotPasswordEmailInput = z.infer<typeof forgotPasswordEmailSchema>;

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format alamat email tidak valid.'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Kode pemulihan harus berupa 6 angka.'),
  newPassword: z
    .string()
    .min(8, 'Kata sandi baru minimal 8 karakter.'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const BUSINESS_CATEGORIES = [
  { value: 'klinik', label: 'Klinik Pratama' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'bengkel', label: 'Bengkel' },
  { value: 'warung_makan', label: 'Warung Makan' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

export const businessFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama usaha minimal 2 karakter.')
    .max(80, 'Nama usaha maksimal 80 karakter.'),
  category: z.enum(
    ['klinik', 'barbershop', 'bengkel', 'warung_makan', 'lainnya'],
    {
      message: 'Pilih salah satu kategori usaha.',
    }
  ),
  address: z
    .string()
    .trim()
    .max(200, 'Alamat usaha maksimal 200 karakter.'),
  avgServiceMinutes: z
    .number({
      message: 'Rata-rata lama layanan harus berupa angka.',
    })
    .int('Rata-rata lama layanan harus berupa bilangan bulat.')
    .min(1, 'Rata-rata lama layanan minimal 1 menit.')
    .max(240, 'Rata-rata lama layanan maksimal 240 menit.'),
  graceMinutes: z
    .number({
      message: 'Masa tunggu setelah dipanggil harus berupa angka.',
    })
    .int('Masa tunggu harus berupa bilangan bulat.')
    .min(1, 'Masa tunggu minimal 1 menit.')
    .max(30, 'Masa tunggu maksimal 30 menit.'),
});

export type BusinessFormInput = z.infer<typeof businessFormSchema>;


