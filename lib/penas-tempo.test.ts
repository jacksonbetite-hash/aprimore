import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dias, paraAMD, formatarPena, aplicarFracao, F,
  fimPrazoPenalMeses, fimPrazoProcessualDias, somarMeses, idadeEm, ehFeriado, pascoa,
  diferencaDias, dataValida,
} from './penas/tempo.ts';

/**
 * O tempo é onde a calculadora erra por um dia — e um dia decide uma
 * prescrição. Cada regra de contagem tem o seu caso aqui, com a data que
 * a doutrina usa de exemplo.
 */

test('pena em dias: ano de 360, mês de 30, e o formato por extenso', () => {
  assert.equal(dias(6), 2160);
  assert.equal(dias(1, 2, 20), 360 + 60 + 20);
  assert.deepEqual(paraAMD(2160 + 60 + 20), { anos: 6, meses: 2, dias: 20 });
  assert.equal(formatarPena(dias(6)), '6 anos');
  assert.equal(formatarPena(dias(1, 1, 1)), '1 ano, 1 mês e 1 dia');
  assert.equal(formatarPena(dias(0, 2, 20)), '2 meses e 20 dias');
  assert.equal(formatarPena(0), '0 dia');
});

test('fração aplicada à pena despreza a fração de dia (art. 11) sem prejudicar o réu', () => {
  // 1/6 de 6 anos = 1 ano exato
  assert.equal(aplicarFracao(dias(6), F.UM_SEXTO, '+'), dias(7));
  // 1/3 de 100 dias = 33,33 → 33: aumenta 33, diminui 33
  assert.equal(aplicarFracao(100, F.UM_TERCO, '+'), 133);
  assert.equal(aplicarFracao(100, F.UM_TERCO, '-'), 67);
  // 1/8 do intervalo de 1 a 4 anos (36 meses): 4 meses e 15 dias
  const intervalo = dias(4) - dias(1);
  assert.equal(Math.floor(intervalo / 8), dias(0, 4, 15));
  // 2/3 de diminuição na tentativa de roubo (6 anos): sobram 2 anos
  assert.equal(aplicarFracao(dias(6), F.DOIS_TERCOS, '-'), dias(2));
});

test('prazo penal (art. 10): o dia do começo conta e o prazo termina no dia anterior ao correspondente', () => {
  // decadência: fato conhecido em 15/03, 6 meses → último dia 14/09
  assert.equal(fimPrazoPenalMeses('2025-03-15', 6), '2025-09-14');
  // prescrição de 4 anos a partir de 10/05/2020 → último dia 09/05/2024
  assert.equal(fimPrazoPenalMeses('2020-05-10', 48), '2024-05-09');
});

test('prazo penal quando o dia correspondente não existe: termina no último dia do mês (31/08 + 6 meses = 28/02)', () => {
  assert.equal(fimPrazoPenalMeses('2025-08-31', 6), '2026-02-28');
  assert.equal(fimPrazoPenalMeses('2023-08-31', 6), '2024-02-29');
  assert.deepEqual(somarMeses('2025-01-31', 1), { data: '2025-02-28', ajustado: true });
});

test('prazo processual (art. 798 CPP): exclui o dia do começo e prorroga se cai em fim de semana ou feriado', () => {
  // 30 dias a partir de segunda 03/03/2025: vence quarta 02/04/2025
  assert.equal(fimPrazoProcessualDias('2025-03-03', 30), '2025-04-02');
  // 60 dias a partir de 02/09/2025 = 01/11 (sábado) → 02/11 é Finados (domingo) → 03/11
  assert.equal(fimPrazoProcessualDias('2025-09-02', 60), '2025-11-03');
  // vence num feriado de sexta (Sexta-feira Santa 18/04/2025) → pula para segunda 21/04? é Tiradentes → terça 22/04
  assert.equal(fimPrazoProcessualDias('2025-04-08', 10), '2025-04-22');
});

test('feriados: fixos, Consciência Negra a partir de 2024 e a Sexta-feira Santa calculada', () => {
  assert.equal(pascoa(2025), '2025-04-20');
  assert.equal(pascoa(2026), '2026-04-05');
  assert.ok(ehFeriado('2025-04-18'));
  assert.ok(ehFeriado('2024-11-20'));
  assert.ok(!ehFeriado('2023-11-20'));
  assert.ok(ehFeriado('2026-09-07'));
  assert.ok(!ehFeriado('2026-09-08'));
});

test('idade: completa no dia do aniversário — 21 anos no dia do fato já não é menor de 21', () => {
  assert.equal(idadeEm('2000-03-10', '2021-03-09'), 20);
  assert.equal(idadeEm('2000-03-10', '2021-03-10'), 21);
  // nascido em 29/02 completa em 01/03 no ano comum
  assert.equal(idadeEm('2000-02-29', '2021-02-28'), 20);
  assert.equal(idadeEm('2000-02-29', '2021-03-01'), 21);
  assert.equal(idadeEm('1950-06-01', '2020-06-01'), 70);
});

test('datas: validação estrita e diferença em dias', () => {
  assert.ok(dataValida('2024-02-29'));
  assert.ok(!dataValida('2023-02-29'));
  assert.ok(!dataValida('2024-13-01'));
  assert.ok(!dataValida('10/05/2024'));
  assert.equal(diferencaDias('2024-01-01', '2024-12-31'), 365);
  assert.equal(diferencaDias('2024-12-31', '2024-01-01'), -365);
});
