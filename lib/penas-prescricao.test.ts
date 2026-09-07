import test from 'node:test';
import assert from 'node:assert/strict';
import { calcular } from './penas/calcular.ts';
import { casoInicial, crimeVazio } from './penas/url.ts';
import { dias, F } from './penas/tempo.ts';
import { prazoDoArt109 } from './penas/prescricao.ts';
import type { Caso } from './penas/tipos.ts';

/**
 * Prescrição, decadência, perempção e a linha do tempo do processo (§5.12).
 * "Hoje" é fixo em 05/09/2026 para que os vencimentos não andem com o
 * calendário da máquina.
 */

const HOJE = '2026-09-05';

function caso(fato: string, tipo: string): Caso {
  const c = casoInicial(fato);
  c.datas.hoje = HOJE;
  c.crimes = [crimeVazio(tipo)];
  return c;
}

test('tabela do art. 109, em meses, com a virada da Lei 12.234/10 no inciso VI', () => {
  assert.equal(prazoDoArt109(dias(12) + 1, '2026-01-01').meses, 240);
  assert.equal(prazoDoArt109(dias(10), '2026-01-01').meses, 192);
  assert.equal(prazoDoArt109(dias(4) + 1, '2026-01-01').meses, 144);
  assert.equal(prazoDoArt109(dias(2) + 1, '2026-01-01').meses, 96);
  assert.equal(prazoDoArt109(dias(2), '2026-01-01').meses, 48);
  assert.equal(prazoDoArt109(dias(1), '2026-01-01').meses, 48);
  assert.equal(prazoDoArt109(dias(0, 6), '2015-01-01').meses, 36);
  assert.equal(prazoDoArt109(dias(0, 6), '2009-01-01').meses, 24);
  assert.equal(prazoDoArt109(dias(0, 6), '2010-05-06').meses, 36);
});

test('art. 115 nas duas pontas: 20 anos no fato reduz; 21 completos no dia do fato não; 70 na sentença reduz, 69 não', () => {
  const jovem = caso('2026-06-10', 'cp-157');
  jovem.agente.nascimento = '2006-01-15';
  const pj = calcular(jovem).prescricao[0].prazos;
  assert.equal(pj[0].prazoMeses, 96);   // 16 anos / 2
  assert.match(pj[0].composicao.join(' '), /menor de 21/);

  const exato = caso('2026-06-10', 'cp-157');
  exato.agente.nascimento = '2005-06-10';
  assert.equal(calcular(exato).prescricao[0].prazos[0].prazoMeses, 192);

  const idoso = caso('2026-06-10', 'cp-157');
  idoso.agente.nascimento = '1956-08-20';
  idoso.datas.sentenca = '2026-08-20';
  assert.equal(calcular(idoso).prescricao[0].prazos[0].prazoMeses, 96);
  idoso.datas.sentenca = '2026-08-19';
  assert.equal(calcular(idoso).prescricao[0].prazos[0].prazoMeses, 192);
});

test('art. 115 não vale na violência sexual contra a mulher (Lei 15.160/25) — e a tela diz por quê', () => {
  const c = caso('2026-06-10', 'cp-213');
  c.agente.nascimento = '2006-01-15';
  c.vitima.mulher = true;
  const r = calcular(c);
  assert.equal(r.prescricao[0].prazos[0].prazoMeses, 192);   // estupro: máx 10 anos → 16 anos, sem metade
  assert.ok(r.prescricao[0].avisos.some((a) => /violência sexual contra a mulher/.test(a)));
  // e a atenuante da menoridade também some
  assert.ok(r.crimes[0].avisos.some((a) => /art\. 65, I, não se aplica/.test(a)));
  // fato anterior à lei: reduz
  const antes = caso('2025-01-10', 'cp-213');
  antes.agente.nascimento = '2005-06-15';
  antes.vitima.mulher = true;
  assert.equal(calcular(antes).prescricao[0].prazos[0].prazoMeses, 96);
});

