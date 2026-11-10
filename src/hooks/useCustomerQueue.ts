import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import { getTodayWibDateString } from '@/hooks/useOwnerSession';
import type {
  BusinessCategory,
  Database,
  QueueSessionStatus,
  TicketStatus,
} from '@/types/database';

export type BusinessRow = Database['public']['Tables']['businesses']['Row'];
export type TicketRow = Database['public']['Tables']['tickets']['Row'];

/**
 * Meng-escape karakter wildcard Postgres LIKE/ILIKE (%, _, dan \)
 * agar input pencarian pengguna diperlakukan sebagai teks biasa.
 */
export function escapeIlikePattern(raw: string): string {
  return raw.replace(/([\\%_])/g, '\\$1');
}

/**
 * Memformat timestamp ISO menjadi tanggal dan jam dalam zona waktu WIB (UTC+7).
 */
export function formatWibDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wib = new Date(date.getTime() + wibOffsetMs);

  const months = [
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
  ];

  const day = String(wib.getUTCDate()).padStart(2, '0');
  const month = months[wib.getUTCMonth()] ?? '';
  const year = wib.getUTCFullYear();
  const hours = String(wib.getUTCHours()).padStart(2, '0');
  const minutes = String(wib.getUTCMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
}

export interface BusinessListFilter {
  search: string;
  category: 'semua' | BusinessCategory;
}

export function useBusinessesList(filter: BusinessListFilter) {
  const trimmedSearch = filter.search.trim();

  return useQuery<BusinessRow[]>({
    queryKey: ['businesses-list', trimmedSearch, filter.category],
    queryFn: async () => {
      let query = supabase
        .from('businesses')
        .select(
          'id, owner_id, name, category, address, avg_service_minutes, grace_minutes, is_queue_open, created_at, updated_at'
        )
        .order('is_queue_open', { ascending: false })
        .order('name', { ascending: true })
        .limit(50);

      if (filter.category !== 'semua') {
        query = query.eq('category', filter.category);
      }

      if (trimmedSearch.length > 0) {
        const escaped = escapeIlikePattern(trimmedSearch);
        query = query.ilike('name', `%${escaped}%`);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });
}

export interface BusinessDetailData {
  business: BusinessRow;
  waitingCount: number;
  currentNumber: number;
  sessionStatus: QueueSessionStatus | 'closed';
  hasActiveTicketHere: boolean;
  activeTicketIdHere: string | null;
}

export function useBusinessDetail(businessId: string | undefined) {
  const { session } = useSession();
  const userId = session?.user.id;
  const todayWib = getTodayWibDateString();

  return useQuery<BusinessDetailData>({
    queryKey: ['business-detail', businessId, userId, todayWib],
    enabled: Boolean(businessId && userId),
    queryFn: async () => {
      if (!businessId || !userId) {
        throw new Error('UNAUTHENTICATED');
      }

      const [bizResult, sessionResult, activeTicketResult] = await Promise.all([
        supabase
          .from('businesses')
          .select(
            'id, owner_id, name, category, address, avg_service_minutes, grace_minutes, is_queue_open, created_at, updated_at'
          )
          .eq('id', businessId)
          .single(),
        supabase
          .from('queue_sessions')
          .select('id, waiting_count, current_number, status')
          .eq('business_id', businessId)
          .eq('queue_date', todayWib)
          .maybeSingle(),
        supabase
          .from('tickets')
          .select('id, status')
          .eq('business_id', businessId)
          .eq('customer_id', userId)
          .in('status', ['waiting', 'called'])
          .limit(1)
          .maybeSingle(),
      ]);

      if (bizResult.error || !bizResult.data) {
        throw bizResult.error ?? new Error('Usaha tidak ditemukan');
      }
      if (sessionResult.error) {
        throw sessionResult.error;
      }
      if (activeTicketResult.error) {
        throw activeTicketResult.error;
      }

      const isOpen =
        bizResult.data.is_queue_open &&
        sessionResult.data?.status === 'open';

      return {
        business: bizResult.data,
        waitingCount: isOpen ? (sessionResult.data?.waiting_count ?? 0) : 0,
        currentNumber: isOpen ? (sessionResult.data?.current_number ?? 0) : 0,
        sessionStatus: isOpen ? 'open' : 'closed',
        hasActiveTicketHere: Boolean(activeTicketResult.data),
        activeTicketIdHere: activeTicketResult.data?.id ?? null,
      };
    },
  });
}

export interface MyTicketPositionData {
  ticketId: string;
  businessId: string;
  businessName: string;
  graceMinutes: number;
  deferCount: number;
  ticketNumber: number;
  ticketStatus: TicketStatus;
  currentNumber: number;
  ahead: number;
  estMinutes: number;
  queueStatus: QueueSessionStatus;
  updatedAt: string;
}

export function useMyTicketPosition() {
  const { session } = useSession();
  const userId = session?.user.id;
  const todayWib = getTodayWibDateString();

  return useQuery<MyTicketPositionData | null>({
    queryKey: ['my-ticket-position', userId, todayWib],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      // 1. Cari tiket yang sedang aktif (waiting / called)
      const { data: activeTicket, error: activeErr } = await supabase
        .from('tickets')
        .select(
          'id, business_id, defer_count, status, created_at, businesses(name, grace_minutes)'
        )
        .eq('customer_id', userId)
        .in('status', ['waiting', 'called'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeErr) {
        throw activeErr;
      }

      let targetTicket = activeTicket;

      // 2. Jika tidak ada tiket aktif, periksa apakah tiket terakhir hari ini berstatus no_show atau expired
      if (!targetTicket) {
        const { data: latestTodayTicket, error: latestErr } = await supabase
          .from('tickets')
          .select(
            'id, business_id, defer_count, status, created_at, businesses(name, grace_minutes), queue_sessions!inner(queue_date)'
          )
          .eq('customer_id', userId)
          .eq('queue_sessions.queue_date', todayWib)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestErr) {
          throw latestErr;
        }

        if (
          latestTodayTicket &&
          (latestTodayTicket.status === 'no_show' ||
            latestTodayTicket.status === 'expired')
        ) {
          targetTicket = latestTodayTicket;
        }
      }

      if (!targetTicket) {
        return null;
      }

      // 3. Panggil RPC my_position untuk mendapatkan posisi, antrean di depan, dan estimasi menit
      const { data: posRows, error: posErr } = await supabase.rpc(
        'my_position',
        {
          p_ticket_id: targetTicket.id,
        }
      );

      if (posErr) {
        throw posErr;
      }

      const pos = posRows?.[0];
      if (!pos) {
        return null;
      }

      const bizRelation = targetTicket.businesses as unknown as
        | { name: string; grace_minutes: number }
        | { name: string; grace_minutes: number }[]
        | null;

      const bizInfo = Array.isArray(bizRelation)
        ? bizRelation[0]
        : bizRelation;

      return {
        ticketId: targetTicket.id,
        businessId: targetTicket.business_id,
        businessName: bizInfo?.name ?? 'Usaha',
        graceMinutes: bizInfo?.grace_minutes ?? 5,
        deferCount: targetTicket.defer_count,
        ticketNumber: pos.ticket_number,
        ticketStatus: pos.ticket_status,
        currentNumber: pos.current_number,
        ahead: pos.ahead,
        estMinutes: pos.est_minutes,
        queueStatus: pos.queue_status,
        updatedAt: pos.updated_at,
      };
    },
  });
}

export function useTakeTicket() {
  const queryClient = useQueryClient();

  return useMutation<TicketRow, unknown, string>({
    mutationFn: async (businessId: string) => {
      const { data, error } = await supabase.rpc('take_ticket', {
        p_business_id: businessId,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-ticket-position'] }),
        queryClient.invalidateQueries({ queryKey: ['business-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-history'] }),
      ]);
    },
  });
}

export function useCancelTicket() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.rpc('cancel_ticket', {
        p_ticket_id: ticketId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-ticket-position'] }),
        queryClient.invalidateQueries({ queryKey: ['business-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-history'] }),
      ]);
    },
  });
}

