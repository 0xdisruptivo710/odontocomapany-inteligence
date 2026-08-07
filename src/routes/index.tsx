import { useCallback, useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { rootRoute } from './__root';
import { AppHeader } from '@/components/layout/app-header';
import { BulkActionBar } from '@/components/layout/bulk-action-bar';
import { SuggestionsTable } from '@/components/table/suggestions-table';
import { SuggestionDrawer } from '@/components/drawer/suggestion-drawer';
import { useUnitFilter } from '@/hooks/use-unit-filter';
import { useOperator } from '@/hooks/use-operator';
import { useRealtime } from '@/hooks/use-realtime';
import { useSuggestions } from '@/hooks/use-suggestions';
import { usePanelMapping } from '@/hooks/use-panel-mapping';
import { useTagsCatalog } from '@/hooks/use-tags-catalog';
import { useBulkApprove } from '@/hooks/use-approve';
import { useReject } from '@/hooks/use-reject';
import type { SuggestionRow } from '@/lib/types';

function InboxPage() {
  const qc = useQueryClient();
  const [unit, setUnit] = useUnitFilter();
  const [operator, setOperator] = useOperator();
  const realtime = useRealtime();

  const suggestions = useSuggestions(unit, realtime === 'SUBSCRIBED');
  const mapping = usePanelMapping();
  const tags = useTagsCatalog();

  const bulkApprove = useBulkApprove();
  const reject = useReject();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openRow, setOpenRow] = useState<SuggestionRow | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const rows = useMemo(() => suggestions.data ?? [], [suggestions.data]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }, [rows]);

  const selectedRows = rows.filter((r) => selected.has(r.id));

  async function onBulkApprove() {
    setProgress({ done: 0, total: selectedRows.length });
    const outcomes = await bulkApprove.mutateAsync({
      rows: selectedRows,
      mapping: mapping.data,
      tagsCatalog: tags.data,
      onProgress: (done, total) => setProgress({ done, total }),
    });
    setProgress(null);
    setSelected(new Set());
    const falhas = outcomes.filter((o) => o.status === 'failed').length;
    if (falhas === 0) toast.success(`${outcomes.length} aplicadas no CRM`);
    else toast.warning(`${outcomes.length - falhas} aplicadas, ${falhas} falharam`);
  }

  async function onBulkReject() {
    const n = await reject.mutateAsync(selectedRows);
    setSelected(new Set());
    toast.success(`${n} descartadas`);
  }

  const busy = bulkApprove.isPending || reject.isPending;

  return (
    <>
      <AppHeader
        unit={unit}
        onUnitChange={(v) => {
          setUnit(v);
          setSelected(new Set());
        }}
        operator={operator}
        onOperatorChange={setOperator}
        realtime={realtime}
        onRefresh={() => void qc.invalidateQueries({ queryKey: ['suggestions'] })}
        refreshing={suggestions.isFetching}
      />

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-4 flex items-baseline gap-3">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em]">Aguardando decisão</h1>
          <span className="text-[13px] text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'sugestão' : 'sugestões'}
          </span>
        </div>

        {suggestions.isError && (
          <p className="mb-4 rounded-lg bg-destructive-soft px-4 py-3 text-[13px] text-destructive">
            Não deu para carregar: {(suggestions.error as Error).message}
          </p>
        )}

        {tags.data && tags.data.duplicates.length > 0 && (
          <p className="mb-4 rounded-lg bg-warning-soft px-4 py-3 text-[13px] text-[#92400E]">
            Há etiquetas com nome repetido na conta ({tags.data.duplicates.join(', ')}). Isso faz o
            filtro do WTS esconder parte da base. Vale limpar antes de etiquetar em volume.
          </p>
        )}

        <div className="rounded-xl border border-border bg-surface">
          <SuggestionsTable
            rows={rows}
            loading={suggestions.isLoading}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onOpen={setOpenRow}
          />
        </div>
      </main>

      <BulkActionBar
        count={selected.size}
        onApprove={onBulkApprove}
        onReject={onBulkReject}
        onClear={() => setSelected(new Set())}
        busy={busy}
        progress={progress}
      />

      <SuggestionDrawer
        row={openRow}
        open={openRow !== null}
        onOpenChange={(v) => !v && setOpenRow(null)}
        mapping={mapping.data}
        tagsCatalog={tags.data}
      />
    </>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: InboxPage,
});
