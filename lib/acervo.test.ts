import test from 'node:test';
import assert from 'node:assert/strict';
import {
  partirAssuntos, juntarAssuntos, validarItem, montarFiltro, tamanhoLegivel, dobrar,
  type RascunhoItem,
} from './acervo-item.ts';

/**
 * As partes puras da Biblioteca da empresa. O que elas travam é o que o
 * banco não pega: o CHECK derruba item sem arquivo, mas com uma
 * mensagem que ninguém entende; e nada no banco impede uma etiqueta
 * chamada " LGPD " que filtro nenhum acha.
 */

const PDF: RascunhoItem = {
  titulo: 'Guia de LGPD', assuntos: ['LGPD'], formato: 'PDF', arquivo: 'p1-acervo3-abc.pdf',
};
const LINK: RascunhoItem = {
  titulo: 'Política de uso de IA', assuntos: [], formato: 'LINK',
  url: 'https://intranet.exemplo/politica-ia',
};

/* ---------------- assuntos ---------------- */

test('assuntos vêm de uma linha só, separados por vírgula', () => {
  assert.deepEqual(partirAssuntos('LGPD, Compliance, Liderança'),
    ['LGPD', 'Compliance', 'Liderança']);
});

test('espaço em volta e vírgula sobrando morrem aqui, não no banco', () => {
  // O RH digita assim de verdade; guardado cru, " LGPD" some do filtro.
  assert.deepEqual(partirAssuntos('  LGPD ,, Compliance ,'), ['LGPD', 'Compliance']);
  assert.deepEqual(partirAssuntos('Gestão   de   pessoas'), ['Gestão de pessoas']);
});

test('repetido entra uma vez só, e o acento não cria duplicata', () => {
  assert.deepEqual(partirAssuntos('LGPD, lgpd, LGPD'), ['LGPD']);
  assert.deepEqual(partirAssuntos('Liderança, lideranca'), ['Liderança']);
});

test('a grafia guardada é a PRIMEIRA que a pessoa escreveu — é ela que vira chip', () => {
  assert.deepEqual(partirAssuntos('lgpd, LGPD'), ['lgpd']);
});

test('campo vazio não vira assunto vazio', () => {
  assert.deepEqual(partirAssuntos(''), []);
  assert.deepEqual(partirAssuntos('   '), []);
  assert.deepEqual(partirAssuntos(null), []);
  assert.deepEqual(partirAssuntos(undefined), []);
});

test('juntar e partir dão a volta completa', () => {
  const assuntos = ['LGPD', 'Compliance'];
  assert.deepEqual(partirAssuntos(juntarAssuntos(assuntos)), assuntos);
});

test('dobrar tira acento e caixa', () => {
  assert.equal(dobrar('Liderança'), 'lideranca');
  assert.equal(dobrar('GESTÃO'), 'gestao');
});

/* ---------------- validação ---------------- */

test('item completo passa', () => {
  assert.equal(validarItem(PDF), null);
  assert.equal(validarItem(LINK), null);
});

test('título é obrigatório, e espaço em branco não conta como título', () => {
  assert.match(validarItem({ ...PDF, titulo: '' })!, /título é obrigatório/);
  assert.match(validarItem({ ...PDF, titulo: '   ' })!, /título é obrigatório/);
});

test('PDF sem arquivo não passa — e a mensagem diz o que fazer', () => {
  const erro = validarItem({ ...PDF, arquivo: null });
  assert.match(erro!, /Envie o arquivo PDF/);
});

test('link sem endereço não passa', () => {
  assert.match(validarItem({ ...LINK, url: '' })!, /endereço do link/);
  assert.match(validarItem({ ...LINK, url: '   ' })!, /endereço do link/);
});

test('só http e https viram link — javascript: seria código na tela da equipe', () => {
  assert.match(validarItem({ ...LINK, url: 'javascript:alert(1)' })!, /http:\/\/ ou https:\/\//);
  assert.match(validarItem({ ...LINK, url: 'data:text/html,<script>' })!, /http:\/\/ ou https:\/\//);
  assert.match(validarItem({ ...LINK, url: 'intranet.exemplo/x' })!, /http:\/\/ ou https:\/\//);
  assert.equal(validarItem({ ...LINK, url: 'http://intranet.exemplo/x' }), null);
  assert.equal(validarItem({ ...LINK, url: 'HTTPS://Intranet.Exemplo/x' }), null);
});

test('ano fora do plausível é erro de digitação', () => {
  assert.equal(validarItem({ ...PDF, ano: 2020 }, 2026), null);
  // O ano que vem passa: edição adiantada é comum em livro.
  assert.equal(validarItem({ ...PDF, ano: 2027 }, 2026), null);
  assert.match(validarItem({ ...PDF, ano: 2028 }, 2026)!, /entre 1400 e 2027/);
  assert.match(validarItem({ ...PDF, ano: 202 }, 2026)!, /entre 1400 e 2027/);
  assert.match(validarItem({ ...PDF, ano: 2020.5 }, 2026)!, /número inteiro/);
  assert.equal(validarItem({ ...PDF, ano: null }, 2026), null);
});

test('título quilométrico não passa', () => {
  assert.match(validarItem({ ...PDF, titulo: 'x'.repeat(301) })!, /longo demais/);
});

test('teto de assuntos por item', () => {
  const muitos = Array.from({ length: 21 }, (_, i) => `a${i}`);
  assert.match(validarItem({ ...PDF, assuntos: muitos })!, /No máximo 20 assuntos/);
});

/* ---------------- filtro ---------------- */

test('filtro vazio vira null, não string vazia', () => {
  const f = montarFiltro({ busca: '', assunto: '   ', autor: undefined, formato: null });
  assert.deepEqual(f, { busca: null, assunto: null, autor: null, formato: null });
});

test('filtro corta espaço em volta do que a pessoa digitou', () => {
  assert.equal(montarFiltro({ busca: '  lgpd  ' }).busca, 'lgpd');
});

test('formato desconhecido é descartado — o valor vem da barra de endereço', () => {
  assert.equal(montarFiltro({ formato: 'EPUB' }).formato, null);
  assert.equal(montarFiltro({ formato: "PDF'; DROP TABLE acervo--" }).formato, null);
  assert.equal(montarFiltro({ formato: 'PDF' }).formato, 'PDF');
  assert.equal(montarFiltro({ formato: 'LINK' }).formato, 'LINK');
});

/* ---------------- tamanho ---------------- */

test('o peso do arquivo é dito de um jeito que se lê', () => {
  assert.equal(tamanhoLegivel(2_516_582), '2,4 MB');
  assert.equal(tamanhoLegivel(300_000), '293 KB');
  assert.equal(tamanhoLegivel(0), null);
  assert.equal(tamanhoLegivel(null), null);
  assert.equal(tamanhoLegivel(undefined), null);
});
