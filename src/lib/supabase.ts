import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Adapter penyimpanan sesi terenkripsi sesuai pola resmi dokumentasi Supabase React Native (`LargeSecureStore`).
 * [VERIFIKASI: perlu diverifikasi di dokumentasi resmi Supabase — React Native Quickstart / Encrypting the user session]
 *
 * Alasan pendekatan:
 * `expo-secure-store` memiliki batas ukuran sekitar 2048 byte per item, sedangkan objek sesi JWT Supabase
 * dapat melebihi batas tersebut. Karena itu, kunci enkripsi AES-256 disimpan di `expo-secure-store`
 * dan payload sesi yang telah dienkripsi (AES-CTR) disimpan di `AsyncStorage`.
 */
class LargeSecureStore {
  private async _encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) {
      return null;
    }

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) {
      return null;
    }
    return await this._decrypt(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured =
  rawSupabaseUrl.length > 0 &&
  rawSupabaseAnonKey.length > 0 &&
  rawSupabaseUrl.startsWith('http') &&
  !rawSupabaseUrl.includes('project-ref-anda');

// Fallback aman agar modul tidak melempar exception saat di-import sebelum .env diisi
const supabaseUrl = isSupabaseConfigured ? rawSupabaseUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawSupabaseAnonKey : 'placeholder-anon-key';

const storageAdapter = Platform.OS === 'web' ? AsyncStorage : new LargeSecureStore();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Mengelola pembaruan token otomatis ketika aplikasi berada di foreground.
 * [VERIFIKASI: perlu diverifikasi di dokumentasi resmi Supabase — auth.startAutoRefresh / stopAutoRefresh]
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

