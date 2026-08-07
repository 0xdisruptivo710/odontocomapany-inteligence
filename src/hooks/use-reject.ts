import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLE_LOG } from '@/lib/constants';
import { getOperatorOnce } from './use-operator';
import type { SuggestionRow } from '@/lib/types';

/** Rejeitar é só um UPDATE. Nenhuma chamada à WTS, nada chega ao paciente. */
export function useReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: SuggestionRow[]) => {
      const ids = rows.map((r) => r.id);
      const { error } = await supabase
        .from(TABLE_LOG)
        .update({
          action_status: 'rejected',
          actioned_by: getOperatorOnce(),
          actioned_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw new Error(error.message);
      return ids.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
