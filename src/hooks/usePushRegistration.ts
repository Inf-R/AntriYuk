import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';

export const ANTREAN_CHANNEL_ID = 'antrean';
const PUSH_TOKEN_STORAGE_KEY = 'antriyuk_registered_push_token';

// Tampilkan banner & suara saat notifikasi masuk ketika aplikasi sedang terbuka
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Memastikan Android notification channel "antrean" berprioritas tinggi tersedia.
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
    sound: 'default',
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
async function fetchAndRegisterExpoPushToken(): Promise<string | null> {
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

export interface UsePushRegistrationResult {
  showBenefitPrompt: boolean;
  isRegistering: boolean;
  requestPermissionAndRegister: () => Promise<void>;
  dismissBenefitPrompt: () => void;
}

/**
 * Hook pengelolaan Push Notification untuk peran Pelanggan:
 * - Membuat Android notification channel "antrean" berprioritas tinggi.
 * - Jika izin belum diberikan, menampilkan layar penjelasan manfaat sebelum dialog sistem.
 * - Jika izin sudah diberikan, langsung mengambil Expo push token dan memanggil `register_push_token`.
 * - Menangani ketukan notifikasi untuk membuka tab Tiket (`/(pelanggan)/tiket`).
 */
export function usePushRegistration(): UsePushRegistrationResult {
  const { session, profile } = useSession();
  const router = useRouter();

  const [showBenefitPrompt, setShowBenefitPrompt] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const promptedUserIdRef = useRef<string | null>(null);
  const registeredUserIdRef = useRef<string | null>(null);

  const userId = session?.user.id ?? null;
  const isCustomer = profile?.role === 'customer';

  // 1. Siapkan channel Android "antrean" sejak awal
  useEffect(() => {
    void ensureAntreanNotificationChannel().catch(() => {
      // Abaikan bila dijalankan di lingkungan non-perangkat
    });
  }, []);

  // 2. Periksa izin notifikasi setelah login sebagai pelanggan
  useEffect(() => {
    if (!userId || !isCustomer) {
      setShowBenefitPrompt(false);
      promptedUserIdRef.current = null;
      registeredUserIdRef.current = null;
      return;
    }

    let isCancelled = false;

    async function checkAndRegisterOrPrompt(): Promise<void> {
      try {
        await ensureAntreanNotificationChannel();
        const perm = await Notifications.getPermissionsAsync();

        if (isCancelled) {
          return;
        }

        if (perm.status === 'granted') {
          setShowBenefitPrompt(false);
          if (registeredUserIdRef.current !== userId) {
            registeredUserIdRef.current = userId;
            await fetchAndRegisterExpoPushToken();
          }
          return;
        }

        // Tampilkan layar penjelasan manfaat sebelum dialog izin sistem (sekali per sesi login)
        if (perm.canAskAgain && promptedUserIdRef.current !== userId) {
          promptedUserIdRef.current = userId;
          setShowBenefitPrompt(true);
        }
      } catch {
        // Jangan tampilkan pesan teknis mentah bila perangkat tidak mendukung push
      }
    }

    void checkAndRegisterOrPrompt();

    return () => {
      isCancelled = true;
    };
  }, [userId, isCustomer]);

  // 3. Mengetuk notifikasi membuka tab Tiket (/(pelanggan)/tiket)
  useEffect(() => {
    if (!userId || !isCustomer) {
      return;
    }

    // Cek apabila aplikasi dibuka dari kondisi tertutup lewat ketukan notifikasi
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      Notifications.clearLastNotificationResponse();
      router.navigate('/(pelanggan)/tiket');
    }

    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      Notifications.clearLastNotificationResponse();
      router.navigate('/(pelanggan)/tiket');
    });

    return () => {
      sub.remove();
    };
  }, [userId, isCustomer, router]);

  const requestPermissionAndRegister = useCallback(async () => {
    if (isRegistering) {
      return;
    }
    setIsRegistering(true);
    try {
      await ensureAntreanNotificationChannel();
      const perm = await Notifications.requestPermissionsAsync();
      setShowBenefitPrompt(false);

      if (perm.status === 'granted' && userId) {
        registeredUserIdRef.current = userId;
        await fetchAndRegisterExpoPushToken();
      }
    } catch {
      setShowBenefitPrompt(false);
    } finally {
      setIsRegistering(false);
    }
  }, [isRegistering, userId]);

  const dismissBenefitPrompt = useCallback(() => {
    setShowBenefitPrompt(false);
  }, []);

  return {
    showBenefitPrompt,
    isRegistering,
    requestPermissionAndRegister,
    dismissBenefitPrompt,
  };
}

