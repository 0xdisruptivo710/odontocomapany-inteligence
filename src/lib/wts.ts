import { WTS_BASE } from './constants';
import type { Unit } from './units';
import type { WtsResult } from './types';

/**
 * A WTS devolve e aceita telefone no formato pipe: "+55|15991511317".
 * Aceita entrada em qualquer formato (com ou sem 55, com ou sem +, já com pipe).
 */
export function toPipePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return input;
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  return `+55|${local}`;
}

async function wtsFetch<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  contentType: 'application/json' | 'application/*+json' = 'application/json',
): Promise<WtsResult<T>> {
  // Proxy: /api/wts?p=<pathname>&<query original>
  const [wtsPathname, wtsQuery] = path.split('?', 2);
  const params = new URLSearchParams();
  params.set('p', wtsPathname ?? '');
  if (wtsQuery) {
    // append (não set) porque a WTS usa parâmetro repetido em `Statuses`.
    const wtsParams = new URLSearchParams(wtsQuery);
    wtsParams.forEach((v, k) => params.append(k, v));
  }
  const proxyUrl = `${WTS_BASE}?${params.toString()}`;

  try {
    const res = await fetch(proxyUrl, {
      method,
      headers: {
        accept: 'application/json',
        ...(body ? { 'content-type': contentType } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const errMsg =
        (parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : null) ?? (typeof parsed === 'string' ? parsed : `HTTP ${res.status}`);
      return { ok: false, status: res.status, error: errMsg };
    }

    return { ok: true, data: (parsed as T) ?? (null as unknown as T) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network_error';
    return { ok: false, status: 0, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contato e etiquetas
// ─────────────────────────────────────────────────────────────────────────────

export type WtsContact = {
  id: string;
  name?: string;
  phoneNumber?: string;
  tagIds?: string[];
  tagNames?: string[];
};

export type WtsTag = { id: string; name: string; bgColor?: string; textColor?: string };

/** GET /core/v1/tag devolve ARRAY NU, não envelopado em `items`. */
export async function wtsListTags(): Promise<WtsResult<WtsTag[]>> {
  const res = await wtsFetch<WtsTag[] | { items: WtsTag[] }>('GET', '/core/v1/tag?PageSize=200');
  if (!res.ok) return res;
  const raw = res.data;
  return { ok: true, data: Array.isArray(raw) ? raw : (raw?.items ?? []) };
}

export async function wtsGetContactByPhone(phone: string): Promise<WtsResult<WtsContact>> {
  return wtsFetch('GET', `/core/v1/contact/phonenumber/${encodeURIComponent(toPipePhone(phone))}`);
}

export async function wtsGetContactById(contactId: string): Promise<WtsResult<WtsContact>> {
  return wtsFetch('GET', `/core/v1/contact/${encodeURIComponent(contactId)}`);
}

/** Aplica etiqueta por UUID. InsertIfNotExists é o default do servidor: é união, não substitui. */
export async function wtsApplyTagById(phone: string, tagId: string): Promise<WtsResult> {
  return wtsFetch(
    'POST',
    `/core/v1/contact/phonenumber/${encodeURIComponent(toPipePhone(phone))}/tags`,
    { tagIds: [tagId] },
    'application/*+json',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────────────────────

export type WtsCard = {
  id: string;
  contactId?: string;
  stepId?: string;
  panelId?: string;
  status?: string;
  title?: string;
};

/**
 * Lista os cards do contato no painel.
 *
 * `Statuses` vai REPETIDO de propósito: sem isso a v2 esconde card ganho, e a
 * gente acabaria criando um card duplicado para quem já tem um fechado.
 */
export async function wtsGetCards(panelId: string, contactId: string): Promise<WtsResult<WtsCard[]>> {
  const path =
    `/crm/v2/panel/card?PanelId=${encodeURIComponent(panelId)}` +
    `&ContactId=${encodeURIComponent(contactId)}` +
    `&PageSize=5&Statuses=OPEN&Statuses=WON&Statuses=LOST`;
  const res = await wtsFetch<{ items?: WtsCard[] } | WtsCard[]>('GET', path);
  if (!res.ok) return res;
  const raw = res.data;
  return { ok: true, data: Array.isArray(raw) ? raw : (raw?.items ?? []) };
}

/**
 * Move o card de etapa.
 * O corpo precisa do `fields` — mandar só `{ stepId }` devolve 500.
 */
export async function wtsMoveCard(cardId: string, stepId: string): Promise<WtsResult> {
  return wtsFetch(
    'PUT',
    `/crm/v2/panel/card/${encodeURIComponent(cardId)}`,
    { fields: ['StepId'], stepId },
    'application/*+json',
  );
}

/** Cria card. `title` é obrigatório e o contato vai em array. */
export async function wtsCreateCard(args: {
  stepId: string;
  title: string;
  contactId: string;
  sessionId?: string | null;
  responsibleUserId?: string | null;
}): Promise<WtsResult<{ id: string }>> {
  const body: Record<string, unknown> = {
    stepId: args.stepId,
    title: args.title,
    contactIds: [args.contactId],
  };
  if (args.sessionId) body.sessionId = args.sessionId;
  // responsibleUserId é o userId da sessão, NÃO o agentId.
  if (args.responsibleUserId) body.responsibleUserId = args.responsibleUserId;
  return wtsFetch('POST', '/crm/v1/panel/card', body, 'application/json');
}

// ─────────────────────────────────────────────────────────────────────────────
// Mensagem
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envia texto pelo WhatsApp.
 *
 * `from` sai FORMATADO — "(15) 99151-1317", não "5515991511317" — e é o número
 * da unidade dona da conversa. Mandar do número errado é visível pro paciente.
 */
export async function wtsSendMessage(unit: Unit, phone: string, text: string): Promise<WtsResult> {
  return wtsFetch(
    'POST',
    '/chat/v1/message/send',
    { body: { text }, from: unit.whatsappFrom, to: toPipePhone(phone) },
    'application/*+json',
  );
}
