/**
 * Normaliza as colunas jsonb da tabela de log.
 *
 * O n8n grava esses campos com `JSON.stringify(...)`, e o PostgREST guarda o
 * resultado como um ESCALAR json — uma string — em vez de objeto ou array.
 * Na prática `current_tag_names` chega como a string `"[]"` e não como `[]`.
 *
 * O sintoma era brutal e silencioso ao mesmo tempo: `"[]".length` é 2, então
 * qualquer guard de `length > 0` passa, e o `.join()` seguinte estoura. Já o
 * `raw_session_meta` não estoura, só faz o contexto do card e o bloco de anúncio
 * desaparecerem sem aviso.
 *
 * O mesmo padrão existe nas tabelas do Life Plans e do Estúdio Mais, então
 * normalizar na leitura vale mais do que confiar no formato de quem escreveu.
 */

function decode(value: unknown, depth = 0): unknown {
  if (typeof value !== 'string') return value;
  // Dupla codificação já apareceu; três níveis é folga de sobra.
  if (depth > 3) return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const first = trimmed[0];
  if (first !== '{' && first !== '[' && first !== '"') return value;
  try {
    return decode(JSON.parse(trimmed), depth + 1);
  } catch {
    return value;
  }
}

/** Devolve sempre um array. String JSON, null e valor solto viram algo iterável. */
export function asArray<T = unknown>(value: unknown): T[] {
  const decoded = decode(value);
  if (Array.isArray(decoded)) return decoded as T[];
  if (decoded == null) return [];
  return [decoded as T];
}

/** Devolve sempre um objeto. Nunca null, para `obj.a?.b` ser seguro. */
export function asObject<T extends object = Record<string, unknown>>(value: unknown): T {
  const decoded = decode(value);
  if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) return decoded as T;
  return {} as T;
}
