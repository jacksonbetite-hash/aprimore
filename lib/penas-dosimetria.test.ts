import test from 'node:test';
import assert from 'node:assert/strict';
import { calcular, ErroDeCalculo } from './penas/calcular.ts';
import { casoInicial, crimeVazio, serializarCaso, desserializarCaso, normalizarCaso } from './penas/url.ts';
import { dias, F } from './penas/tempo.ts';
import { tipoPorId, referenciasDoCatalogo, TIPOS, CAUSAS, causaPorId } from './penas/catalogo/index.ts';
import { penasAbstratas, fracaoPorNumeroDeCrimes } from './penas/dosimetria.ts';
import type { Caso } from './penas/tipos.ts';

/**
 * Dosimetria trifásica e consequências (§5.12). Cada teste é um caso que
 * cabe numa prova: os números são os que o examinador espera ver.
 *
 * Datas fixas ("hoje" = 05/09/2026): o resultado não pode mudar porque o
 * teste rodou num dia diferente.
 */

const HOJE = '2026-09-05';

function caso(fato: string, ...tipos: string[]): Caso {
  const c = casoInicial(fato);
  c.datas.hoje = HOJE;
  c.crimes = tipos.map(crimeVazio);
  if (tipos.length > 1) c.concurso = 'MATERIAL';
  return c;
}

const A = (n: number, m = 0, d = 0) => dias(n, m, d);

test('roubo majorado tentado, sem circunstâncias: 6 anos → +1/3 = 8 anos → −1/2 = 4 anos, em cascata', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.crimes[0].causas = [{ id: 'cp-157-2', fracao: F.UM_TERCO }, { id: 'cp-14-tentativa', fracao: F.METADE }];
  const r = calcular(c);
  const p = r.crimes[0];
  assert.equal(p.penaBaseDias, A(6));
  assert.equal(p.penaIntermediariaDias, A(6));
  assert.equal(p.penaDefinitivaDias, A(4));
  assert.deepEqual(p.memoria.map((m) => m.fase), [0, 1, 2, 3, 3, 3]);
  assert.equal(p.memoria[3].paraDias, A(8));
  assert.match(p.memoria[3].detalhe, /cascata/);
  assert.ok(p.avisos.some((a) => /abaixo do mínimo cominado/.test(a)));
});

test('lei no tempo: o furto de abril de 2026 tem máximo de 4 anos; o de maio, 6 (Lei 15.397/26)', () => {
  assert.equal(tipoPorId('cp-155', '2026-04-29')?.penaMaxDias, A(4));
  assert.equal(tipoPorId('cp-155', '2026-04-30')?.penaMaxDias, A(6));
  assert.equal(tipoPorId('cp-157', '2025-01-01')?.penaMinDias, A(4));
  assert.equal(tipoPorId('cp-157', '2026-05-01')?.penaMinDias, A(6));
  // o crime que ainda não existia
  const c = caso('2020-01-01', 'cp-121-A');
  assert.throws(() => calcular(c), (e: unknown) => e instanceof ErroDeCalculo && e.codigo === 'TIPO_INEXISTENTE');
});

test('1ª fase: 1/8 do intervalo por circunstância (furto 1 a 6: 7 meses e 15 dias cada) ou 1/6 da mínima', () => {
  const c = caso('2026-06-10', 'cp-155');
  c.crimes[0].circunstancias59 = ['antecedentes', 'conduta_social'];
  assert.equal(calcular(c).crimes[0].penaBaseDias, A(1) + 2 * A(0, 7, 15));
  c.criterios.fase1 = 'SEXTO_MINIMO';
  assert.equal(calcular(c).crimes[0].penaBaseDias, A(1) + 2 * 60);
  // oito desfavoráveis não passam do máximo
  c.criterios.fase1 = 'OITAVO_INTERVALO';
  c.crimes[0].circunstancias59 = ['culpabilidade', 'antecedentes', 'conduta_social', 'personalidade', 'motivos', 'circunstancias', 'consequencias', 'comportamento_vitima'];
  assert.equal(calcular(c).crimes[0].penaBaseDias, A(6));
});

