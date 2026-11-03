import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolverPagina, lerPaginaDoFormulario, partesDoTitulo, PADRAO, SECOES,
} from './pagina-empresa.ts';

test('sem nada preenchido, a página é a de fábrica inteira', () => {
  const r = resolverPagina({}, null);
  assert.equal(r.titulo, PADRAO.titulo);
  assert.deepEqual(r.provas, PADRAO.provas);
  assert.equal(r.pilares.length, 4);
  for (const s of SECOES) assert.equal(r.secoes[s], true);
  assert.equal(r.mostrarNumeros, true);
  assert.equal(r.assinatura, true);
  assert.equal(r.fotoAbertura, null);
});

test('a empresa vence o administrador, que vence o código — campo a campo', () => {
  const r = resolverPagina(
    { pagina: { titulo: 'Da empresa', provas: ['', 'segunda da empresa', ''] } },
    { titulo: 'Do admin', subtitulo: 'Subtítulo do admin', provas: ['primeira do admin', '', ''] },
  );
  assert.equal(r.titulo, 'Da empresa');
  assert.equal(r.subtitulo, 'Subtítulo do admin');
  assert.deepEqual(r.provas, ['primeira do admin', 'segunda da empresa', PADRAO.provas[2]]);
});

test('pilar da empresa vale inteiro; ícone desconhecido cai para o do padrão', () => {
  const r = resolverPagina({ pagina: { pilares: [{ icone: 'coração', titulo: 'T', texto: 'X' }] } }, null);
  assert.deepEqual(r.pilares[0], { icone: PADRAO.pilares[0].icone, titulo: 'T', texto: 'X' });
  assert.deepEqual(r.pilares[1], PADRAO.pilares[1]);
});

test('seção desligada pela empresa fica desligada; pelo admin, idem, salvo se a empresa religar', () => {
  const r = resolverPagina({ pagina: { secoes: { gestao: false, contato: true } } }, { secoes: { contato: false, biblioteca: false } });
  assert.equal(r.secoes.gestao, false);
  assert.equal(r.secoes.contato, true);
  assert.equal(r.secoes.biblioteca, false);
  assert.equal(r.secoes.experiencia, true);
});

test('links: só http(s) ou caminho local entram; javascript: não', () => {
  const r = resolverPagina({ pagina: { links: { termos: 'javascript:alert(1)', privacidade: 'https://x.com/p' } } }, null);
  assert.equal(r.links.termos, null);
  assert.equal(r.links.privacidade, 'https://x.com/p');
});

test('o título marca o destaque com asteriscos', () => {
  assert.deepEqual(partesDoTitulo('Um *dois* três'), [
    { texto: 'Um ', destaque: false }, { texto: 'dois', destaque: true }, { texto: ' três', destaque: false },
  ]);
  assert.deepEqual(partesDoTitulo('sem destaque'), [{ texto: 'sem destaque', destaque: false }]);
});

const form = (v: Record<string, string>) => (n: string) => v[n] ?? '';

test('o formulário guarda só o que foi preenchido', () => {
  const p = lerPaginaDoFormulario(form({ titulo: '  Meu título ', subtitulo: '' }));
  assert.deepEqual(p, { titulo: 'Meu título' });
});

test('pilar meio preenchido é recusado com mensagem', () => {
  assert.throws(() => lerPaginaDoFormulario(form({ pilarTitulo1: 'Só título' })), /pilar 2/);
});

test('chaves: checkbox ausente da lista conhecida é seção desligada', () => {
  const p = lerPaginaDoFormulario(form({
    secoesConhecidas: 'compromisso,gestao,contato', secao_compromisso: 'on', secao_contato: 'on',
    mostrarNumeros: 'on',
  }), { comChaves: true });
  assert.deepEqual(p.secoes, { gestao: false });
  assert.equal(p.mostrarNumeros, undefined);
  assert.equal(p.assinatura, false);
});

test('foto só pelo caminho do upload; link só com https', () => {
  assert.throws(() => lerPaginaDoFormulario(form({ fotoAbertura: 'http://x/y.jpg' }), { comFotos: true }), /enviada pelo botão/);
  assert.throws(() => lerPaginaDoFormulario(form({ linkTermos: 'ftp://x' }), { comFotos: true }), /https/);
  const p = lerPaginaDoFormulario(form({ fotoAbertura: '/api/imagem/abc.jpg', linkPrivacidade: 'https://e.com/p' }), { comFotos: true });
  assert.deepEqual(p, { fotoAbertura: '/api/imagem/abc.jpg', links: { privacidade: 'https://e.com/p' } });
});
