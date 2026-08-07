import { Inbox } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfidenceBadge, ScenarioBadge, StatusBadge, TypeBadge, UnitBadge } from './badges';
import { formatRelativeTime, truncate } from '@/lib/format';
import { attendantById, columnLeaf } from '@/lib/units';
import { cn } from '@/lib/utils';
import type { SuggestionRow } from '@/lib/types';

type Props = {
  rows: SuggestionRow[];
  loading: boolean;
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onOpen: (row: SuggestionRow) => void;
  /** No histórico não há seleção nem aprovação. */
  readOnly?: boolean;
};

export function SuggestionsTable({
  rows,
  loading,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  readOnly = false,
}: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
        <Inbox className="h-6 w-6 text-subtle-foreground" />
        <p className="text-[14px] font-medium">Nada por aqui</p>
        <p className="max-w-[46ch] text-[13px] text-muted-foreground">
          {readOnly
            ? 'Ainda não há decisões registradas para esta unidade.'
            : 'Nenhuma sugestão aguardando decisão. O scanner roda às 9h05 na Vila Helena e às 9h25 na Santa Rosália.'}
        </p>
      </div>
    );
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {!readOnly && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onToggleAll}
                  aria-label="Selecionar todas"
                />
              </TableHead>
            )}
            <TableHead>Paciente</TableHead>
            <TableHead className="w-16">Unidade</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Coluna sugerida</TableHead>
            <TableHead className="w-24">Tipo</TableHead>
            <TableHead className="w-20">Confiança</TableHead>
            <TableHead>Atendente</TableHead>
            {readOnly && <TableHead className="w-24">Resultado</TableHead>}
            <TableHead className="w-28">Classificado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isSel = selected.has(row.id);
            const attendant = attendantById(row.responsible_user_id);
            return (
              <TableRow
                key={row.id}
                onClick={() => onOpen(row)}
                className={cn(
                  'cursor-pointer transition-colors',
                  isSel && 'bg-muted/60',
                )}
              >
                {!readOnly && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={() => onToggle(row.id)}
                      aria-label={`Selecionar ${row.customer_name ?? row.session_id}`}
                    />
                  </TableCell>
                )}
                <TableCell className="max-w-[240px]">
                  <div className="truncate font-medium">{row.customer_name ?? 'Sem nome'}</div>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {truncate(row.reasoning_short, 64)}
                  </div>
                </TableCell>
                <TableCell>
                  <UnitBadge unit={row.unit_key} />
                </TableCell>
                <TableCell>
                  <ScenarioBadge scenario={row.scenario} />
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {columnLeaf(row.column_applied) || '—'}
                </TableCell>
                <TableCell>
                  <TypeBadge suggestMessage={row.suggest_message} />
                </TableCell>
                <TableCell>
                  <ConfidenceBadge value={row.confidence} />
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {attendant?.signature ?? row.responsible_user_name ?? '—'}
                </TableCell>
                {readOnly && (
                  <TableCell>
                    <StatusBadge status={row.action_status} />
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                  {formatRelativeTime(row.classified_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
