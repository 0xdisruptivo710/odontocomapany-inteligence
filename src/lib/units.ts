/**
 * As duas unidades da OdontoCompany.
 *
 * Diferente do Life Plans (single-tenant, um painel só), aqui cada unidade tem
 * painel, canal, número de WhatsApp, departamento e equipe próprios. Tudo que
 * depende de unidade sai daqui — nunca de constante solta.
 */

export type UnitKey = 'vh' | 'sr';
export type UnitFilter = UnitKey | 'all';

export type Unit = {
  key: UnitKey;
  name: string;
  /** Rótulo curto para chips e colunas de tabela. */
  short: string;
  panelId: string;
  /** Prefixo do composite_key no wts_panel_mapping: "Clientes (HL) > Em conversa". */
  panelLabel: string;
  channelId: string;
  /** Número em dígitos, como aparece na coluna Canal do Supabase. */
  channelDigits: string;
  /**
   * `from` do POST /chat/v1/message/send. A WTS espera FORMATADO, não em dígitos
   * — mandar "5515991511317" aqui não entrega.
   */
  whatsappFrom: string;
  departmentId: string;
  address: string;
  /**
   * Santa Rosália fecha card como perdido sozinho depois de N dias parado.
   * Card em estado final não aceita troca de etapa (PUT devolve 500).
   */
  autoLossDays: number | null;
};

export const UNITS: Record<UnitKey, Unit> = {
  vh: {
    key: 'vh',
    name: 'Vila Helena',
    short: 'VH',
    panelId: 'e48ecee5-9696-414e-b8dd-595335540228',
    panelLabel: 'Clientes (HL)',
    channelId: 'b7b85670-cf90-4c71-8f93-52387c77ac25',
    channelDigits: '5515991511317',
    whatsappFrom: '(15) 99151-1317',
    departmentId: '01a15cc1-bb8e-489e-b04f-373a09f69154',
    address: 'R. Arthur Gonçalves, 685 - Vila Helena, Sorocaba - SP',
    autoLossDays: null,
  },
  sr: {
    key: 'sr',
    name: 'Santa Rosália',
    short: 'SR',
    panelId: '3bc2675c-70c8-4546-b2b5-73d3d7ffe7b5',
    panelLabel: 'Clientes (ST)',
    channelId: 'e77b3129-c49b-453b-ae90-5f6ab89f02f2',
    channelDigits: '5515997116967',
    whatsappFrom: '(15) 99711-6967',
    departmentId: '4a92685e-c672-433f-aff3-b620cd3b5375',
    address: 'Av. Pereira da Silva, 116 - Jardim Santa Rosália, Sorocaba - SP',
    autoLossDays: 30,
  },
};

export const UNIT_KEYS: UnitKey[] = ['vh', 'sr'];

export function isUnitKey(v: unknown): v is UnitKey {
  return v === 'vh' || v === 'sr';
}

export function getUnit(key: string | null | undefined): Unit | null {
  return isUnitKey(key) ? UNITS[key] : null;
}

/** Resolve a unidade pelo channelId da sessão — o canal é a fonte de verdade. */
export function unitByChannel(channelId: string | null | undefined): Unit | null {
  if (!channelId) return null;
  return UNIT_KEYS.map((k) => UNITS[k]).find((u) => u.channelId === channelId) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Atendentes
// ─────────────────────────────────────────────────────────────────────────────

export type Attendant = {
  userId: string;
  /** Nome completo no WTS. */
  name: string;
  /**
   * Primeiro nome usado no prefixo `*Nome:*` das mensagens. É o que o paciente vê.
   * Matheus assina com título, então aqui é "Dr. Matheus" e não "Matheus".
   */
  signature: string;
  unit: UnitKey;
};

/**
 * ATENÇÃO: existem DOIS Lucas de Sousa, um por unidade, com userIds diferentes.
 * O nome sozinho é ambíguo — por isso `displayName` sempre carrega a unidade.
 */
export const ATTENDANTS: Attendant[] = [
  { userId: '2683166d-90d9-43ff-9150-24a480d226f4', name: 'Lucas De Sousa', signature: 'Lucas', unit: 'vh' },
  { userId: 'ca3d24a4-a22b-4401-b336-3f33fb781867', name: 'Tayná Miranda Silva', signature: 'Tayná', unit: 'vh' },
  { userId: 'c074380e-16f8-4bbb-b745-ebe1c2b2c213', name: 'Lucas de Sousa', signature: 'Lucas', unit: 'sr' },
  { userId: '34cc5d65-1f87-4346-91b9-1fb88f654ba8', name: 'Matheus Soares', signature: 'Dr. Matheus', unit: 'sr' },
];

/** Owner da conta. Aparece como responsável mas não atende no dia a dia. */
export const OWNER_USER_ID = 'a2ab8f36-0c1f-4332-a20b-09e0d42d38c1';

export function attendantById(userId: string | null | undefined): Attendant | null {
  if (!userId) return null;
  return ATTENDANTS.find((a) => a.userId === userId) ?? null;
}

/** "Lucas (VH)" — sempre com a unidade, porque só o nome não distingue. */
export function displayName(a: Attendant): string {
  return `${a.signature} (${UNITS[a.unit].short})`;
}

/** Operadores que podem aprovar, opcionalmente filtrados pela unidade em foco. */
export function operatorsFor(filter: UnitFilter): Attendant[] {
  return filter === 'all' ? ATTENDANTS : ATTENDANTS.filter((a) => a.unit === filter);
}

// ─────────────────────────────────────────────────────────────────────────────
// Colunas do funil
// ─────────────────────────────────────────────────────────────────────────────

/**
 * As colunas que a IA e o app podem escolher.
 *
 * "Desmarcou" e "Faltou" existem no painel mas ficam FORA de propósito: quem sabe
 * quem faltou é o Painel de Agendamento, que tem o dado real. Deixar a lista aqui
 * significaria pedir ao atendente que replicasse à mão uma informação que outra
 * tela já mantém, e as duas divergiriam na primeira semana.
 */
export const COLUMN_NAMES = [
  'Etapa Inicial',
  'Em conversa',
  'Retornar',
  'Follow-up',
  'Pós-Procedimento',
] as const;

export type ColumnName = (typeof COLUMN_NAMES)[number];

/** Chave composta que o wts_panel_mapping indexa. */
export function compositeKey(unit: Unit, column: string): string {
  return `${unit.panelLabel} > ${column}`;
}

/** Extrai só o nome da etapa de uma chave composta (ou devolve como veio). */
export function columnLeaf(composite: string | null | undefined): string {
  if (!composite) return '';
  const parts = composite.split(' > ');
  return (parts[parts.length - 1] ?? '').trim();
}
