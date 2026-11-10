import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useIsFocused } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import {
  useMyTicketPosition,
  type MyTicketPositionData,
} from '@/hooks/useCustomerQueue';

const FALLBACK_POLL_INTERVAL_MS = 15_000;

/**
 * Hook realtime untuk layar Tiket Saya pelanggan:
 * 1. Memuat posisi antrean lewat `my_position` (via `useMyTicketPosition`).
 * 2. Subscribe Supabase Realtime ke `tickets` milik pelanggan (`customer_id=eq.${userId}`)
 *    dan `queue_sessions` milik usaha tiketnya (`business_id=eq.${businessId}`).
 * 3. Refetch otomatis saat aplikasi kembali ke latar depan (AppState) atau koneksi pulih (NetInfo).
 * 4. Polling cadangan setiap 15 detik apabila channel Realtime belum berstatus SUBSCRIBED.
 * 5. Selalu unsubscribe channel saat layar ditutup.
 */
export function useMyTicket() {
  const { session } = useSession();
  const userId = session?.user.id;
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();

  const query = useMyTicketPosition();
  const { refetch } = query;
  const businessId = query.data?.businessId ?? null;

  const [isChannelConnected, setIsChannelConnected] = useState<boolean>(false);
  const appStateRef = useRef<string>(AppState.currentState ?? 'active');
  const wasConnectedRef = useRef<boolean | null>(null);

  const triggerSync = useCallback(() => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['business-detail'] });
    void queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
  }, [queryClient, refetch]);

  // 1. Subscribe Supabase Realtime ke tickets (customer_id) & queue_sessions (business_id)
  useEffect(() => {
    if (!userId || !isFocused) {
      setIsChannelConnected(false);
      return;
    }

    setIsChannelConnected(false);
    const channelName = `customer-ticket:${userId}:${businessId ?? 'none'}`;
    let channel = supabase.channel(channelName).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `customer_id=eq.${userId}`,
      },
      () => {
        triggerSync();
      }
    );

    if (businessId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_sessions',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          triggerSync();
        }
      );
    }

    channel.subscribe((status) => {
      setIsChannelConnected(status === 'SUBSCRIBED');
    });

    return () => {
      setIsChannelConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [userId, businessId, isFocused, triggerSync]);

  // 2. Refetch saat kembali ke latar depan (AppState) & saat koneksi internet pulih (NetInfo)
  useEffect(() => {
    if (!userId || !isFocused) {
      return;
    }

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;
      if (
        (prev === 'inactive' || prev === 'background') &&
        nextAppState === 'active'
      ) {
        triggerSync();
      }
    });

    const netInfoUnsub = NetInfo.addEventListener((state) => {
      const isOnline =
        Boolean(state.isConnected) && state.isInternetReachable !== false;
      if (wasConnectedRef.current === false && isOnline) {
        triggerSync();
      }
      wasConnectedRef.current = isOnline;
    });

    return () => {
      appStateSub.remove();
      netInfoUnsub();
    };
  }, [userId, isFocused, triggerSync]);

  // 3. Polling cadangan tiap 15 detik jika channel belum tersambung
  useEffect(() => {
    if (!userId || !isFocused || isChannelConnected) {
      return;
    }

    const interval = setInterval(() => {
      void refetch();
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [userId, isFocused, isChannelConnected, refetch]);

  return {
    ...query,
    isRealtimeConnected: isChannelConnected,
  };
}

export type { MyTicketPositionData };
