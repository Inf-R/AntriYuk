import * as SQLite from 'expo-sqlite';
import type { TicketStatus } from '@/types/database';

const DB_NAME = 'antriyuk_cache.db';

export interface CachedActiveTicketRow {
  ticket_id: string;
  business_name: string;
  ticket_number: number;
  ticket_status: TicketStatus;
  current_number: number;
  ahead: number;
  est_minutes: number;
  grace_minutes: number;
  called_at: string | null;
  updated_at: string;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS active_ticket (
          ticket_id TEXT PRIMARY KEY NOT NULL,
          business_name TEXT NOT NULL,
          ticket_number INTEGER NOT NULL,
          ticket_status TEXT NOT NULL,
          current_number INTEGER NOT NULL,
          ahead INTEGER NOT NULL,
          est_minutes INTEGER NOT NULL,
          grace_minutes INTEGER NOT NULL,
          called_at TEXT,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

/**
 * Menyimpan (menulis ulang) baris tiket aktif ke SQLite setiap kali `my_position` berhasil.
 * Hanya menyimpan tiket yang masih aktif ('waiting' atau 'called').
 */
export async function saveCachedActiveTicket(
  row: CachedActiveTicketRow
): Promise<void> {
  try {
    // Jangan pernah menyimpan tiket berstatus terminal sebagai tiket aktif
    if (row.ticket_status !== 'waiting' && row.ticket_status !== 'called') {
      await clearCachedActiveTicket();
      return;
    }

    const db = await getDatabase();
    await db.runAsync('DELETE FROM active_ticket;');
    await db.runAsync(
      `INSERT OR REPLACE INTO active_ticket (
        ticket_id,
        business_name,
        ticket_number,
        ticket_status,
        current_number,
        ahead,
        est_minutes,
        grace_minutes,
        called_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        row.ticket_id,
        row.business_name,
        row.ticket_number,
        row.ticket_status,
        row.current_number,
        row.ahead,
        row.est_minutes,
        row.grace_minutes,
        row.called_at,
        row.updated_at,
      ]
    );
  } catch {
    // Abaikan kegagalan I/O lokal agar alur utama tidak terganggu
  }
}

/**
 * Membaca cache tiket aktif dari SQLite.
 * Jika status yang tersimpan sudah bukan 'waiting' atau 'called', otomatis dibersihkan.
 */
export async function getCachedActiveTicket(): Promise<CachedActiveTicketRow | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CachedActiveTicketRow>(
      `SELECT
        ticket_id,
        business_name,
        ticket_number,
        ticket_status,
        current_number,
        ahead,
        est_minutes,
        grace_minutes,
        called_at,
        updated_at
      FROM active_ticket
      LIMIT 1;`
    );

    if (!row) {
      return null;
    }

    if (row.ticket_status !== 'waiting' && row.ticket_status !== 'called') {
      await clearCachedActiveTicket();
      return null;
    }

    return row;
  } catch {
    return null;
  }
}

/**
 * Menghapus cache tiket aktif dari SQLite
 * (dipanggil saat tiket done/cancelled/no_show/expired, saat logout, dan saat hapus akun).
 */
export async function clearCachedActiveTicket(): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM active_ticket;');
  } catch {
    // Abaikan kegagalan I/O lokal
  }
}