test('o acréscimo de 1/3 da reincidência só vale para a executória (Súmula 220)', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.agente = { reincidente: true, transitoAnterior: '2015-01-01' };
  const r = calcular(c);
  assert.equal(r.crimes[0].penaDefinitivaDias, dias(7));   // 6 + 1/6
  const porModalidade = Object.fromEntries(r.prescricao[0].prazos.map((p) => [p.modalidade, p]));
  assert.equal(porModalidade.RETROATIVA.prazoMeses, 144);
  assert.equal(porModalidade.INTERCORRENTE.prazoMeses, 144);
  assert.equal(porModalidade.EXECUTORIA.prazoMeses, 192);
  assert.match(porModalidade.RETROATIVA.composicao.join(' '), /Súmula 220/);
  assert.match(porModalidade.EXECUTORIA.composicao.join(' '), /1\/3/);
  // metade e um terço juntos: 144 → 192 → 96
  c.agente.nascimento = '2006-01-15';
  const r2 = calcular(c);
  assert.equal(r2.prescricao[0].prazos.find((p) => p.modalidade === 'EXECUTORIA')?.prazoMeses, 96);
});

test('multa (art. 114): cumulativa prescreve com a privativa; alternativa, se única aplicada, em 2 anos', () => {
  const furto = calcular(caso('2026-06-10', 'cp-155')).prescricao[0].prazos;
  const multaFurto = furto.find((p) => p.modalidade === 'MULTA')!;
  assert.equal(multaFurto.prazoMeses, furto.find((p) => p.modalidade === 'EXECUTORIA')!.prazoMeses);
  assert.match(multaFurto.composicao[0], /art\. 114, II/);
  const injuria = calcular(caso('2026-06-10', 'cp-140')).prescricao[0].prazos.find((p) => p.modalidade === 'MULTA')!;
  assert.equal(injuria.prazoMeses, 24);
  assert.match(injuria.composicao[0], /art\. 114, I/);
  // homicídio não tem multa: sem linha de multa
  assert.ok(!calcular(caso('2026-06-10', 'cp-121')).prescricao[0].prazos.some((p) => p.modalidade === 'MULTA'));
});

test('imprescritível (CF, art. 5º, XLII): a linha do tempo existe, mas nenhum trecho vence', () => {
  const c = caso('2024-03-03', 'racismo-2A');
  c.datas.recebimentoDenuncia = '2024-09-01';
  const r = calcular(c);
  assert.equal(r.prescricao[0].imprescritivel, true);
  assert.ok(r.prescricao[0].trechos.length >= 2);
  assert.ok(r.prescricao[0].trechos.every((t) => t.situacao === 'IMPRESCRITIVEL' && t.vencimento === null));
  assert.ok(r.prescricao[0].avisos.some((a) => /imprescritível/i.test(a)));
});

