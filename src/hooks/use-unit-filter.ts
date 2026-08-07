import { useCallback, useEffect, useState } from 'react';
import type { UnitFilter } from '@/lib/units';

const KEY = 'odonto.unit';

function read(): UnitFilter {
  if (typeof window === 'undefined') return 'all';
  const v = window.localStorage.getItem(KEY);
  return v === 'vh' || v === 'sr' || v === 'all' ? v : 'all';
}

/**
 * Unidade em foco. Persiste porque quem atende Vila Helena atende Vila Helena o
 * dia inteiro — reescolher a cada carga seria atrito puro.
 */
export function useUnitFilter(): [UnitFilter, (v: UnitFilter) => void] {
  const [unit, setUnitState] = useState<UnitFilter>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setUnitState(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setUnit = useCallback((v: UnitFilter) => {
    window.localStorage.setItem(KEY, v);
    setUnitState(v);
  }, []);

  return [unit, setUnit];
}

export function getUnitFilterOnce(): UnitFilter {
  return read();
}
