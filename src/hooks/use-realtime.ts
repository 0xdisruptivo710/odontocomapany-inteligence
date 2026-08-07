import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE, TABLE_LOG } from '@/lib/constants';
import type { RealtimeStatus } from '@/lib/types';

/**
 * Escuta mudanças na tabela de log e invalida as queries.
 *
 * Devolve o estado do canal para o header mostrar Live/Offline e para a query
 * decidir se precisa cair no polling.
 */
export function useRealtime(): RealtimeStatus {
  const qc = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('CONNECTING');

  useEffect(() => {
    const channel = supabase
      .channel('odonto-followups')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_LOG,
          filter: `client_handle=eq.${CLIENT_HANDLE}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['suggestions'] });
          qc.invalidateQueries({ queryKey: ['history'] });
        },
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED' || s === 'CLOSED' || s === 'CHANNEL_ERROR') setStatus(s);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return status;
}
