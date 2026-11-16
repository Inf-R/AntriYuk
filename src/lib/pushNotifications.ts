import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

export const ANTREAN_CHANNEL_ID = 'antrean';
const PUSH_TOKEN_STORAGE_KEY = 'antriyuk_registered_push_token';

/**
 * Memastikan Android notification channel "antrean" berprioritas tinggi tersedia.
 * Catatan: pada expo-notifications SDK 58, opsi `sound` di setNotificationChannelAsync
 * hanya dipakai bila menyertakan berkas suara kustom di config plugin. Tanpa opsi `sound`,
 * Android menggunakan suara notifikasi bawaan sistem sesuai `AndroidImportance.MAX`.
 */
export async function ensureAntreanNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANTREAN_CHANNEL_ID, {
    name: 'Panggilan Antrean',
    description:
      'Pemberitahuan saat giliran antrean Anda hampir tiba atau sedang dipanggil',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#326DDA',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
  });
}

function resolveEasProjectId(): string | undefined {
  const fromEasConfig = Constants.easConfig?.projectId;
  if (typeof fromEasConfig === 'string' && fromEasConfig.length > 0) {
    return fromEasConfig;
  }

  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId;
}

/**
 * Mengambil Expo Push Token perangkat fisik Android dan mendaftarkannya lewat RPC `register_push_token`.
 */
export async function fetchAndRegisterExpoPushToken(): Promise<string | null> {
  await ensureAntreanNotificationChannel();

  if (!Device.isDevice) {
    return null;
  }

  const projectId = resolveEasProjectId();
  const tokenResult = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const token = tokenResult.data;
  if (!token || token.length < 10) {
    return null;
  }

  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  return token;
}

/**
 * Dipanggil sebelum `supabase.auth.signOut()` agar token perangkat dihapus dari `push_tokens`
 * melalui RPC `unregister_push_token`.
 */
export async function unregisterCurrentPushToken(): Promise<void> {
  try {
    const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (storedToken && storedToken.length >= 10) {
      await supabase.rpc('unregister_push_token', {
        p_token: storedToken,
      });
    }
  } catch {
    // Abaikan kegagalan jaringan saat logout agar proses keluar akun tidak terhambat
  } finally {
    try {
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    } catch {
      // Abaikan error storage lokal
    }
  }
}