export function useDeferTicket() {
  const queryClient = useQueryClient();

  return useMutation<TicketRow, unknown, string>({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase.rpc('defer_ticket', {
        p_ticket_id: ticketId,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-ticket-position'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-history'] }),
      ]);
    },
  });
}

export interface TicketHistoryItem {
  id: string;
  businessId: string;
  businessName: string;
  businessCategory: BusinessCategory;
  number: number;
  status: TicketStatus;
  createdAt: string;
}

const HISTORY_PAGE_SIZE = 20;

export function useTicketHistory() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useInfiniteQuery<TicketHistoryItem[]>({
    queryKey: ['ticket-history', userId],
    enabled: Boolean(userId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < HISTORY_PAGE_SIZE) {
        return undefined;
      }
      return allPages.length;
    },
    queryFn: async ({ pageParam }) => {
      if (!userId) {
        return [];
      }
      const pageIndex = typeof pageParam === 'number' ? pageParam : 0;
      const from = pageIndex * HISTORY_PAGE_SIZE;
      const to = from + HISTORY_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('tickets')
        .select(
          'id, business_id, number, status, created_at, businesses(name, category)'
        )
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => {
        const bizRel = row.businesses as unknown as
          | { name: string; category: BusinessCategory }
          | { name: string; category: BusinessCategory }[]
          | null;
        const biz = Array.isArray(bizRel) ? bizRel[0] : bizRel;

        return {
          id: row.id,
          businessId: row.business_id,
          businessName: biz?.name ?? 'Usaha',
          businessCategory: biz?.category ?? 'lainnya',
          number: row.number,
          status: row.status,
          createdAt: row.created_at,
        };
      });
    },
  });
}

