import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

function extractIsOnline(state: NetInfoState): boolean {
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

export interface UseOnlineResult {
  isOnline: boolean;
}

/**
 * Hook pemantau status koneksi internet perangkat secara realtime menggunakan NetInfo.
 */
export function useOnline(): UseOnlineResult {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    void NetInfo.fetch()
      .then((state) => {
        if (isMounted) {
          setIsOnline(extractIsOnline(state));
        }
      })
      .catch(() => {
        // Pertahankan nilai default bila gagal membaca status awal
      });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (isMounted) {
        setIsOnline(extractIsOnline(state));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { isOnline };
}

