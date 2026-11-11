// Supabase Edge Function: notify-queue
// Runtime: Deno (Supabase Edge Functions)
// Satu-satunya komponen server yang diizinkan menggunakan SUPABASE_SERVICE_ROLE_KEY (otomatis dari env runtime).
// Log TIDAK PERNAH mencatat token, email, atau nama pengguna.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_LIMIT = 100;
const ANDROID_CHANNEL_ID = 'antrean';

interface WebhookPayload {
  type?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high';
  channelId: string;
  data: {
    screen: string;
    ticketId: string;
    type: 'called' | 'near';
  };
}

interface ExpoPushTicketItem {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?:
      | 'DeviceNotRegistered'
      | 'InvalidCredentials'
      | 'MessageTooBig'
      | 'MessageRateExceeded'
      | string;
  };
}

interface ExpoPushResponse {
  data?: ExpoPushTicketItem[];
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

/**
 * Mengirim daftar pesan ke Expo Push API secara batch (maks 100 per request)
 * dan menghapus token yang dilaporkan tidak valid (mis. DeviceNotRegistered) dari tabel push_tokens.
 */
async function sendExpoPushBatchAndCleanTokens(
  adminClient: SupabaseClient,
  messages: ExpoPushMessage[]
): Promise<{ sentCount: number; invalidRemovedCount: number }> {
  if (messages.length === 0) {
    return { sentCount: 0, invalidRemovedCount: 0 };
  }

  let sentCount = 0;
  const invalidTokens = new Set<string>();

  for (let i = 0; i < messages.length; i += EXPO_BATCH_LIMIT) {
    const chunk = messages.slice(i, i + EXPO_BATCH_LIMIT);

    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      console.error(
        `[notify-queue] Expo Push API mengembalikan HTTP ${response.status} untuk batch berukuran ${chunk.length}.`
      );
      continue;
    }

    const body = (await response.json()) as ExpoPushResponse;
    const tickets = Array.isArray(body.data) ? body.data : [];

    for (let idx = 0; idx < tickets.length; idx++) {
      const item = tickets[idx];
      const targetToken = chunk[idx]?.to;

      if (item.status === 'ok') {
        sentCount += 1;
      } else if (
        item.status === 'error' &&
        targetToken &&
        item.details?.error === 'DeviceNotRegistered'
      ) {
        invalidTokens.add(targetToken);
      }
    }
  }

  let invalidRemovedCount = 0;
  if (invalidTokens.size > 0) {
    const tokensArray = Array.from(invalidTokens);
    const { error: deleteErr } = await adminClient
      .from('push_tokens')
      .delete()
      .in('token', tokensArray);

    if (!deleteErr) {
      invalidRemovedCount = tokensArray.length;
    } else {
      console.error(
        `[notify-queue] Gagal menghapus token tidak valid (${deleteErr.code ?? 'DELETE_ERROR'}).`
      );
    }
  }

  return { sentCount, invalidRemovedCount };
}

/**
 * Perilaku A: Event UPDATE pada tabel `tickets`
 * Jika status baru = 'called' dan called_notified_at masih null:
 * Kirim push "Giliran Anda sekarang! Datang dalam X menit" ke semua token pelanggan tersebut,
 * lalu isi called_notified_at.
 */
async function handleTicketUpdate(
  adminClient: SupabaseClient,
  record: Record<string, unknown>
): Promise<{ sentCount: number; invalidRemovedCount: number }> {
  const ticketId = typeof record.id === 'string' ? record.id : '';
  const status = typeof record.status === 'string' ? record.status : '';
  const calledNotifiedAt = record.called_notified_at;

  if (!ticketId || status !== 'called' || calledNotifiedAt !== null) {
    return { sentCount: 0, invalidRemovedCount: 0 };
  }

  const nowIso = new Date().toISOString();

  // Klaim secara atomik: hanya proses jika called_notified_at di DB masih null
  const { data: claimedTicket, error: claimErr } = await adminClient
    .from('tickets')
    .update({ called_notified_at: nowIso })
    .eq('id', ticketId)
    .eq('status', 'called')
    .is('called_notified_at', null)
    .select('id, customer_id, business_id, number')
    .maybeSingle();

  if (claimErr || !claimedTicket) {
    return { sentCount: 0, invalidRemovedCount: 0 };
  }

  const [{ data: business }, { data: tokenRows }] = await Promise.all([
    adminClient
      .from('businesses')
      .select('name, grace_minutes')
      .eq('id', claimedTicket.business_id)
      .maybeSingle(),
    adminClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', claimedTicket.customer_id),
  ]);

  const tokens = (tokenRows ?? [])
    .map((r: { token: string }) => r.token)
    .filter((t: string) => typeof t === 'string' && t.length >= 10);

  if (tokens.length === 0) {
    return { sentCount: 0, invalidRemovedCount: 0 };
  }

  const graceMinutes = Number(business?.grace_minutes ?? 5);
  const businessName =
    typeof business?.name === 'string' && business.name.length > 0
      ? business.name
      : 'Panggilan Antrean AntriYuk';

  const messages: ExpoPushMessage[] = tokens.map((token: string) => ({
    to: token,
    title: businessName,
    body: `Giliran Anda sekarang! Datang dalam ${graceMinutes} menit`,
    sound: 'default',
    priority: 'high',
    channelId: ANDROID_CHANNEL_ID,
    data: {
      screen: '/(pelanggan)/tiket',
      ticketId: claimedTicket.id,
      type: 'called',
    },
  }));

  return sendExpoPushBatchAndCleanTokens(adminClient, messages);
}

