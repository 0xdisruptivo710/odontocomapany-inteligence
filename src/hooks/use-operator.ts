import { useCallback, useState } from 'react';
import { ATTENDANTS, displayName } from '@/lib/units';

const KEY = 'odonto.operator';

/**
 * Quem está operando. Vai para `actioned_by`, então precisa carregar a unidade
 * junto: existem dois Lucas de Sousa e "Lucas" sozinho não diz qual.
 */
export const OPERATOR_OPTIONS = ATTENDANTS.map(displayName);

function read(): string {
  if (typeof window === 'undefined') return OPERATOR_OPTIONS[0] ?? '';
  const v = window.localStorage.getItem(KEY);
  return v && OPERATOR_OPTIONS.includes(v) ? v : (OPERATOR_OPTIONS[0] ?? '');
}

export function useOperator(): [string, (v: string) => void] {
  const [operator, setState] = useState<string>(read);
  const set = useCallback((v: string) => {
    window.localStorage.setItem(KEY, v);
    setState(v);
  }, []);
  return [operator, set];
}

export function getOperatorOnce(): string {
  return read();
}
