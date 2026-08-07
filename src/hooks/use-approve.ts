import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BULK_CONCURRENCY, OPT_OUT_TAGS, TABLE_LOG, WTS_RATE_LIMIT_MS } from '@/lib/constants';
import { sleep } from '@/lib/utils';
import { signMessage } from '@/lib/validation';
import { UNITS, attendantById, columnLeaf, compositeKey } from '@/lib/units';
import {
  wtsApplyTagById,
  wtsCreateCard,
  wtsGetCards,
  wtsGetContactByPhone,
  wtsMoveCard,
  wtsSendMessage,
} from '@/lib/wts';
import { getOperatorOnce } from './use-operator';
import { resolveTagId, type TagsCatalog } from './use-tags-catalog';
import type { PanelMapping } from './use-panel-mapping';
import type { CardAction, SuggestionRow, WtsErrorEntry, WtsResult } from '@/lib/types';

export type ApproveInput = {
  row: SuggestionRow;
  /** Texto editado pelo atendente. Sem prefixo — a assinatura entra no envio. */
  override?: string | null;
  /** Coluna escolhida no drawer (só o nome da etapa), se diferente da sugerida. */
  columnOverride?: string | null;
  /** Etiqueta escolhida no drawer, se diferente da sugerida. */
  tagOverride?: string | null;
  mapping?: PanelMapping;
  tagsCatalog?: TagsCatalog;
};

export type ApproveOutcome = {
  rowId: number;
  status: 'executed' | 'failed';
  errors: Record<string, WtsErrorEntry>;
};

function toEntry(r: WtsResult): WtsErrorEntry {
  return r.ok ? { ok: true } : { ok: false, status: r.status, error: r.error };
}

