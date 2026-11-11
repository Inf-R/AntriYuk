import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { clearCachedActiveTicket } from '@/db/sqlite';
import { supabase } from '@/lib/supabase';
import { unregisterCurrentPushToken } from '@/hooks/usePushRegistration';
import type { Database } from '@/types/database';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface SessionContextValue {
  session: Session | null;
  profile: ProfileRow | null;
  ownerBusinessId: string | null;
  isLoading: boolean;
  isResettingPassword: boolean;
  setIsResettingPassword: (val: boolean) => void;
  refreshUserContext: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ownerBusinessId, setOwnerBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);

  const loadRoleAndBusiness = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, display_name, role, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr || !profileData) {
        setProfile(null);
        setOwnerBusinessId(null);
        return;
      }

      setProfile(profileData);

      if (profileData.role === 'owner') {
        const { data: bizData } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', userId)
          .maybeSingle();

        setOwnerBusinessId(bizData?.id ?? null);
      } else {
        setOwnerBusinessId(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }
        const currentSession = data.session;
        setSession(currentSession);

        if (currentSession?.user) {
          await loadRoleAndBusiness(currentSession.user.id);
        } else {
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!isMounted) {
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          setIsResettingPassword(true);
        }

        setSession(nextSession);

        if (nextSession?.user) {
          void loadRoleAndBusiness(nextSession.user.id);
        } else {
          setProfile(null);
          setOwnerBusinessId(null);
          setIsResettingPassword(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadRoleAndBusiness]);

  const refreshUserContext = useCallback(async () => {
    if (session?.user) {
      await loadRoleAndBusiness(session.user.id);
    }
  }, [loadRoleAndBusiness, session]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearCachedActiveTicket();
      await unregisterCurrentPushToken();
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setOwnerBusinessId(null);
      setIsResettingPassword(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    await unregisterCurrentPushToken();
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      throw error;
    }
    await clearCachedActiveTicket();
    try {
      await supabase.auth.signOut();
    } catch {
      // Sesi user sudah terhapus di server oleh delete_my_account
    }
    setSession(null);
    setProfile(null);
    setOwnerBusinessId(null);
    setIsResettingPassword(false);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      profile,
      ownerBusinessId,
      isLoading,
      isResettingPassword,
      setIsResettingPassword,
      refreshUserContext,
      signOut,
      deleteAccount,
    }),
    [
      session,
      profile,
      ownerBusinessId,
      isLoading,
      isResettingPassword,
      refreshUserContext,
      signOut,
      deleteAccount,
    ]
  );

  return React.createElement(SessionContext.Provider, { value }, children);
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession harus digunakan di dalam SessionProvider.');
  }
  return context;
}