/**
 * Perilaku B: Event UPDATE pada tabel `queue_sessions`
 * Cari tiket 'waiting' di sesi itu yang jumlah tiket waiting di depannya (sort_key lebih kecil) <= 2
 * dan near_notified_at masih null.
 * Kirim push "Giliran hampir tiba, sisa N orang di depan Anda", lalu isi near_notified_at.
 */
async function handleQueueSessionUpdate(
  adminClient: SupabaseClient,
  record: Record<string, unknown>
): Promise<{ sentCount: number; invalidRemovedCount: number }> {
  const sessionId = typeof record.id === 'string' ? record.id : '';
  const businessId =
    typeof record.business_id === 'string' ? record.business_id : '';
  const sessionStatus = typeof record.status === 'string' ? record.status : '';

  if (!sessionId || !businessId || sessionStatus !== 'open') {
    return { sentCount: 0, invalidRemovedCount: 0 };
  }

  // Ambil seluruh tiket waiting di sesi ini terurut berdasarkan sort_key
  const [{ data: waitingTickets, error: waitErr }, { data: business }] =
    await Promise.all([
      adminClient
        .from('tickets')
        .select('id, customer_id, sort_key, near_notified_at')
        .eq('session_id', sessionId)
        .eq('status', 'waiting')
        .order('sort_key', { ascending: true }),
      adminClient
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .maybeSingle(),
    ]);

  if (waitErr || !waitingTickets || waitingTickets.length === 0) {
    return { sentCount: 0, invalidRemovedCount: 0 };
  }

  const businessName =
    typeof business?.name === 'string' && business.name.length > 0
      ? business.name
      : 'AntriYuk';

  const nowIso = new Date().toISOString();
  const messagesToSend: ExpoPushMessage[] = [];

  for (const ticket of waitingTickets) {
    const ticketSortKey = Number(ticket.sort_key);
    const aheadCount = waitingTickets.filter(
      (other) => Number(other.sort_key) < ticketSortKey
    ).length;

    if (aheadCount <= 2 && ticket.near_notified_at === null) {
      // Klaim secara atomik agar tidak terkirim dua kali jika ada update serentak
      const { data: claimed } = await adminClient
        .from('tickets')
        .update({ near_notified_at: nowIso })
        .eq('id', ticket.id)
        .eq('status', 'waiting')
        .is('near_notified_at', null)
        .select('id, customer_id')
        .maybeSingle();

      if (!claimed) {
        continue;
      }

      const { data: tokenRows } = await adminClient
        .from('push_tokens')
        .select('token')
        .eq('user_id', claimed.customer_id);

      const tokens = (tokenRows ?? [])
        .map((r: { token: string }) => r.token)
        .filter((t: string) => typeof t === 'string' && t.length >= 10);

      for (const token of tokens) {
        messagesToSend.push({
          to: token,
          title: businessName,
          body: `Giliran hampir tiba, sisa ${aheadCount} orang di depan Anda`,
          sound: 'default',
          priority: 'high',
          channelId: ANDROID_CHANNEL_ID,
          data: {
            screen: '/(pelanggan)/tiket',
            ticketId: claimed.id,
            type: 'near',
          },
        });
      }
    }
  }

  return sendExpoPushBatchAndCleanTokens(adminClient, messagesToSend);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const expectedSecret = Deno.env.get('WEBHOOK_SECRET') ?? '';
  const providedSecret = req.headers.get('x-webhook-secret') ?? '';

  if (
    !expectedSecret ||
    !providedSecret ||
    !timingSafeEqualStrings(expectedSecret, providedSecret)
  ) {
    console.warn('[notify-queue] Permintaan ditolak: header rahasia tidak cocok.');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[notify-queue] Konfigurasi environment server belum lengkap.');
    return new Response(
      JSON.stringify({ error: 'Server Configuration Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (
    payload.type !== 'UPDATE' ||
    payload.schema !== 'public' ||
    !payload.record
  ) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    let result = { sentCount: 0, invalidRemovedCount: 0 };

    if (payload.table === 'tickets') {
      result = await handleTicketUpdate(adminClient, payload.record);
    } else if (payload.table === 'queue_sessions') {
      result = await handleQueueSessionUpdate(adminClient, payload.record);
    }

    console.log(
      `[notify-queue] Selesai memproses tabel=${payload.table} terkirim=${result.sentCount} tokenDihapus=${result.invalidRemovedCount}`
    );

    return new Response(
      JSON.stringify({
        ok: true,
        table: payload.table,
        sentCount: result.sentCount,
        invalidRemovedCount: result.invalidRemovedCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const code =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      typeof err.code === 'string'
        ? err.code
        : 'INTERNAL_ERROR';
    console.error(`[notify-queue] Kesalahan pemrosesan (${code}).`);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