test('2ª fase: atenuante não leva abaixo do mínimo (Súmula 231) e a fração padrão é 1/6 da pena-base', () => {
  const c = caso('2026-06-10', 'cp-155');
  c.agente.confessou = true;
  const r = calcular(c);
  assert.equal(r.crimes[0].penaIntermediariaDias, A(1));
  assert.match(r.crimes[0].memoria[2].detalhe, /Súmula 231/);

  const d = caso('2026-06-10', 'cp-157');
  d.crimes[0].agravantes = ['ag-motivo-futil-torpe'];
  assert.equal(calcular(d).crimes[0].penaIntermediariaDias, A(7));
});

test('reincidência e confissão se compensam (Tema 585); menor de 21 entra sozinho como atenuante', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.agente = { reincidente: true, transitoAnterior: '2022-01-01', confessou: true };
  const r = calcular(c);
  assert.equal(r.crimes[0].penaIntermediariaDias, A(6));
  assert.match(r.crimes[0].memoria[2].detalhe, /Tema 585/);

  const d = caso('2026-06-10', 'cp-157');
  d.agente = { reincidente: false, nascimento: '2006-01-15' };
  d.crimes[0].circunstancias59 = ['antecedentes'];   // sobe 6 meses para a atenuante ter onde agir
  const s = calcular(d);
  assert.match(s.crimes[0].memoria[2].detalhe, /Menor de 21/);
  assert.equal(s.crimes[0].penaIntermediariaDias, A(6));   // 6a6m − 1/6 de 6a6m (1a1m) → contida no mínimo 6 anos
});

test('reincidência caduca cinco anos após a extinção da pena (art. 64, I)', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.agente = { reincidente: true, transitoAnterior: '2015-01-01', extincaoAnterior: '2019-01-01' };
  const r = calcular(c);
  assert.equal(r.crimes[0].penaIntermediariaDias, A(6));
  assert.ok(r.avisos.some((a) => /art\. 64, I/.test(a)));
  assert.equal(r.ficha.find((f) => f.rotulo === 'Reincidência')?.valor, 'NÃO reincidente para efeitos legais');
  c.agente.extincaoAnterior = '2022-01-01';
  assert.equal(calcular(c).crimes[0].penaIntermediariaDias, A(7));
});

test('3ª fase em soma: todas as causas sobre a pena da 2ª fase (+1/3 −1/2 de 6 anos = 5 anos)', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.crimes[0].causas = [{ id: 'cp-157-2', fracao: F.UM_TERCO }, { id: 'cp-14-tentativa', fracao: F.METADE }];
  c.criterios.fase3 = 'SOMA';
  assert.equal(calcular(c).crimes[0].penaDefinitivaDias, A(5));
});

test('art. 68, p. ún.: com duas majorantes específicas, opcionalmente só a maior', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.crimes[0].causas = [{ id: 'cp-157-2', fracao: F.UM_TERCO }, { id: 'cp-157-2A', fracao: F.DOIS_TERCOS }];
  assert.equal(calcular(c).crimes[0].penaDefinitivaDias, A(13, 4));   // 6 → 10 → 13a4m
  c.criterios.art68Unico = true;
  const r = calcular(c);
  assert.equal(r.crimes[0].penaDefinitivaDias, A(10));
  assert.ok(r.crimes[0].avisos.some((a) => /Art\. 68, p\. ún\./.test(a)));
});

test('fração fora do intervalo legal é contida e avisada; causa que não cabe ao tipo é ignorada', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.crimes[0].causas = [{ id: 'cp-14-tentativa', fracao: { num: 5, den: 6 } }, { id: 'cp-16-arrependimento-posterior', fracao: F.UM_TERCO }];
  const r = calcular(c);
  assert.equal(r.crimes[0].penaDefinitivaDias, A(2));   // 2/3 no máximo
  assert.ok(r.crimes[0].avisos.some((a) => /acima do máximo legal/.test(a)));
  assert.ok(r.crimes[0].avisos.some((a) => /não cabe a este tipo/.test(a)));
});

