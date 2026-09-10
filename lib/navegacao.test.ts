import test from 'node:test';
import assert from 'node:assert/strict';
import { itemAtivo, paginaInicial, enderecosDe } from './navegacao.ts';

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
  // A equipe inteira trabalha em /admin; o menu de lá é que se ajusta.
  assert.equal(paginaInicial('financeiro', 0), '/admin');
  assert.equal(paginaInicial('suporte', 0), '/admin');
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

/**
 * O submenu do colaborador ("Minha Jornada" ▸ Minhas trilhas · Todas as
 * trilhas). O defeito que estes testes travam: sem achatar os filhos, a
 * lista entregue a `itemAtivo` não teria endereço nenhum do submenu, e o
 * realce nunca acenderia dentro dele.
 */
const MENU = [
  {
    itens: [
      { icone: 'dashboard', texto: 'Minha Jornada', filhos: [
        { href: '/painel', icone: 'route', texto: 'Minhas trilhas' },
        { href: '/painel/trilhas', icone: 'grid_view', texto: 'Todas as trilhas' },
      ] },
      { href: '/painel/biblioteca', icone: 'menu_book', texto: 'Biblioteca' },
      { href: '/painel/conta', icone: 'person', texto: 'Minha conta' },
    ],
  },
];

test('enderecosDe achata os filhos do submenu, na ordem do menu', () => {
  assert.deepEqual(enderecosDe(MENU), [
    '/painel', '/painel/trilhas', '/painel/biblioteca', '/painel/conta',
  ]);
});

test('o item pai não entra: ele não tem endereço', () => {
  assert.equal(enderecosDe(MENU).length, 4);
});

test('menu sem submenu nenhum continua devolvendo a lista simples', () => {
  assert.deepEqual(
    enderecosDe([{ itens: [{ href: '/a' }, { href: '/b' }] }, { itens: [{ href: '/c' }] }]),
    ['/a', '/b', '/c'],
  );
});

test('cada filho do submenu acende a si mesmo, e o pai não rouba o realce', () => {
  const enderecos = enderecosDe(MENU);
  assert.equal(itemAtivo('/painel', enderecos), '/painel');
  assert.equal(itemAtivo('/painel/trilhas', enderecos), '/painel/trilhas');
  // A raiz do painel é prefixo de todas as outras: sem o "prefixo mais
  // longo" de `itemAtivo`, "Minhas trilhas" ficaria aceso na Biblioteca.
  assert.equal(itemAtivo('/painel/biblioteca', enderecos), '/painel/biblioteca');
  assert.equal(itemAtivo('/painel/conta', enderecos), '/painel/conta');
});

test('sub-rota da Biblioteca acende a Biblioteca, não a raiz do painel', () => {
  assert.equal(itemAtivo('/painel/biblioteca?assunto=LGPD', enderecosDe(MENU)), '/painel/biblioteca');
});
