import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useIsFocused } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database, TicketStatus } from '@/types/database';

export type QueueSessionRow =
  Database['public']['Tables']['queue_sessions']['Row'];

export type TicketRow = Database['public']['Tables']['tickets']['Row'];

export interface OwnerQueueItem {
  ticket_id: string;
  number: number;
  display_name: string;
  status: TicketStatus;
  created_at: string;
  called_at: string | null;
}

export interface OwnerSummaryData {
  total: number;
  done: number;
  cancelled: number;
  no_show: number;
  expired: number;
  avg_service_minutes: number | null;
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const FALLBACK_POLL_INTERVAL_MS = 15_000;

const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

const BULAN_INDONESIA = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

/**
 * Menghasilkan tanggal hari ini dalam zona waktu WIB (Asia/Jakarta, UTC+7)
 * dengan format YYYY-MM-DD agar selaras dengan `(now() at time zone 'Asia/Jakarta')::date` di Postgres.
 */
export function getTodayWibDateString(now: Date = new Date()): string {
  const wibTime = new Date(now.getTime() + WIB_OFFSET_MS);
  return wibTime.toISOString().slice(0, 10);
}

/**
 * Menggeser tanggal YYYY-MM-DD sebanyak `deltaDays` hari (mis. -1 untuk kemarin, +1 untuk besok).
 */
export function shiftWibDateString(dateStr: string, deltaDays: number): string {
  const baseUtc = new Date(`${dateStr}T00:00:00.000Z`);
  const shifted = new Date(baseUtc.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Memformat tanggal YYYY-MM-DD menjadi label ramah bahasa Indonesia (mis. "Selasa, 10 Nov 2026").
 */
export function formatWibDateLabel(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return dateStr;
  }
  const dayName = HARI_INDONESIA[parsed.getUTCDay()] ?? '';
  const dayNum = String(parsed.getUTCDate()).padStart(2, '0');
  const monthName = BULAN_INDONESIA[parsed.getUTCMonth()] ?? '';
  const year = parsed.getUTCFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

/**
 * Memformat timestamp ISO menjadi jam WIB singkat (mis. "14:05 WIB").
 */
export function formatWibTimeOnly(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const hours = String(wib.getUTCHours()).padStart(2, '0');
  const minutes = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes} WIB`;
}

export function useOwnerSession(businessId: string | null | undefined) {
  const todayWib = getTodayWibDateString();

  return useQuery<QueueSessionRow | null>({
    queryKey: ['owner-session', businessId, todayWib],
    enabled: Boolean(businessId),
    queryFn: async () => {
      if (!businessId) {
        return null;
      }

      const { data, error } = await supabase
        .from('queue_sessions')
        .select(
          'id, business_id, queue_date, last_number, current_number, waiting_count, status, opened_at, closed_at, updated_at'
        )
        .eq('business_id', businessId)
        .eq('queue_date', todayWib)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });
}

/**
 * Mengambil daftar antrean aktif hari ini (`waiting` & `called`) melalui RPC `owner_queue`,
 * serta berlangganan Supabase Realtime ke `queue_sessions` dan `tickets` usaha terkait,
 * dilengkapi refetch saat AppState aktif / koneksi pulih dan polling cadangan 15 detik.
 */
export function useOwnerQueue(businessId: string | null | undefined) {
  const todayWib = getTodayWibDateString();
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();

  const [isChannelConnected, setIsChannelConnected] = useState<boolean>(false);
  const appStateRef = useRef<string>(AppState.currentState ?? 'active');
  const wasConnectedRef = useRef<boolean | null>(null);

  const query = useQuery<OwnerQueueItem[]>({
    queryKey: ['owner-queue', businessId, todayWib],
    enabled: Boolean(businessId),
    queryFn: async () => {
      if (!businessId) {
        return [];
      }

      const { data, error } = await supabase.rpc('owner_queue', {
        p_business_id: businessId,
      });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => ({
        ticket_id: row.ticket_id,
        number: row.number,
        display_name: row.display_name,
        status: row.status as TicketStatus,
        created_at: row.created_at,
        called_at: row.called_at,
      }));
    },
  });

  const { refetch } = query;

  const triggerSync = useCallback(() => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['owner-session'] });
    void queryClient.invalidateQueries({ queryKey: ['owner-summary'] });
  }, [queryClient, refetch]);

  // 1. Subscribe Supabase Realtime ke queue_sessions & tickets milik usaha
  useEffect(() => {
    if (!businessId || !isFocused) {
      setIsChannelConnected(false);
      return;
    }

    setIsChannelConnected(false);
    const channel = supabase
      .channel(`owner-queue:${businessId}`)
      .on(
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
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          triggerSync();
        }
      )
      .subscribe((status) => {
        setIsChannelConnected(status === 'SUBSCRIBED');
      });

    return () => {
      setIsChannelConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [businessId, isFocused, triggerSync]);

  // 2. Refetch saat kembali ke latar depan (AppState) & saat koneksi internet pulih (NetInfo)
  useEffect(() => {
    if (!businessId || !isFocused) {
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
  }, [businessId, isFocused, triggerSync]);

  // 3. Polling cadangan tiap 15 detik jika channel belum tersambung
  useEffect(() => {
    if (!businessId || !isFocused || isChannelConnected) {
      return;
    }

    const interval = setInterval(() => {
      triggerSync();
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [businessId, isFocused, isChannelConnected, triggerSync]);

  return {
    ...query,
    isRealtimeConnected: isChannelConnected,
  };
}

/**
 * Mengambil ringkasan harian untuk usaha dan tanggal tertentu melalui RPC `owner_summary`.
 */
export function useOwnerSummary(
  businessId: string | null | undefined,
  dateStr: string
) {
  return useQuery<OwnerSummaryData>({
    queryKey: ['owner-summary', businessId, dateStr],
    enabled: Boolean(businessId) && Boolean(dateStr),
    queryFn: async () => {
      if (!businessId) {
        return {
          total: 0,
          done: 0,
          cancelled: 0,
          no_show: 0,
          expired: 0,
          avg_service_minutes: null,
        };
      }

      const { data, error } = await supabase.rpc('owner_summary', {
        p_business_id: businessId,
        p_date: dateStr,
      });

      if (error) {
        throw error;
      }

      const row = data?.[0];
      if (!row) {
        return {
          total: 0,
          done: 0,
          cancelled: 0,
          no_show: 0,
          expired: 0,
          avg_service_minutes: null,
        };
      }

      return {
        total: Number(row.total ?? 0),
        done: Number(row.done ?? 0),
        cancelled: Number(row.cancelled ?? 0),
        no_show: Number(row.no_show ?? 0),
        expired: Number(row.expired ?? 0),
        avg_service_minutes:
          row.avg_service_minutes !== null &&
          row.avg_service_minutes !== undefined
            ? Number(row.avg_service_minutes)
            : null,
      };
    },
  });
}

export function useOpenQueue() {
  const queryClient = useQueryClient();

  return useMutation<QueueSessionRow, unknown, string>({
    mutationFn: async (businessId: string) => {
      const { data, error } = await supabase.rpc('open_queue', {
        p_business_id: businessId,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-session'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['my-business'] }),
      ]);
    },
  });
}

export function useCloseQueue() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase.rpc('close_queue', {
        p_business_id: businessId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-session'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['my-business'] }),
      ]);
    },
  });
}

export interface CallNextVariables {
  businessId: string;
  previous: 'done' | 'no_show';
}

export function useCallNext() {
  const queryClient = useQueryClient();

  return useMutation<TicketRow | null, unknown, CallNextVariables>({
    mutationFn: async ({ businessId, previous }: CallNextVariables) => {
      const { data, error } = await supabase.rpc('call_next', {
        p_business_id: businessId,
        p_previous: previous,
      });

      if (error) {
        throw error;
      }

      return data ?? null;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-session'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-summary'] }),
      ]);
    },
  });
}

export function useFinishTicket() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.rpc('finish_ticket', {
        p_ticket_id: ticketId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-session'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-summary'] }),
      ]);
    },
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.rpc('mark_no_show', {
        p_ticket_id: ticketId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-session'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-summary'] }),
      ]);
    },
  });
}
