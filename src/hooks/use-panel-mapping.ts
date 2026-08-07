import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE, TABLE_PANEL_MAPPING } from '@/lib/constants';
import type { PanelMappingRow } from '@/lib/types';

export type PanelMapping = Map<string, PanelMappingRow>;

/**
 * Traduz a chave composta "Clientes (HL) > Em conversa" em (panel_id, step_id).
 *
 * É a fonte de verdade do destino do card, e não o `suggested_step_id` que o
 * classificador gravou: se fosse o contrário, trocar a coluna no drawer não
 * teria efeito nenhum e o card iria para a etapa que a IA escolheu.
 */
export function usePanelMapping() {
  return useQuery({
    queryKey: ['panel-mapping'],
    queryFn: async (): Promise<PanelMapping> => {
      const { data, error } = await supabase
        .from(TABLE_PANEL_MAPPING)
        .select('*')
        .eq('client_handle', CLIENT_HANDLE);
      if (error) throw new Error(error.message);
      const map: PanelMapping = new Map();
      for (const row of (data ?? []) as PanelMappingRow[]) {
        map.set(row.composite_key, row);
      }
      return map;
    },
    staleTime: 10 * 60_000,
  });
}
