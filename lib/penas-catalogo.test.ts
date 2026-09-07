import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPOS, referenciasDoCatalogo } from './penas/catalogo/index.ts';
import { penaDaForma, lerPena } from './penas/extrator.ts';
import { dias } from './penas/tempo.ts';

/**
 * Catálogo × acervo (§5.12): a pena que está escrita à mão no catálogo
 * tem de ser a pena que está no texto oficial importado do Planalto.
 *
 * Precisa de banco (`DATABASE_URL`); sem ele, os testes são pulados. É o
 * teste que envelhece bem: quando uma lei nova mudar a pena do roubo, o
 * importador atualiza o acervo e este teste passa a falhar — que é o
 * aviso de que o catálogo precisa de revisão humana.
 */
const { pool, query } = await import('./db.ts');

let temBanco = true;
try {
  await pool.query('SELECT 1 FROM dispositivo LIMIT 1');
} catch {
  temBanco = false;
}
const talvez = { skip: temBanco ? false : 'banco não disponível' };

test('o extrator lê as formas que a lei usa para escrever a pena', () => {
  assert.deepEqual(
    (({ especie, minDias, maxDias, multa }) => ({ especie, minDias, maxDias, multa }))(lerPena('Pena – reclusão, de 6 (seis) a 10 (dez) anos, e multa.')!),
    { especie: 'RECLUSAO', minDias: dias(6), maxDias: dias(10), multa: 'CUMULATIVA' },
  );
  assert.equal(lerPena('Pena - detenção, de três meses a um ano.')!.minDias, dias(0, 3));
  assert.equal(lerPena('Pena - detenção, de quinze dias a seis meses, e multa.')!.minDias, 15);
  assert.equal(lerPena('Pena - detenção, de um a seis meses, ou multa.')!.multa, 'ALTERNATIVA');
  assert.equal(lerPena('II – morte, a pena é de reclusão, de 24 (vinte e quatro) a 30 (trinta) anos, e multa.')!.minDias, dias(24));
  const drogas = lerPena('Pena - reclusão de 5 (cinco) a 15 (quinze) anos e pagamento de 500 (quinhentos) a 1.500 (mil e quinhentos) dias-multa.')!;
  assert.equal(drogas.diasMultaMin, 500);
  assert.equal(drogas.diasMultaMax, 1500);
  assert.equal(drogas.multa, 'CUMULATIVA');
  assert.equal(lerPena('a pena é de reclusão, de 6 (seis) a 12 (doze) anos, além da multa;')!.multa, 'CUMULATIVA');
  assert.equal(lerPena('Nada de pena aqui.'), null);
});

test('toda referência do catálogo existe no acervo', talvez, async () => {
  const refs = referenciasDoCatalogo();
  const faltam: string[] = [];
  for (const r of refs) {
    const linhas = await query(
      `SELECT 1 FROM dispositivo d JOIN norma n ON n.id = d.norma_id WHERE n.slug = $1 AND d.rotulo = $2`, [r.norma, r.rotulo],
    );
    if (linhas.length === 0) faltam.push(`${r.norma} ${r.rotulo}`);
  }
  assert.deepEqual(faltam, [], 'referências sem artigo no acervo');
});

test('a pena de cada tipo vigente bate com o bloco "Pena" do artigo no acervo', talvez, async () => {
  const divergentes: string[] = [];
  const naoLidos: string[] = [];
  // formas que o extrator não localiza (a pena está na mesma linha do caput, dividida por "se o documento é...")
  const semLeitura = new Set(['cp-299-particular']);
  for (const t of TIPOS.filter((x) => !x.vigenciaAte)) {
    if (semLeitura.has(t.id)) continue;
    const [linha] = await query<{ texto: string }>(
      `SELECT d.texto FROM dispositivo d JOIN norma n ON n.id = d.norma_id WHERE n.slug = $1 AND d.rotulo = $2`, [t.norma, t.rotulo],
    );
    if (!linha) { naoLidos.push(`${t.id}: artigo ausente`); continue; }
    const lida = penaDaForma(linha.texto, t.forma);
    if (!lida) { naoLidos.push(`${t.id} (${t.forma ?? 'caput'})`); continue; }
    const problemas: string[] = [];
    if (lida.especie !== t.especie) problemas.push(`espécie ${lida.especie}≠${t.especie}`);
    if (lida.minDias !== t.penaMinDias) problemas.push(`mín ${lida.minDias}≠${t.penaMinDias}`);
    if (lida.maxDias !== t.penaMaxDias) problemas.push(`máx ${lida.maxDias}≠${t.penaMaxDias}`);
    if (lida.multa !== t.multa) problemas.push(`multa ${lida.multa}≠${t.multa}`);
    if (lida.diasMultaMin && lida.diasMultaMin !== t.diasMultaMin) problemas.push(`dias-multa mín ${lida.diasMultaMin}≠${t.diasMultaMin}`);
    if (problemas.length) divergentes.push(`${t.id}: ${problemas.join(', ')} — "${lida.trecho}"`);
  }
  assert.deepEqual(divergentes, [], 'penas do catálogo diferentes do acervo');
  // o extrator precisa ler a grande maioria; o que não leu aparece para revisão
  assert.ok(naoLidos.length <= 3, `formas não lidas pelo extrator: ${naoLidos.join('; ')}`);
});
