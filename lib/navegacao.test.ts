import test from 'node:test';
import assert from 'node:assert/strict';
import { itemAtivo, paginaInicial } from './navegacao.ts';

/**
 * O defeito que estes testes travam: com o realce fixado no código, o
 * menu do admin acendia "Dashboard" em todas as telas. Quem clicava em
 * "Preços" via a página trocar e o menu não — e concluía, com razão, que
 * o clique não tinha funcionado.
 */

const ADMIN = ['/admin', '/admin/precos', '/admin/licencas', '/admin/alunos', '/painel'];

test('cada rota acende o próprio item', () => {
  assert.equal(itemAtivo('/admin/precos', ADMIN), '/admin/precos');
  assert.equal(itemAtivo('/admin/licencas', ADMIN), '/admin/licencas');
  assert.equal(itemAtivo('/admin/alunos', ADMIN), '/admin/alunos');
});

test('a raiz do painel só acende nela mesma', () => {
  assert.equal(itemAtivo('/admin', ADMIN), '/admin');
});

test('sub-rota acende o item pai — vence o prefixo mais longo', () => {
  const itens = ['/admin', '/admin/blog'];
  assert.equal(itemAtivo('/admin/blog/novo', itens), '/admin/blog');
  assert.equal(itemAtivo('/admin/blog/12/editar', itens), '/admin/blog');
});

test('prefixo parcial não conta — /admin/precos não acende /admin/preco', () => {
  assert.equal(itemAtivo('/admin/precos', ['/admin/preco']), null);
});

test('barra final é irrelevante', () => {
  assert.equal(itemAtivo('/admin/precos/', ADMIN), '/admin/precos');
  assert.equal(itemAtivo('/admin/precos', ['/admin/precos/']), '/admin/precos/');
});

test('âncora e query no endereço do item não atrapalham', () => {
  assert.equal(itemAtivo('/painel', ['/painel#caderno']), '/painel#caderno');
  assert.equal(itemAtivo('/admin/alunos', ['/admin/alunos?q=ana']), '/admin/alunos?q=ana');
});

test('rota fora do menu não acende nada', () => {
  assert.equal(itemAtivo('/catalogo', ADMIN), null);
  assert.equal(itemAtivo('/blog/algum-post', ADMIN), null);
});

test('item raiz "/" não sequestra o menu inteiro', () => {
  assert.equal(itemAtivo('/admin/precos', ['/', '/admin/precos']), '/admin/precos');
  assert.equal(itemAtivo('/', ['/', '/admin']), '/');
});


/**
 * Depois de entrar, o administrador caía em "Minha jornada" — a área do
 * aluno — e tinha de achar sozinho o atalho da retaguarda. Estes testes
 * travam a regra nova e, sobretudo, a guarda contra redirecionamento
 * aberto: `destino` que aponta para fora é ignorado.
 */
test('cada papel cai no painel dele', () => {
  assert.equal(paginaInicial('admin', 0), '/admin');
  assert.equal(paginaInicial('professor', 0), '/professor');
  assert.equal(paginaInicial('aluno', 0), '/painel');
  assert.equal(paginaInicial('revisor', 0), '/painel');
});

test('dentro do portal de um professor, papel de operação não vale', () => {
  assert.equal(paginaInicial('admin', 7), '/painel');
  assert.equal(paginaInicial('professor', 7), '/painel');
});

test('destino interno vence o padrão do papel', () => {
  assert.equal(paginaInicial('aluno', 0, '/conta'), '/conta');
  assert.equal(paginaInicial('admin', 0, '/admin/precos'), '/admin/precos');
});

test('destino para fora do site é ignorado — nada de redirecionamento aberto', () => {
  assert.equal(paginaInicial('aluno', 0, 'https://phishing.exemplo'), '/painel');
  assert.equal(paginaInicial('aluno', 0, '//phishing.exemplo'), '/painel');
  assert.equal(paginaInicial('admin', 0, ''), '/admin');
  assert.equal(paginaInicial('admin', 0, null), '/admin');
});
