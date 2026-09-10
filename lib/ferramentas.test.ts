import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FERRAMENTAS, FERRAMENTAS_DO_PORTAL, lerFerramentas, ferramentasEscolhidas,
} from './ferramentas.ts';

/**
 * O que estes testes travam: a escolha do professor vira menu no topo do
 * portal DELE, e o que chega do formulário é texto de fora. Chave
 * inventada não pode virar item de menu, e conteúdo da casa (o mural de
 * vagas) não pode ser vinculado ao portal de ninguém.
 */

test('o catálogo do portal não oferece o que é da casa', () => {
  assert.ok(FERRAMENTAS.some((f) => f.chave === 'vagas'));
  assert.ok(!FERRAMENTAS_DO_PORTAL.some((f) => f.chave === 'vagas'));
});

test('só chave do catálogo entra', () => {
  assert.deepEqual(lerFerramentas(['vademecum', 'nao-existe']), ['vademecum']);
  assert.deepEqual(lerFerramentas(['vagas']), []);
  assert.deepEqual(lerFerramentas([]), []);
});

test('a ordem é a do catálogo, não a da submissão', () => {
  assert.deepEqual(
    lerFerramentas(['caderno-de-erros', 'vademecum']),
    ['vademecum', 'caderno-de-erros'],
  );
});

test('chave repetida entra uma vez só', () => {
  assert.deepEqual(lerFerramentas(['vademecum', 'vademecum']), ['vademecum']);
});

test('portal sem escolha não tem menu', () => {
  assert.deepEqual(ferramentasEscolhidas(undefined), []);
  assert.deepEqual(ferramentasEscolhidas([]), []);
});

test('as escolhidas viram itens de menu com destino e descrição', () => {
  const itens = ferramentasEscolhidas(['calculadora-penal', 'vademecum']);
  assert.deepEqual(itens.map((f) => f.href), ['/vademecum', '/calculadora-penal']);
  assert.ok(itens.every((f) => f.nome && f.descricao && f.icone));
});

test('escolha guardada que saiu do catálogo simplesmente some do menu', () => {
  assert.deepEqual(ferramentasEscolhidas(['ferramenta-aposentada']), []);
});
