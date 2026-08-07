import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE, TABLE_LOG } from '@/lib/constants';
import type { SuggestionRow } from '@/lib/types';
import type { UnitFilter } from '@/lib/units';

/** Tudo que já foi decidido: executado, rejeitado ou falhou. Somente leitura. */
export function useHistory(unit: UnitFilter, limit = 300) {
  return useQuery({
    queryKey: ['history', unit, limit],
    queryFn: async (): Promise<SuggestionRow[]> => {
      let q = supabase
        .from(TABLE_LOG)
        .select('*')
        .eq('client_handle', CLIENT_HANDLE)
        .in('action_status', ['executed', 'rejected', 'failed'])
        .order('actioned_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (unit !== 'all') q = q.eq('unit_key', unit);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as SuggestionRow[];
    },
    staleTime: 30_000,
  });
}