test('linha do tempo: cada fase com a modalidade que corre nela, o vencimento e a situação; executória prescrita', () => {
  const c = caso('2010-01-10', 'cp-157');   // roubo de 4 a 10 anos na época
  Object.assign(c.datas, { recebimentoDenuncia: '2012-03-01', sentenca: '2015-05-05', transitoAcusacao: '2015-06-01', transitoAmbos: '2016-02-02' });
  const r = calcular(c);
  assert.equal(r.crimes[0].penaDefinitivaDias, dias(4));
  const p = r.prescricao[0];
  assert.deepEqual(p.trechos.map((t) => t.fase), ['INQUERITO', 'INSTRUCAO', 'RECURSO', 'EXECUCAO']);
  // fato anterior à Lei 12.234/10: a retroativa alcança o trecho entre fato e denúncia
  assert.equal(p.trechos[0].modalidade, 'RETROATIVA');
  assert.equal(p.trechos[0].prazoMeses, 96);
  assert.equal(p.trechos[0].situacao, 'INTERROMPIDO');
  assert.equal(p.trechos[1].modalidade, 'RETROATIVA');
  assert.equal(p.trechos[2].modalidade, 'INTERCORRENTE');
  assert.equal(p.trechos[2].situacao, 'INTERROMPIDO');
  assert.equal(p.trechos[3].modalidade, 'EXECUTORIA');
  assert.equal(p.trechos[3].inicio, '2016-02-02');
  assert.equal(p.trechos[3].vencimento, '2024-02-01');
  assert.equal(p.trechos[3].situacao, 'PRESCRITO');
  assert.equal(p.faseAtual, 'EXECUCAO');

  // critério literal do art. 112, I: a executória começa no trânsito para a acusação
  c.criterios.termoInicialExecutoria = 'ART_112_LITERAL';
  const lit = calcular(c).prescricao[0].trechos[3];
  assert.equal(lit.inicio, '2015-06-01');
  assert.equal(lit.vencimento, '2023-05-31');

  // fato posterior à Lei 12.234/10: entre fato e denúncia só a abstrata
  const novo = caso('2012-01-10', 'cp-157');
  Object.assign(novo.datas, { recebimentoDenuncia: '2014-03-01', sentenca: '2017-05-05', transitoAcusacao: '2017-06-01' });
  const pn = calcular(novo).prescricao[0];
  assert.equal(pn.trechos[0].modalidade, 'PUNITIVA_ABSTRATA');
  assert.equal(pn.trechos[0].prazoMeses, 192);
  assert.equal(pn.trechos[2].modalidade, 'INTERCORRENTE');
  assert.equal(pn.trechos[2].situacao, 'PRESCRITO');   // 2017 → 2026 > 8 anos
  assert.equal(pn.trechos[3].situacao, 'FALTA_DADO');  // sem trânsito para ambos
});

test('sem denúncia, a fase é o inquérito e o prazo da abstrata corre até hoje', () => {
  const c = caso('2020-06-10', 'cp-155');   // furto 1 a 4 → 8 anos
  const p = calcular(c).prescricao[0];
  assert.equal(p.trechos.length, 1);
  assert.equal(p.trechos[0].situacao, 'CORRENDO');
  assert.equal(p.trechos[0].vencimento, '2028-06-09');
  assert.equal(p.trechos[0].diasRestantes, 643);   // 05/09/2026 → 09/06/2028, com o 29/02/2028 no meio
  assert.equal(p.faseAtual, 'INQUERITO');
  // com o júri: pronúncia e confirmação interrompem
  const juri = caso('2018-06-10', 'cp-121');
  Object.assign(juri.datas, { recebimentoDenuncia: '2019-01-10', pronuncia: '2020-02-02', confirmacaoPronuncia: '2021-03-03' });
  const pj = calcular(juri).prescricao[0];
  assert.deepEqual(pj.trechos.map((t) => t.fase), ['INQUERITO', 'JURI', 'JURI', 'JURI']);
  assert.equal(pj.trechos[3].inicio, '2021-03-03');
  assert.equal(pj.trechos[3].situacao, 'CORRENDO');
});

test('art. 111, V: crime sexual contra menor de 18 só começa a prescrever quando a vítima faz 18 — salvo se a ação já foi proposta', () => {
  const c = caso('2020-03-01', 'cp-217-A');
  c.vitima.nascimento = '2010-06-15';
  const p = calcular(c).prescricao[0];
  assert.equal(p.trechos[0].inicio, '2028-06-15');
  assert.equal(p.trechos[0].situacao, 'CORRENDO');
  assert.match(p.trechos[0].explicacao, /completa 18/);
  c.datas.recebimentoDenuncia = '2021-01-01';
  assert.equal(calcular(c).prescricao[0].trechos[0].inicio, '2020-03-01');
});

