import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BulkActionBar({
  count,
  onApprove,
  onReject,
  onClear,
  busy,
  progress,
}: {
  count: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  busy: boolean;
  progress: { done: number; total: number } | null;
}) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3">
        <span className="text-[13px] font-medium">
          {count} {count === 1 ? 'selecionada' : 'selecionadas'}
        </span>

        {progress && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[12px] text-muted-foreground">
              {progress.done}/{progress.total}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>
            Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={onReject} disabled={busy}>
            <X className="h-4 w-4" />
            Descartar
          </Button>
          <Button size="sm" onClick={onApprove} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Aprovar
          </Button>
        </div>
      </div>
    </div>
  );
}