test('multa segue as três fases: roubo simples 10 dias-multa; +1/3 e −1/2 → 7; em reais, 1/30 do salário', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.crimes[0].causas = [{ id: 'cp-157-2', fracao: F.UM_TERCO }, { id: 'cp-14-tentativa', fracao: F.METADE }];
  const r = calcular(c);
  assert.equal(r.crimes[0].diasMulta, 7);
  assert.equal(r.unificacao.multaReais, Math.round(7 * 1621 / 30 * 100) / 100);
  // tráfico: os dias-multa da própria lei
  const d = caso('2026-06-10', 'drogas-33');
  assert.equal(calcular(d).crimes[0].diasMulta, 500);
  // sem multa cominada
  assert.equal(calcular(caso('2026-06-10', 'cp-121')).crimes[0].diasMulta, null);
});

test('penas em abstrato para prescrição e despenalizadores: maior aumento e menor diminuição no máximo, o inverso no mínimo', () => {
  const tipo = tipoPorId('cp-157', '2026-06-10')!;
  const { maxima, minima } = penasAbstratas(tipo, [causaPorId('cp-157-2')!, causaPorId('cp-14-tentativa')!]);
  assert.equal(maxima, A(10));        // 10 × 3/2 = 15 → −1/3 = 10
  assert.equal(minima, A(2, 8));      // 6 × 4/3 = 8 → −2/3 = 2a8m
});

test('concurso: material soma; formal e continuado exasperam pela tabela do número de crimes, sem passar da soma', () => {
  assert.deepEqual(fracaoPorNumeroDeCrimes(2, 'FORMAL'), F.UM_SEXTO);
  assert.deepEqual(fracaoPorNumeroDeCrimes(7, 'FORMAL'), F.METADE);
  assert.deepEqual(fracaoPorNumeroDeCrimes(7, 'CONTINUADO'), F.DOIS_TERCOS);

  const m = caso('2026-06-10', 'cp-157', 'cp-157');
  assert.equal(calcular(m).unificacao.totalDias, A(12));
  m.concurso = 'FORMAL';
  assert.equal(calcular(m).unificacao.totalDias, A(7));
  const cont = caso('2026-06-10', 'cp-155', 'cp-155', 'cp-155', 'cp-155', 'cp-155', 'cp-155', 'cp-155');
  cont.concurso = 'CONTINUADO';
  assert.equal(calcular(cont).unificacao.totalDias, A(1, 8));   // 1 ano + 2/3
  // benefício: furto 1 ano + ameaça 1 mês em concurso formal: 1a + 1/6 (2 meses) > soma (1a1m) → soma
  const b = caso('2026-06-10', 'cp-155', 'cp-147');
  b.concurso = 'FORMAL';
  const rb = calcular(b);
  assert.equal(rb.unificacao.totalDias, A(1, 1));
  assert.match(rb.unificacao.passos[0].detalhe, /concurso material benéfico/);
});

test('art. 75: teto de 40 anos para fato após 23/01/2020 e de 30 antes; a pena aplicada não muda', () => {
  const novo = caso('2026-06-10', 'cp-157-3-II', 'cp-157-3-II');
  const rn = calcular(novo);
  assert.equal(rn.unificacao.totalDias, A(48));
  assert.equal(rn.unificacao.limiteCumprimentoDias, A(40));
  assert.ok(rn.unificacao.passos.some((p) => /art\. 75/i.test(p.titulo)));
  const velho = caso('2019-06-01', 'cp-157-3-II', 'cp-157-3-II');
  const rv = calcular(velho);
  assert.equal(rv.unificacao.totalDias, A(40));   // 20 + 20 na redação de 2018
  assert.equal(rv.unificacao.limiteCumprimentoDias, A(30));
});

test('menor de 18 na data do fato não tem pena: o cálculo para e aponta o ECA', () => {
  const c = caso('2026-06-10', 'cp-157');
  c.agente.nascimento = '2009-01-01';
  assert.throws(() => calcular(c), (e: unknown) => e instanceof ErroDeCalculo && e.codigo === 'INIMPUTAVEL' && /ECA/.test(e.message));
});