test('decadência: 6 meses em prazo penal na ação privada; não se aplica à ação pública incondicionada; 12 meses na violência doméstica', () => {
  const inj = caso('2026-03-15', 'cp-140');
  const d = calcular(inj).decadencia;
  assert.equal(d.aplicavel, true);
  assert.equal(d.ultimoDia, '2026-09-14');
  assert.equal(d.consumadaEm, '2026-09-15');
  assert.equal(d.situacao, 'NO_PRAZO');
  inj.datas.hoje = '2026-09-15';
  assert.equal(calcular(inj).decadencia.situacao, 'DECAIU');
  inj.datas.conhecimentoAutoria = '2026-05-01';
  inj.datas.recebimentoDenuncia = '2026-09-10';
  const ex = calcular(inj).decadencia;
  assert.equal(ex.ultimoDia, '2026-10-31');
  assert.equal(ex.situacao, 'EXERCIDA');

  const roubo = calcular(caso('2026-03-15', 'cp-157')).decadencia;
  assert.equal(roubo.aplicavel, false);
  assert.match(roubo.motivo, /pública incondicionada/);

  const vd = caso('2026-07-01', 'cp-147');
  vd.vitima = { mulher: true, violenciaDomestica: true };
  assert.equal(calcular(vd).decadencia.prazoMeses, 12);
  vd.datas.fato = '2026-06-01';
  assert.equal(calcular(vd).decadencia.prazoMeses, 6);
  // a lesão doméstica é incondicionada (Súmula 542): sem decadência
  const les = calcular(caso('2026-07-01', 'cp-129-9')).decadencia;
  assert.equal(les.aplicavel, false);
  assert.match(les.motivo, /Súmula 542/);
});

test('perempção: só na ação privada; 30 dias processuais do último ato, 60 da morte do querelante', () => {
  const inj = caso('2025-01-10', 'cp-140');
  inj.datas.ultimoAtoQuerelante = '2025-03-03';
  const p = calcular(inj).perempcao;
  assert.equal(p.aplicavel, true);
  assert.equal(p.hipoteses[0].ultimoDia, '2025-04-02');
  assert.equal(p.hipoteses[0].situacao, 'PEREMPTA');
  assert.equal(p.hipoteses[1].situacao, 'FALTA_DADO');
  inj.datas.morteQuerelante = '2026-08-01';
  const m = calcular(inj).perempcao.hipoteses[1];
  assert.equal(m.ultimoDia, '2026-09-30');
  assert.equal(m.situacao, 'NO_PRAZO');

  const roubo = calcular(caso('2026-03-15', 'cp-157')).perempcao;
  assert.equal(roubo.aplicavel, false);
  assert.match(roubo.motivo, /art\. 29/);
  const ameaca = calcular(caso('2026-03-15', 'cp-147')).perempcao;
  assert.equal(ameaca.aplicavel, false);
  assert.match(ameaca.motivo, /condicionada/);
});

test('a ficha mostra as idades e o que cada uma disparou', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.agente.nascimento = '2006-01-15';
  c.vitima.nascimento = '1960-03-03';
  c.crimes[0].causas = [{ id: 'cp-157-2', fracao: F.UM_TERCO }];
  const f = calcular(c).ficha;
  const idadeAgente = f.find((x) => x.rotulo === 'Idade do agente na data do fato')!;
  assert.equal(idadeAgente.valor, '20 anos');
  assert.match(idadeAgente.efeito!, /art\. 65, I/);
  assert.match(idadeAgente.efeito!, /art\. 115/);
  const idadeVitima = f.find((x) => x.rotulo === 'Idade da vítima na data do fato')!;
  assert.equal(idadeVitima.valor, '66 anos');
  assert.match(idadeVitima.efeito!, /61, II, h/);
  assert.ok(f.some((x) => x.rotulo === 'Lei aplicada' && /30\/04\/2026/.test(x.valor)));
  assert.ok(f.some((x) => x.rotulo === 'Próximo marco etário'));
});
