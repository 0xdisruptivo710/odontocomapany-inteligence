import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE, TABLE_LOG } from '@/lib/constants';
import type { SuggestionRow } from '@/lib/types';
import type { UnitFilter } from '@/lib/units';

/**
 * A inbox: tudo que o scanner sugeriu e ninguém decidiu ainda.
 *
 * O scanner roda em SHADOW_MODE, então nada foi aplicado na WTS — este app é o
 * único caminho até lá.
 */
export function useSuggestions(unit: UnitFilter, realtimeOk: boolean) {
  return useQuery({
    queryKey: ['suggestions', unit],
    queryFn: async (): Promise<SuggestionRow[]> => {
      let q = supabase
        .from(TABLE_LOG)
        .select('*')
        .eq('client_handle', CLIENT_HANDLE)
        .eq('action_status', 'pending')
        .order('confidence', { ascending: false })
        .order('classified_at', { ascending: false });

      if (unit !== 'all') q = q.eq('unit_key', unit);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as SuggestionRow[];
    },
    // Realtime é o caminho normal; o polling só entra se o canal não subir.
    refetchInterval: realtimeOk ? false : 30_000,
    staleTime: 10_000,
  });
}
