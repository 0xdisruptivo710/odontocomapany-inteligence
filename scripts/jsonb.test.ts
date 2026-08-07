/**
 * Reproduz o formato real que o Supabase devolve e prova que a normalização
 * resolve. Roda com: npm run test:jsonb
 *
 * Os valores vieram de linhas reais de wts_auto_followups_logs_odonto,
 * conferidas em 2026-08-07 com jsonb_typeof().
 */
import assert from 'node:assert/strict';
import { asArray, asObject } from '../src/lib/jsonb.ts';

let falhas = 0;
function teste(nome: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok    ${nome}`);
  } catch (err) {
    falhas += 1;
    console.log(`  FALHA ${nome}\n        ${(err as Error).message}`);
  }
}

console.log('\nO que o Supabase devolve hoje (jsonb gravado com JSON.stringify):');

teste('o array vazio chega como a string "[]" — era aqui que o drawer quebrava', () => {
  const doBanco: unknown = '[]';
  // O guard `length > 0` passa porque a string tem 2 caracteres...
  assert.equal((doBanco as string).length > 0, true);
  // ...e então o .join estoura, porque string não tem .join.
  assert.equal(typeof (doBanco as { join?: unknown }).join, 'undefined');
  // Com a normalização, vira um array de verdade e o guard reprova certo.
  assert.deepEqual(asArray(doBanco), []);
  assert.equal(asArray(doBanco).length > 0, false);
});

teste('array com itens chega como string e vira array', () => {
  assert.deepEqual(asArray('["Cliente","Oportunidade"]'), ['Cliente', 'Oportunidade']);
});

teste('raw_session_meta chega como string e vira objeto navegável', () => {
  const meta = asObject<{
    card?: { exists?: boolean; status?: string };
    utm?: { campaign?: string };
  }>('{"card":{"exists":true,"status":"OPEN"},"utm":{"campaign":"CONVERSE CONOSCO"}}');
  assert.equal(meta.card?.exists, true);
  assert.equal(meta.utm?.campaign, 'CONVERSE CONOSCO');
});

console.log('\nOs outros formatos que precisam continuar funcionando:');

teste('array de verdade passa intacto', () => {
  assert.deepEqual(asArray(['a', 'b']), ['a', 'b']);
});

teste('objeto de verdade passa intacto', () => {
  assert.equal(asObject<{ a: number }>({ a: 1 }).a, 1);
});

teste('null vira vazio em vez de estourar', () => {
  assert.deepEqual(asArray(null), []);
  assert.deepEqual(asObject(null), {});
});

teste('dupla codificação é desfeita', () => {
  assert.deepEqual(asArray(JSON.stringify(JSON.stringify(['x']))), ['x']);
});

teste('texto solto não é confundido com JSON', () => {
  assert.deepEqual(asArray('Cliente'), ['Cliente']);
  assert.deepEqual(asObject('não é json'), {});
});

console.log(falhas === 0 ? '\nTodos passaram.\n' : `\n${falhas} falharam.\n`);
process.exit(falhas === 0 ? 0 : 1);
