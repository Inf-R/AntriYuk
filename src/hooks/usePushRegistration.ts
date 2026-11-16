import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  ANTREAN_CHANNEL_ID,
  ensureAntreanNotificationChannel,
  fetchAndRegisterExpoPushToken,
  unregisterCurrentPushToken,
} from '@/lib/pushNotifications';
import { useSession } from '@/hooks/useSession';

export {
  ANTREAN_CHANNEL_ID,
  ensureAntreanNotificationChannel,
  unregisterCurrentPushToken,
};

// Tampilkan banner & suara saat notifikasi masuk ketika aplikasi sedang terbuka
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
