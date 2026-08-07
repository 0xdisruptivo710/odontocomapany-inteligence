import { cn } from '@/lib/utils';
import { UNITS, type UnitFilter } from '@/lib/units';

const OPTIONS: { value: UnitFilter; label: string; title: string }[] = [
  { value: 'all', label: 'Ambas', title: 'Vila Helena e Santa Rosália' },
  { value: 'vh', label: UNITS.vh.name, title: UNITS.vh.address },
  { value: 'sr', label: UNITS.sr.name, title: UNITS.sr.address },
];

/**
 * Unidade em foco. É o controle mais importante do header: cada unidade tem
 * painel, número e equipe próprios, e o atendente da Vila Helena não deve
 * sequer ver a fila da Santa Rosália por engano.
 */
export function UnitSwitch({
  value,
  onChange,
}: {
  value: UnitFilter;
  onChange: (v: UnitFilter) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Unidade"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              active
                ? 'bg-surface text-foreground shadow-[0_1px_2px_rgb(17_24_39/0.06)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
