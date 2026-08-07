import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { scenarioColor, scenarioLabel } from '@/lib/constants';
import { UNITS, type UnitKey } from '@/lib/units';

export function UnitBadge({ unit }: { unit: UnitKey }) {
  const u = UNITS[unit];
  return (
    <Badge
      variant="outline"
      size="sm"
      title={u.address}
      className={cn(
        'font-medium',
        unit === 'vh' ? 'border-info/30 text-info/90' : 'border-primary/30 text-primary/90',
      )}
    >
      {u.short}
    </Badge>
  );
}

export function ScenarioBadge({ scenario }: { scenario: string | null }) {
  if (!scenario) return <span className="text-subtle-foreground">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5',
        scenarioColor(scenario),
      )}
    >
      {scenarioLabel(scenario)}
    </span>
  );
}

export function ConfidenceBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-subtle-foreground">—</span>;
  const pct = Math.round(value * 100);
  // Acima de 85 a IA estava confortável; abaixo de 75 nem seria sugerido.
  const tone = value >= 0.85 ? 'text-foreground' : value >= 0.75 ? 'text-muted-foreground' : 'text-destructive/80';
  return <span className={cn('font-mono text-[12px]', tone)}>{pct}%</span>;
}

export function TypeBadge({ suggestMessage }: { suggestMessage: boolean | null }) {
  return suggestMessage ? (
    <Badge variant="primary" size="sm">
      Mensagem
    </Badge>
  ) : (
    <Badge variant="neutral" size="sm">
      Só CRM
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  if (status === 'executed') return <Badge variant="success" size="sm">Executado</Badge>;
  if (status === 'rejected') return <Badge variant="neutral" size="sm">Rejeitado</Badge>;
  if (status === 'failed') return <Badge variant="danger" size="sm">Falhou</Badge>;
  return <Badge variant="outline" size="sm">{status ?? '—'}</Badge>;
}
