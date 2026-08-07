import type { UnitKey } from './units';

export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export type Mode = 'shadow' | 'evaluated' | 'applied' | 'skipped_low_conf' | 'error';

export type CardAction = 'move' | 'create' | 'none';

/** Status do card no WTS. Card em WON/LOST não aceita troca de etapa. */
export type CardStatus = 'OPEN' | 'WON' | 'LOST';

export type WtsErrorEntry = { ok: boolean; status?: number; error?: string };

export type SuggestionRow = {
  id: number;
  client_handle: string;
  unit_key: UnitKey;
  channel_id: string | null;
  session_id: string;
  contact_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  responsible_user_id: string | null;
  responsible_user_name: string | null;

  classified_at: string;
  mode: Mode | null;
  is_followup: boolean | null;
  suggest_message: boolean | null;
  confidence: number | null;
  no_history: boolean | null;

  current_tag_ids: string[] | null;
  current_tag_names: string[] | null;
  tag_applied: string | null;
  suggested_tag_id: string | null;

  /** Chave composta "Clientes (HL) > Em conversa". */
  column_applied: string | null;
  suggested_step_id: string | null;

  card_action: CardAction | null;
  card_id_used: string | null;
  /** Gravado pelo scanner antes de mover — é o que permite desfazer. */
  step_id_anterior: string | null;

  message_sent: string | null;
  reasoning_short: string | null;
  scenario: string | null;
  error_reason: string | null;

  action_status: ActionStatus | null;
  human_message_override: string | null;
  actioned_by: string | null;
  actioned_at: string | null;

  wts_tag_applied_at: string | null;
  wts_card_moved_at: string | null;
  wts_card_created_at: string | null;
  wts_message_sent_at: string | null;
  wts_message_id: string | null;
  wts_errors: Record<string, WtsErrorEntry> | null;

  tokens_input: number | null;
  tokens_output: number | null;
  custo_brl: number | null;

  raw_classifier_json: unknown;
  raw_session_meta: unknown;
};

/**
 * O que o scanner grava em raw_session_meta. Traz contexto que o Life Plans não
 * tem — em especial a UTM, que diz por qual anúncio o paciente entrou.
 */
export type SessionMeta = {
  title?: string | null;
  lastMessageIn?: string | null;
  lastMessageOut?: string | null;
  lastMessageText?: string | null;
  lastInteractionDate?: string | null;
  status?: string | null;
  utm?: {
    campaign?: string | null;
    source?: string | null;
    headline?: string | null;
  } | null;
  responsible?: { user_id?: string | null; name?: string | null; role?: string | null } | null;
  card?: {
    exists?: boolean;
    id?: string | null;
    status?: string | null;
    current_step?: string | null;
  } | null;
};

export type PanelMappingRow = {
  id: number;
  client_handle: string;
  panel_id: string;
  panel_name: string;
  step_id: string;
  step_name: string;
  composite_key: string;
  refreshed_at: string | null;
};

export type RunRow = {
  id: number;
  client_handle: string;
  unit_key: UnitKey;
  started_at: string;
  finished_at: string | null;
  sessions_scanned: number | null;
  errors_total: number | null;
  custo_brl: number | null;
};

export type WtsResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export type RealtimeStatus = 'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR';
