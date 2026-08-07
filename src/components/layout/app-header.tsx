import { Link } from '@tanstack/react-router';
import { Circle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UnitSwitch } from './unit-switch';
import { OPERATOR_OPTIONS } from '@/hooks/use-operator';
import { cn } from '@/lib/utils';
import type { UnitFilter } from '@/lib/units';
import type { RealtimeStatus } from '@/lib/types';

export function AppHeader({
  unit,
  onUnitChange,
  operator,
  onOperatorChange,
  realtime,
  onRefresh,
  refreshing,
}: {
  unit: UnitFilter;
  onUnitChange: (v: UnitFilter) => void;
  operator: string;
  onOperatorChange: (v: string) => void;
  realtime: RealtimeStatus;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const live = realtime === 'SUBSCRIBED';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-3 px-6 py-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">AIOS Inteligence</span>
          <span className="text-[13px] text-muted-foreground">OdontoCompany</span>
        </div>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="rounded-full px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
          >
            Fila
          </Link>
          <Link
            to="/historico"
            className="rounded-full px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
          >
            Histórico
          </Link>
        </nav>

        <UnitSwitch value={unit} onChange={onUnitChange} />

        <div className="ml-auto flex items-center gap-3">
          <span
            title={live ? 'Recebendo mudanças em tempo real' : 'Sem tempo real, atualizando a cada 30s'}
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
          >
            <Circle
              className={cn('h-2 w-2 fill-current', live ? 'text-success' : 'text-subtle-foreground')}
            />
            {live ? 'Ao vivo' : 'Offline'}
          </span>

          <Select value={operator} onValueChange={onOperatorChange}>
            <SelectTrigger className="h-8 w-[150px] text-[12px]" aria-label="Quem está operando">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              {OPERATOR_OPTIONS.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Atualizar"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>
    </header>
  );
}