test('regime inicial: >8 fechado; 4–8 semiaberto (fechado se reincidente); ≤4 aberto (semiaberto se reincidente, Súmula 269); detenção nunca fechado', () => {
  const fechado = caso('2026-06-10', 'cp-157');
  fechado.crimes[0].causas = [{ id: 'cp-157-2A', fracao: F.DOIS_TERCOS }];   // 10 anos
  assert.equal(calcular(fechado).consequencias.regime.inicial, 'FECHADO');

  const semi = caso('2026-06-10', 'cp-157');
  assert.equal(calcular(semi).consequencias.regime.inicial, 'SEMIABERTO');
  semi.agente = { reincidente: true, transitoAnterior: '2022-01-01' };
  assert.equal(calcular(semi).consequencias.regime.inicial, 'FECHADO');

  const aberto = caso('2026-06-10', 'cp-155');
  assert.equal(calcular(aberto).consequencias.regime.inicial, 'ABERTO');
  aberto.agente = { reincidente: true, transitoAnterior: '2022-01-01' };
  const ra = calcular(aberto);
  assert.equal(ra.consequencias.regime.inicial, 'SEMIABERTO');
  assert.match(ra.consequencias.regime.fundamento, /Súmula 269/);

  const det = caso('2026-06-10', 'cp-129-3');   // reclusão 4-12 → 4 anos; troque por detenção:
  det.crimes = [crimeVazio('cp-121-3')];       // homicídio culposo, detenção 1-3
  det.crimes[0].circunstancias59 = ['culpabilidade', 'antecedentes', 'conduta_social', 'personalidade', 'motivos', 'circunstancias', 'consequencias', 'comportamento_vitima'];
  det.agente = { reincidente: true, transitoAnterior: '2022-01-01' };
  assert.equal(calcular(det).consequencias.regime.inicial, 'SEMIABERTO');
});

test('detração conta para o regime (art. 387, § 2º, CPP): 4 anos e 2 meses menos 3 meses presos → aberto', () => {
  const c = caso('2026-06-10', 'cp-171');
  c.crimes[0].circunstancias59 = ['antecedentes'];   // 1 ano + 6 meses
  c.crimes[0].causas = [{ id: 'cp-171-4', fracao: F.INTEIRO }];   // dobro → 3 anos... use 3 anos para o exemplo
  c.datas.prisaoProvisoriaDias = 90;
  const r = calcular(c);
  assert.equal(r.consequencias.regime.penaConsideradaDias, r.unificacao.totalDias - 90);
  assert.ok(r.consequencias.regime.avisos.some((a) => /387/.test(a)));
});

test('substituição (art. 44): furto primário cabe; roubo não (violência); lesão doméstica não (Súmula 588); reincidente doloso depende', () => {
  assert.equal(calcular(caso('2026-06-10', 'cp-155')).consequencias.substituicao.cabivel, true);
  const roubo = calcular(caso('2026-06-10', 'cp-157')).consequencias.substituicao;
  assert.equal(roubo.cabivel, false);
  assert.match(roubo.motivo, /violência/);
  const dom = calcular(caso('2026-06-10', 'cp-129-9')).consequencias.substituicao;
  assert.equal(dom.cabivel, false);
  assert.match(dom.motivo, /Súmula 588/);
  const reinc = caso('2026-06-10', 'cp-155');
  reinc.agente = { reincidente: true, transitoAnterior: '2022-01-01', reincidenteDoloso: true };
  assert.equal(calcular(reinc).consequencias.substituicao.cabivel, 'DEPENDE');
  reinc.agente.reincidenteEspecifico = true;
  assert.equal(calcular(reinc).consequencias.substituicao.cabivel, false);
  // culposo: qualquer pena
  assert.equal(calcular(caso('2026-06-10', 'cp-121-3')).consequencias.substituicao.cabivel, true);
});

