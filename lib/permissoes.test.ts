import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pode, daEquipe, permissoesDe, PAPEIS_DA_EQUIPE, TODAS_AS_PERMISSOES,
  type Permissao,
} from './permissoes.ts';

/**
 * A tabela inteira, papel × permissão, sem exceção implícita. Se uma
 * permissão nova entrar sem linha aqui, o primeiro teste acusa.
 */
const ESPERADO: Record<string, Record<Permissao, boolean>> = {
  admin: {
    'retaguarda.entrar': true, 'conteudo.agir': true, 'cadastros.ver': true,
    'cadastros.agir': true, 'licencas.suporte': true, 'licencas.conceder': true,
    'financeiro.ver': true, 'financeiro.agir': true, 'equipe.agir': true,
    'auditoria.ver': true,
  },
  financeiro: {
    'retaguarda.entrar': true, 'conteudo.agir': false, 'cadastros.ver': true,
    'cadastros.agir': false, 'licencas.suporte': false, 'licencas.conceder': false,
    'financeiro.ver': true, 'financeiro.agir': false, 'equipe.agir': false,
    'auditoria.ver': true,
  },
  suporte: {
    'retaguarda.entrar': true, 'conteudo.agir': false, 'cadastros.ver': true,
    'cadastros.agir': true, 'licencas.suporte': true, 'licencas.conceder': false,
    'financeiro.ver': false, 'financeiro.agir': false, 'equipe.agir': false,
    'auditoria.ver': true,
  },
};

test('a matriz esperada cobre toda permissão de todo papel da equipe', () => {
  for (const papel of PAPEIS_DA_EQUIPE) {
    assert.ok(ESPERADO[papel], `falta a linha de ${papel}`);
    for (const p of TODAS_AS_PERMISSOES) {
      assert.equal(typeof ESPERADO[papel][p], 'boolean', `${papel} × ${p} não foi decidido`);
    }
  }
});

test('pode() responde exatamente a matriz', () => {
  for (const papel of PAPEIS_DA_EQUIPE) {
    for (const p of TODAS_AS_PERMISSOES) {
      assert.equal(pode(papel, p), ESPERADO[papel][p], `${papel} × ${p}`);
    }
  }
});

test('financeiro não age em nada que mexa em dinheiro ou cadastro', () => {
  for (const p of ['financeiro.agir', 'cadastros.agir', 'licencas.conceder', 'licencas.suporte', 'conteudo.agir', 'equipe.agir'] as Permissao[]) {
    assert.equal(pode('financeiro', p), false, p);
  }
  assert.equal(pode('financeiro', 'financeiro.ver'), true);
});

test('suporte não toca em dinheiro nem cria equipe', () => {
  for (const p of ['financeiro.ver', 'financeiro.agir', 'licencas.conceder', 'equipe.agir', 'conteudo.agir'] as Permissao[]) {
    assert.equal(pode('suporte', p), false, p);
  }
  assert.equal(pode('suporte', 'cadastros.agir'), true);
  assert.equal(pode('suporte', 'licencas.suporte'), true);
});

test('quem não é da equipe não pode nada — inclusive papel inventado', () => {
  for (const papel of ['aluno', 'professor', 'gestor', 'revisor', '', 'ADMIN', 'root']) {
    assert.equal(daEquipe(papel), false, papel);
    for (const p of TODAS_AS_PERMISSOES) assert.equal(pode(papel, p), false, `${papel} × ${p}`);
    assert.deepEqual(permissoesDe(papel), []);
  }
});

test('permissoesDe devolve a lista na ordem canônica', () => {
  assert.deepEqual(permissoesDe('admin'), TODAS_AS_PERMISSOES);
  assert.deepEqual(permissoesDe('financeiro'),
    ['retaguarda.entrar', 'cadastros.ver', 'financeiro.ver', 'auditoria.ver']);
});
