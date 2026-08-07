export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://ehlpmukjdknnyhkycncb.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

/** Toda chamada WTS passa pelo proxy Vercel: o token fica no servidor. */
export const WTS_BASE = '/api/wts';

export const CLIENT_HANDLE = 'odonto-company';

/**
 * As duas unidades gravam na MESMA tabela, separadas por `unit_key`. É isso que
 * permite comparar Vila Helena com Santa Rosália sem juntar nada depois.
 */
export const TABLE_LOG = 'wts_auto_followups_logs_odonto';
export const TABLE_RUNS = 'wts_auto_followups_runs_odonto';
/** Compartilhada entre clientes, filtrada por client_handle. */
export const TABLE_PANEL_MAPPING = 'wts_panel_mapping';

/** WTS aceita ~1.5 req/s. Sem essa pausa o lote estoura em 429. */
export const WTS_RATE_LIMIT_MS = 700;
export const BULK_CONCURRENCY = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Validação da mensagem
// ─────────────────────────────────────────────────────────────────────────────

export const MSG_MIN = 40;
export const MSG_MAX = 600;

export const BANNED_PHRASES = [
  'aproveite',
  'última chance',
  'ultima chance',
  'desconto especial',
  'oferta imperdível',
  'imperdível',
  'promoção',
  'corra',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Cenários
// ─────────────────────────────────────────────────────────────────────────────

export type ScenarioKey =
  | 'orcamento_sem_resposta'
  | 'pergunta_sem_resposta'
  | 'agendamento_avaliacao_incompleto'
  | 'interesse_silencio'
  | 'pos_avaliacao_sem_fechamento'
  | 'tag_only_no_engagement'
  | 'tag_only_atendimento_ativo'
  | 'tag_only_negocio_fechado'
  | 'tag_only_generic';

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  orcamento_sem_resposta: 'Orçamento sem resposta',
  pergunta_sem_resposta: 'Pergunta sem resposta',
  agendamento_avaliacao_incompleto: 'Avaliação não fechou',
  interesse_silencio: 'Interesse + silêncio',
  // Específico de odontologia popular: compareceu, recebeu o plano e sumiu na
  // hora de fechar o parcelamento. É onde a maior parte da venda para.
  pos_avaliacao_sem_fechamento: 'Avaliou e não fechou',
  tag_only_no_engagement: 'Sem engajamento',
  tag_only_atendimento_ativo: 'Atendimento ativo',
  tag_only_negocio_fechado: 'Negócio fechado',
  tag_only_generic: 'Genérico',
};

export const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  orcamento_sem_resposta: 'bg-warning-soft text-[#92400E]',
  pergunta_sem_resposta: 'bg-[#FFEDD5] text-[#9A3412]',
  agendamento_avaliacao_incompleto: 'bg-info-soft text-info/90',
  interesse_silencio: 'bg-primary-soft text-primary-soft-foreground',
  pos_avaliacao_sem_fechamento: 'bg-[#FCE7F3] text-[#9D174D]',
  tag_only_no_engagement: 'bg-muted text-muted-foreground',
  tag_only_atendimento_ativo: 'bg-success-soft text-success/90',
  tag_only_negocio_fechado: 'bg-success-soft text-success',
  tag_only_generic: 'bg-muted text-muted-foreground',
};

export function scenarioLabel(key: string | null | undefined): string {
  if (!key) return '—';
  return SCENARIO_LABELS[key as ScenarioKey] ?? key;
}

export function scenarioColor(key: string | null | undefined): string {
  if (!key) return 'bg-muted text-muted-foreground';
  return SCENARIO_COLORS[key as ScenarioKey] ?? 'bg-muted text-muted-foreground';
}

// ─────────────────────────────────────────────────────────────────────────────
// Etiquetas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Taxonomia proposta ao cliente. A API do WTS não cria definição de etiqueta —
 * só aplica —, então estas precisam existir na interface antes de aparecerem
 * aqui. O catálogo real vem de GET /core/v1/tag; esta lista só ordena e agrupa
 * o que já existe, e sinaliza o que ainda falta cadastrar.
 */
export const TAG_TAXONOMY: { group: string; names: string[] }[] = [
  {
    group: 'Procedimento',
    names: ['Implante', 'Prótese', 'Ortodontia', 'Estética Dental', 'Canal', 'Limpeza', 'Urgência'],
  },
  {
    group: 'Situação comercial',
    names: ['Orçamento enviado', 'Aguardando parcelamento', 'Lead frio'],
  },
  {
    group: 'Controle',
    names: ['Não perturbe'],
  },
];

/** Lista plana, na ordem em que aparece no seletor do drawer. */
export const TAG_TAXONOMY_FLAT: string[] = TAG_TAXONOMY.flatMap((g) => g.names);

/** Contato com esta etiqueta é ignorado por completo pelo scanner e pelo app. */
export const OPT_OUT_TAGS = ['não perturbe', 'nao perturbe', 'nao-disparar-fu-auto'];