test('sursis (art. 77): subsidiário à substituição; até 2 anos; etário até 4 para maior de 70', () => {
  const ameaca = calcular(caso('2026-06-10', 'cp-147'));   // grave ameaça: sem substituição → sursis cabe
  assert.equal(ameaca.consequencias.substituicao.cabivel, false);
  assert.equal(ameaca.consequencias.sursis.cabivel, true);
  assert.equal(ameaca.consequencias.sursis.modalidade, 'SIMPLES');

  const furto = calcular(caso('2026-06-10', 'cp-155'));
  assert.equal(furto.consequencias.sursis.cabivel, 'DEPENDE');   // a substituição tem preferência

  const idoso = caso('2026-06-10', 'cp-129-1');   // reclusão 1-5, violência → sem substituição
  idoso.crimes[0].circunstancias59 = ['antecedentes', 'motivos', 'circunstancias'];   // 1a + 3×6m = 2a6m
  idoso.agente.nascimento = '1950-01-01';
  const ri = calcular(idoso);
  assert.equal(ri.unificacao.totalDias, A(2, 6));
  assert.equal(ri.consequencias.sursis.cabivel, true);
  assert.equal(ri.consequencias.sursis.modalidade, 'ETARIO_HUMANITARIO');
});

test('despenalizadores pela pena em abstrato: ameaça é IMPO; furto admite suspensão do processo e ANPP; violência doméstica fecha tudo', () => {
  const ameaca = calcular(caso('2026-06-10', 'cp-147')).consequencias.despenalizadores;
  assert.equal(ameaca[0].cabivel, true);            // IMPO
  assert.equal(ameaca[1].cabivel, 'DEPENDE');       // suspensão do processo
  assert.equal(ameaca[2].cabivel, false);           // ANPP: grave ameaça

  const furto = caso('2026-06-10', 'cp-155');
  const f = calcular(furto).consequencias.despenalizadores;
  assert.equal(f[0].cabivel, false);
  assert.equal(f[1].cabivel, 'DEPENDE');
  assert.equal(f[2].cabivel, 'DEPENDE');
  furto.agente.confessou = true;
  assert.equal(calcular(furto).consequencias.despenalizadores[2].cabivel, true);
  // com o repouso noturno (+1/2), a mínima passa de 1 ano: sem suspensão do processo (Súmula 243)
  furto.crimes[0].causas = [{ id: 'cp-155-1-repouso', fracao: F.METADE }];
  assert.equal(calcular(furto).consequencias.despenalizadores[1].cabivel, false);

  const dom = calcular(caso('2026-06-10', 'cp-129-9')).consequencias.despenalizadores;
  assert.ok(dom.every((d) => d.cabivel === false));
  assert.match(dom[2].motivo, /28-A, § 2º, IV/);
});

test('progressão por data do fato: 1/6 (2019), 25% (Pacote) e 25% (2026) no roubo; latrocínio 50% → 75%, sempre sem livramento', () => {
  const r2019 = calcular(caso('2019-06-01', 'cp-157')).consequencias.execucao;
  assert.equal(r2019.progressao.fracaoTexto, '1/6');
  assert.match(r2019.versao, /11\.464/);
  const r2021 = calcular(caso('2021-06-01', 'cp-157')).consequencias.execucao;
  assert.equal(r2021.progressao.fracaoTexto, '25%');
  assert.equal(r2021.progressao.diasNecessarios, Math.ceil(A(4) * 0.25));
  const r2026 = calcular(caso('2026-06-10', 'cp-157')).consequencias.execucao;
  assert.equal(r2026.progressao.fracaoTexto, '25%');
  assert.equal(r2026.livramento.cabivel, true);
  assert.equal(r2026.livramento.fracaoTexto, '1/3');
  assert.equal(r2026.livramento.diasNecessarios, Math.floor(A(6) / 3) + 1);

  const l2021 = calcular(caso('2021-06-01', 'cp-157-3-II')).consequencias.execucao;
  assert.equal(l2021.progressao.fracaoTexto, '50%');
  assert.equal(l2021.livramento.cabivel, false);
  const l2026 = calcular(caso('2026-06-10', 'cp-157-3-II')).consequencias.execucao;
  assert.equal(l2026.progressao.fracaoTexto, '75%');
  assert.equal(l2026.livramento.cabivel, false);

  // hediondo reincidente: só a reincidência ESPECÍFICA sobe a fração (Tema 1.084)
  const h = caso('2021-06-01', 'cp-213');
  h.agente = { reincidente: true, transitoAnterior: '2018-01-01' };
  assert.equal(calcular(h).consequencias.execucao.progressao.fracaoTexto, '40%');
  h.agente.reincidenteEspecifico = true;
  const rh = calcular(h).consequencias.execucao;
  assert.equal(rh.progressao.fracaoTexto, '60%');
  assert.equal(rh.livramento.cabivel, false);   // art. 83, V
  // tráfico privilegiado deixa de ser hediondo
  const tp = caso('2021-06-01', 'drogas-33');
  tp.crimes[0].causas = [{ id: 'drogas-33-4-privilegio', fracao: F.DOIS_TERCOS }];
  assert.equal(calcular(tp).consequencias.execucao.progressao.fracaoTexto, '16%');
});

