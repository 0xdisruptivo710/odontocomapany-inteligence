import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { rootRoute } from './__root';
import { AppHeader } from '@/components/layout/app-header';
import { SuggestionsTable } from '@/components/table/suggestions-table';
import { useUnitFilter } from '@/hooks/use-unit-filter';
import { useOperator } from '@/hooks/use-operator';
import { useRealtime } from '@/hooks/use-realtime';
import { useHistory } from '@/hooks/use-history';
import { formatDateTime } from '@/lib/format';
import { asObject } from '@/lib/jsonb';
import type { SuggestionRow, WtsErrorEntry } from '@/lib/types';

function HistoricoPage() {
  const qc = useQueryClient();
  const [unit, setUnit] = useUnitFilter();
  const [operator, setOperator] = useOperator();
  const realtime = useRealtime();
  const history = useHistory(unit);
  const [detail, setDetail] = useState<SuggestionRow | null>(null);

  const rows = history.data ?? [];

  return (
    <>
      <AppHeader
        unit={unit}
        onUnitChange={setUnit}
        operator={operator}
        onOperatorChange={setOperator}
        realtime={realtime}
        onRefresh={() => void qc.invalidateQueries({ queryKey: ['history'] })}
        refreshing={history.isFetching}
      />

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-4 flex items-baseline gap-3">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em]">Histórico</h1>
          <span className="text-[13px] text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'decisão' : 'decisões'}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface">
          <SuggestionsTable
            rows={rows}
            loading={history.isLoading}
            selected={new Set()}
            onToggle={() => {}}
            onToggleAll={() => {}}
            onOpen={setDetail}
            readOnly
          />
        </div>

        {detail && (
          <div className="mt-6 rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">
                {detail.customer_name ?? 'Paciente sem nome'}
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-[12px] text-muted-foreground hover:text-foreground"
              >
                fechar
              </button>
            </div>
            <dl className="grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
              <Row label="Decidido por" value={detail.actioned_by ?? '—'} />
              <Row label="Quando" value={formatDateTime(detail.actioned_at)} />
              <Row label="Coluna aplicada" value={detail.column_applied ?? '—'} />
              <Row label="Etiqueta" value={detail.tag_applied ?? '—'} />
              <Row label="Card movido" value={formatDateTime(detail.wts_card_moved_at)} />
              <Row label="Card criado" value={formatDateTime(detail.wts_card_created_at)} />
              <Row label="Mensagem enviada" value={formatDateTime(detail.wts_message_sent_at)} />
              <Row label="Etapa anterior" value={detail.step_id_anterior ?? '—'} />
            </dl>
            {detail.message_sent && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-[13px]">
                {detail.message_sent}
              </p>
            )}
            {(() => {
              // jsonb volta como string; Object.entries numa string devolve os
              // caracteres um a um e renderiza lixo. Ver src/lib/jsonb.ts.
              const erros = Object.entries(asObject<Record<string, WtsErrorEntry>>(detail.wts_errors))
                .filter(([, v]) => v && typeof v === 'object' && !v.ok);
              if (erros.length === 0) return null;
              return (
                <div className="mt-3 rounded-lg bg-destructive-soft p-3 text-[12.5px] text-destructive">
                  {erros.map(([k, v]) => (
                    <p key={k}>
                      <span className="font-medium">{k}</span>: {v.error}
                    </p>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-[130px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-[12.5px]">{value}</dd>
    </div>
  );
}

export const historicoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/historico',
  component: HistoricoPage,
});
