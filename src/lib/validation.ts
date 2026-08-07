import { BANNED_PHRASES, MSG_MAX, MSG_MIN } from './constants';

/**
 * As mesmas regras que o Code node do n8n aplica antes de sugerir. Estão aqui
 * também porque o atendente edita o texto no drawer: se a checagem só existisse
 * no scanner, bastaria uma edição manual para furar tudo.
 */

/** Prefixo `*Nome:*` ou `*Nome *:` — as duas formas ocorrem nesta conta. */
const PREFIX_RE = /^\*\s*[^*\n]{1,40}?\s*(?::\s*\*|\*\s*:)/;

/** "R$ 300", "12x de 250", "300 reais". */
const MONEY_RE = /R\$\s*\d|\d+\s*x\s*(de\s*)?R?\$?\s*\d|\b\d{2,}\s*reais\b/i;

/** "17:00", "17h30", "07/08". */
const DATETIME_RE = /\d{1,2}\s*[:h]\s*\d{2}|\b\d{1,2}\/\d{1,2}\b/;

export type ValidationResult = {
  valid: boolean;
  warnings: string[];
  errors: string[];
  cleaned: string;
};

export function validateMessage(input: string): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let cleaned = input;

  // Travessão é tell de IA. Corrigimos em silêncio e avisamos, não bloqueamos.
  if (cleaned.includes('—')) {
    cleaned = cleaned.replace(/ — /g, ', ').replace(/—/g, ', ');
    warnings.push('Travessão trocado por vírgula');
  }

  const trimmed = cleaned.trim();

  if (trimmed.length < MSG_MIN) {
    errors.push(`Curta demais: ${trimmed.length} de ${MSG_MIN} caracteres mínimos`);
  }
  if (trimmed.length > MSG_MAX) {
    errors.push(`Longa demais: ${trimmed.length} de ${MSG_MAX} caracteres máximos`);
  }

  const lower = trimmed.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      errors.push(`Tom de propaganda: "${phrase}"`);
    }
  }

  // Em odontologia popular o valor é negociado com parcelamento. Mensagem
  // automática citando número cria expectativa que a clínica terá que honrar.
  if (MONEY_RE.test(trimmed)) {
    errors.push('Tem valor em reais. Convide para retomar a conversa sem citar número');
  }

  // Regra que nasceu de um erro real: a IA escreveu "confirmada para hoje às
  // 17:00" com um horário que não existia no histórico.
  if (DATETIME_RE.test(trimmed)) {
    errors.push('Tem data ou horário. Pergunte em vez de afirmar, o dado pode estar errado');
  }

  if (PREFIX_RE.test(trimmed)) {
    errors.push('Não escreva o "*Nome:*" — a assinatura é adicionada no envio');
  }

  return { valid: errors.length === 0, warnings, errors, cleaned };
}

/**
 * Texto final que sai no WhatsApp. Toda saída da OdontoCompany é assinada, e o
 * paciente precisa continuar vendo o nome de quem já estava conversando com ele.
 */
export function signMessage(signature: string | null | undefined, text: string): string {
  const nome = (signature ?? '').trim();
  const corpo = text.trim();
  return nome ? `*${nome}:*\n${corpo}` : corpo;
}
