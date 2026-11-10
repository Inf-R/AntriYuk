import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import type { BusinessFormInput } from '@/lib/validation';
import type { Database } from '@/types/database';

export type BusinessRow = Database['public']['Tables']['businesses']['Row'];

export function useMyBusiness() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery<BusinessRow | null>({
    queryKey: ['my-business', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      const { data, error } = await supabase
        .from('businesses')
        .select(
          'id, owner_id, name, category, address, avg_service_minutes, grace_minutes, is_queue_open, created_at, updated_at'
        )
        .eq('owner_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });
}

export function useCreateBusiness() {
  const { session, refreshUserContext } = useSession();
  const queryClient = useQueryClient();

  return useMutation<BusinessRow, unknown, BusinessFormInput>({
    mutationFn: async (input: BusinessFormInput) => {
      const userId = session?.user.id;
      if (!userId) {
        throw new Error('UNAUTHENTICATED');
      }

      const { data, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: userId,
          name: input.name,
          category: input.category,
          address: input.address.length > 0 ? input.address : null,
          avg_service_minutes: input.avgServiceMinutes,
          grace_minutes: input.graceMinutes,
        })
        .select(
          'id, owner_id, name, category, address, avg_service_minutes, grace_minutes, is_queue_open, created_at, updated_at'
        )
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async (createdBusiness) => {
      const userId = session?.user.id;
      queryClient.setQueryData(['my-business', userId], createdBusiness);
      await queryClient.invalidateQueries({ queryKey: ['my-business'] });
      await refreshUserContext();
    },
  });
}

export function useUpdateBusiness(businessId: string | undefined) {
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<BusinessRow, unknown, BusinessFormInput>({
    mutationFn: async (input: BusinessFormInput) => {
      const userId = session?.user.id;
      if (!userId || !businessId) {
        throw new Error('UNAUTHENTICATED');
      }

      // Hanya meng-update kolom yang diizinkan oleh GRANT di 0001_init_antriyuk.sql
      const { data, error } = await supabase
        .from('businesses')
        .update({
          name: input.name,
          category: input.category,
          address: input.address.length > 0 ? input.address : null,
          avg_service_minutes: input.avgServiceMinutes,
          grace_minutes: input.graceMinutes,
        })
        .eq('id', businessId)
        .eq('owner_id', userId)
        .select(
          'id, owner_id, name, category, address, avg_service_minutes, grace_minutes, is_queue_open, created_at, updated_at'
        )
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async (updatedBusiness) => {
      const userId = session?.user.id;
      queryClient.setQueryData(['my-business', userId], updatedBusiness);
      await queryClient.invalidateQueries({ queryKey: ['my-business'] });
    },
  });
}

