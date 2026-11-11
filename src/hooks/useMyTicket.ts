import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCachedActiveTicket,
  type CachedActiveTicketRow,
} from '@/db/sqlite';
import { isNetworkError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useOnline } from '@/hooks/useOnline';
import { useSession } from '@/hooks/useSession';
import {
  useMyTicketPosition,
  type MyTicketPositionData,
} from '@/hooks/useCustomerQueue';

const FALLBACK_POLL_INTERVAL_MS = 15_000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Memformat ISO timestamp menjadi "HH:mm" dalam zona waktu WIB (UTC+7).
 */
export function formatWibHourMinute(isoString: string | null | undefined): string {
  if (!isoString) {
    return '--:--';
  }
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }
  const wib = new Date(parsed.getTime() + WIB_OFFSET_MS);
  const hours = String(wib.getUTCHours()).padStart(2, '0');
  const minutes = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function mapCachedRowToPositionData(
  row: CachedActiveTicketRow
): MyTicketPositionData {
  return {
    ticketId: row.ticket_id,
    businessId: '',
    businessName: row.business_name,
    graceMinutes: row.grace_minutes,
    deferCount: 0,
    ticketNumber: row.ticket_number,
    ticketStatus: row.ticket_status,
    currentNumber: row.current_number,
    ahead: row.ahead,
    estMinutes: row.est_minutes,
    queueStatus: 'open',
    calledAt: row.called_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Hook realtime & offline cache untuk layar Tiket Saya pelanggan:
 * 1. Memuat posisi antrean lewat `my_position` (via `useMyTicketPosition`).
 * 2. Subscribe Supabase Realtime ke `tickets` milik pelanggan dan `queue_sessions` usaha terkait.
 * 3. Membaca cache SQLite (`active_ticket`) saat offline atau gagal karena jaringan.
 * 4. Refetch otomatis saat aplikasi kembali ke latar depan (AppState) atau saat online kembali (`useOnline`).
 */
export function useMyTicket() {
  const { session } = useSession();
  const userId = session?.user.id;
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const { isOnline } = useOnline();

  const query = useMyTicketPosition();
  const { refetch } = query;
  const businessId = query.data?.businessId || null;

  const [isChannelConnected, setIsChannelConnected] = useState<boolean>(false);
  const [cachedTicket, setCachedTicket] =
    useState<MyTicketPositionData | null>(null);
  const [isCacheLoaded, setIsCacheLoaded] = useState<boolean>(false);

  const appStateRef = useRef<string>(AppState.currentState ?? 'active');
  const prevOnlineRef = useRef<boolean>(isOnline);

  const loadSqliteCache = useCallback(async () => {
    const row = await getCachedActiveTicket();
    setCachedTicket(row ? mapCachedRowToPositionData(row) : null);
    setIsCacheLoaded(true);
  }, []);

  // Muat cache SQLite di awal & setiap kali data server / status online berubah
  useEffect(() => {
    void loadSqliteCache();
  }, [loadSqliteCache, query.data, query.error, isOnline]);

  const triggerSync = useCallback(() => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['business-detail'] });
    void queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
  }, [queryClient, refetch]);

  // Refetch otomatis saat kembali online dan timpa cache
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && userId) {
      triggerSync();
    }
  }, [isOnline, userId, triggerSync]);

  // 1. Subscribe Supabase Realtime ke tickets (customer_id) & queue_sessions (business_id)
  useEffect(() => {
    if (!userId || !isFocused || !isOnline) {
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
  }, [userId, businessId, isFocused, isOnline, triggerSync]);

  // 2. Refetch saat kembali ke latar depan (AppState)
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

    return () => {
      appStateSub.remove();
    };
  }, [userId, isFocused, triggerSync]);

  // 3. Polling cadangan tiap 15 detik jika online tetapi channel belum tersambung
  useEffect(() => {
    if (!userId || !isFocused || !isOnline || isChannelConnected) {
      return;
    }

    const interval = setInterval(() => {
      void refetch();
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [userId, isFocused, isOnline, isChannelConnected, refetch]);

  const hasNetworkFailure = Boolean(query.error && isNetworkError(query.error));
  const isOfflineMode = !isOnline || hasNetworkFailure;

  // Gunakan data cache SQLite jika offline atau gagal karena jaringan
  const activeServerTicket =
    query.data &&
    (query.data.ticketStatus === 'waiting' ||
      query.data.ticketStatus === 'called')
      ? query.data
      : null;

  const effectiveTicket = isOfflineMode
    ? (cachedTicket ?? activeServerTicket)
    : (query.data ?? null);

  const offlineBannerText = isOfflineMode
    ? effectiveTicket
      ? `Offline. Terakhir diperbarui pukul ${formatWibHourMinute(effectiveTicket.updatedAt)} WIB`
      : 'Offline. Periksa kembali koneksi internet Anda.'
    : null;

  return {
    ...query,
    data: effectiveTicket,
    isLoading: isOfflineMode ? !isCacheLoaded : query.isLoading,
    error: isOfflineMode && effectiveTicket ? null : query.error,
    isOnline,
    isOfflineMode,
    offlineBannerText,
    isRealtimeConnected: isChannelConnected,
  };
}

export type { MyTicketPositionData };