export async function approveOne({
  row,
  override,
  columnOverride,
  tagOverride,
  mapping,
  tagsCatalog,
}: ApproveInput): Promise<ApproveOutcome> {
  const unit = UNITS[row.unit_key];
  const errors: Record<string, WtsErrorEntry> = {};
  const ts = () => new Date().toISOString();
  const updates: Record<string, unknown> = {
    actioned_by: getOperatorOnce(),
    actioned_at: ts(),
    human_message_override: override ?? null,
  };

  // Opt-out vence tudo. Se o paciente pediu para não ser procurado, nem a
  // etiqueta nem o card devem ser mexidos por automação.
  const optOut = (row.current_tag_names ?? []).some((t) =>
    OPT_OUT_TAGS.includes(String(t).toLowerCase().trim()),
  );
  if (optOut) {
    const { error } = await supabase
      .from(TABLE_LOG)
      .update({ ...updates, action_status: 'rejected', error_reason: 'opt_out' })
      .eq('id', row.id);
    return {
      rowId: row.id,
      status: error ? 'failed' : 'executed',
      errors: { opt_out: { ok: false, status: 0, error: 'contato_com_nao_perturbe' } },
    };
  }

  // O scanner já resolve contact_id e telefone. Só cai no fallback se faltar.
  let phone = row.customer_phone;
  let contactId = row.contact_id;
  if (phone && !contactId) {
    const res = await wtsGetContactByPhone(phone);
    errors.resolve_contact = toEntry(res);
    await sleep(WTS_RATE_LIMIT_MS);
    if (res.ok) {
      contactId = res.data.id;
      updates.contact_id = contactId;
    }
  }

  // ── 1. Etiqueta ────────────────────────────────────────────────────────────
  const tagName = tagOverride ?? row.tag_applied;
  if (tagName) {
    const tagId = resolveTagId(tagsCatalog, tagOverride ? null : row.suggested_tag_id, tagName);
    if (!tagId) {
      errors.apply_tag = { ok: false, status: 0, error: `etiqueta_nao_cadastrada:${tagName}` };
    } else if (!phone) {
      errors.apply_tag = { ok: false, status: 0, error: 'sem_telefone' };
    } else {
      const res = await wtsApplyTagById(phone, tagId);
      errors.apply_tag = toEntry(res);
      if (res.ok) {
        updates.wts_tag_applied_at = ts();
        updates.tag_applied = tagName;
        updates.suggested_tag_id = tagId;
      }
      await sleep(WTS_RATE_LIMIT_MS);
    }
  }

  // ── 2. Card ────────────────────────────────────────────────────────────────
  const columnName = columnOverride ?? columnLeaf(row.column_applied);
  if (columnName) {
    const key = compositeKey(unit, columnName);
    const map = mapping?.get(key);
    if (!map) {
      errors.card = { ok: false, status: 0, error: `coluna_sem_mapeamento:${key}` };
      updates.card_action = 'none' satisfies CardAction;
    } else if (!contactId) {
      errors.card = { ok: false, status: 0, error: 'sem_contact_id' };
      updates.card_action = 'none' satisfies CardAction;
    } else {
      updates.column_applied = key;
      updates.suggested_step_id = map.step_id;

      const cardsRes = await wtsGetCards(map.panel_id, contactId);
      await sleep(WTS_RATE_LIMIT_MS);

      if (!cardsRes.ok) {
        errors.card = toEntry(cardsRes);
        updates.card_action = 'none' satisfies CardAction;
      } else {
        // Card em WON ou LOST não aceita troca de etapa (o PUT devolve 500).
        // Em Santa Rosália isso é comum: o painel perde card sozinho aos 30 dias.
        const open = cardsRes.data.find((c) => String(c.status ?? 'OPEN').toUpperCase() === 'OPEN');
        const anyCard = cardsRes.data[0];

        if (open) {
          const moveRes = await wtsMoveCard(open.id, map.step_id);
          errors.card = toEntry(moveRes);
          if (moveRes.ok) {
            updates.wts_card_moved_at = ts();
            updates.card_action = 'move' satisfies CardAction;
            updates.card_id_used = open.id;
            updates.step_id_anterior = open.stepId ?? null;
          } else {
            updates.card_action = 'none' satisfies CardAction;
          }
          await sleep(WTS_RATE_LIMIT_MS);
        } else if (anyCard) {
          errors.card = {
            ok: false,
            status: 0,
            error: `card_em_estado_final:${String(anyCard.status ?? '').toUpperCase()}`,
          };
          updates.card_action = 'none' satisfies CardAction;
          updates.card_id_used = anyCard.id;
        } else {
          const createRes = await wtsCreateCard({
            stepId: map.step_id,
            title: row.customer_name ?? row.customer_phone ?? 'Paciente sem nome',
            contactId,
            sessionId: row.session_id,
            responsibleUserId: row.responsible_user_id,
          });
          errors.card = toEntry(createRes);
          if (createRes.ok) {
            updates.wts_card_created_at = ts();
            updates.card_action = 'create' satisfies CardAction;
            updates.card_id_used = createRes.data?.id ?? null;
          } else {
            updates.card_action = 'none' satisfies CardAction;
          }
          await sleep(WTS_RATE_LIMIT_MS);
        }
      }
    }
  }

  // ── 3. Mensagem ────────────────────────────────────────────────────────────
  if (row.suggest_message) {
    const corpo = (override ?? row.message_sent ?? '').trim();
    if (!corpo) {
      errors.send_message = { ok: false, status: 0, error: 'mensagem_vazia' };
    } else if (!phone) {
      errors.send_message = { ok: false, status: 0, error: 'sem_telefone' };
    } else {
      // Assina com quem já atende a conversa: o paciente não deve perceber
      // troca de interlocutor no meio do atendimento.
      const attendant = attendantById(row.responsible_user_id);
      const texto = signMessage(attendant?.signature, corpo);
      const res = await wtsSendMessage(unit, phone, texto);
      errors.send_message = toEntry(res);
      if (res.ok) {
        updates.wts_message_sent_at = ts();
        updates.message_sent = corpo;
      }
    }
  }

  const keys = Object.keys(errors);
  const anyOk = keys.length > 0 && keys.some((k) => errors[k]!.ok);
  const status: 'executed' | 'failed' = anyOk ? 'executed' : 'failed';

  updates.action_status = status;
  updates.wts_errors = errors;

  const { error: updErr } = await supabase.from(TABLE_LOG).update(updates).eq('id', row.id);
  if (updErr) {
    return {
      rowId: row.id,
      status: 'failed',
      errors: { supabase_update: { ok: false, status: 0, error: updErr.message } },
    };
  }

  return { rowId: row.id, status, errors };
}

export function useApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveOne,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      rows: SuggestionRow[];
      mapping?: PanelMapping;
      tagsCatalog?: TagsCatalog;
      onProgress?: (done: number, total: number) => void;
    }) => {
      const { rows, mapping, tagsCatalog, onProgress } = args;
      const outcomes: ApproveOutcome[] = [];
      let done = 0;
      for (let i = 0; i < rows.length; i += BULK_CONCURRENCY) {
        const chunk = rows.slice(i, i + BULK_CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map((row) => approveOne({ row, mapping, tagsCatalog })),
        );
        for (const r of results) {
          if (r.status === 'fulfilled') outcomes.push(r.value);
          else {
            outcomes.push({
              rowId: -1,
              status: 'failed',
              errors: { desconhecido: { ok: false, status: 0, error: String(r.reason) } },
            });
          }
          done += 1;
          onProgress?.(done, rows.length);
        }
      }
      return outcomes;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