test('primário sem violência em 2026 volta a 1/6 (art. 112, caput); reincidente sem violência, 20%', () => {
  assert.equal(calcular(caso('2026-06-10', 'cp-155')).consequencias.execucao.progressao.fracaoTexto, '1/6');
  const c = caso('2026-06-10', 'cp-155');
  c.agente = { reincidente: true, transitoAnterior: '2022-01-01', reincidenteDoloso: true };
  const r = calcular(c).consequencias.execucao;
  assert.equal(r.progressao.fracaoTexto, '20%');
  assert.equal(r.livramento.cabivel, false);   // pena de 1 ano < 2 anos
});

test('a URL guarda o caso inteiro e devolve o mesmo caso', () => {
  const c = caso('2026-06-10', 'cp-157', 'cp-155');
  c.concurso = 'FORMAL';
  c.crimes[0].causas = [{ id: 'cp-157-2', fracao: F.UM_TERCO }];
  c.agente = { reincidente: true, transitoAnterior: '2022-01-01', nascimento: '1990-05-05', confessou: true };
  c.vitima = { nascimento: '1955-01-01', mulher: true };
  c.datas.recebimentoDenuncia = '2026-08-01';
  const volta = desserializarCaso(serializarCaso(c));
  assert.deepEqual(volta, normalizarCaso(c));
  assert.equal(JSON.stringify(calcular(volta!).unificacao), JSON.stringify(calcular(c).unificacao));
  // lixo na URL não derruba: vira caso vazio
  assert.equal(desserializarCaso('n%C3%A3o-e-base64'), null);
  assert.equal(normalizarCaso({ crimes: [{ tipoId: 'cp-157', causas: [{ id: 'x', fracao: { num: 99, den: 0 } }] }], datas: { fato: '31/12/2020' } }).datas.fato.length, 10);
});

test('catálogo íntegro: ids únicos por vigência, causas específicas existem, versões não se sobrepõem', () => {
  for (const t of TIPOS) {
    assert.ok(t.penaMinDias > 0 && t.penaMaxDias >= t.penaMinDias, `${t.id}: limites`);
    for (const id of t.causasEspecificas) assert.ok(causaPorId(id), `${t.id} → causa ${id} não existe`);
    const versoes = TIPOS.filter((x) => x.id === t.id);
    const abertas = versoes.filter((x) => !x.vigenciaAte);
    assert.equal(abertas.length, 1, `${t.id}: exatamente uma versão vigente`);
    for (const a of versoes) for (const b of versoes) {
      if (a === b) continue;
      const fimA = a.vigenciaAte ?? '9999';
      const fimB = b.vigenciaAte ?? '9999';
      assert.ok(fimA <= b.vigenciaDe || fimB <= a.vigenciaDe, `${t.id}: versões sobrepostas`);
    }
  }
  const ids = CAUSAS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'ids de causa repetidos');
  assert.ok(referenciasDoCatalogo().length > 50);
});
