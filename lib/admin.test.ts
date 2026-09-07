import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Testes de preço contra banco de verdade — a regra do §5.9 ("preço novo
 * vale a partir de X, sem afetar licença vigente, com histórico") só é
 * verificável com as constraints reais valendo.
 *
 * Sem banco alcançável, os testes são pulados em vez de falhar: assim a
 * suíte roda em qualquer máquina, e no CI com serviço de Postgres ela
 * cobre o caminho completo.
 */
const { pool, query } = await import('./db.ts');
const { alterarPreco } = await import('./admin.ts');

let temBanco = true;
try {
  await pool.query('SELECT 1 FROM preco LIMIT 1');
} catch {
  temBanco = false;
}
const talvez = { skip: temBanco ? false : 'banco não disponível' };

const dia = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/**
 * Isola cada teste num produto/período que a aplicação não usa.
 *
 * As preparações abaixo escopam por `portal_id = 0` de propósito: desde
 * que existem portais de professor e de empresa, um UPDATE sem escopo
 * alcança a tabela de preço deles — e encerrar hoje um preço que nasceu
 * hoje bate no CHECK `vigente_ate > vigente_de`.
 */
async function limpar() {
  await query("DELETE FROM preco WHERE criado_por LIKE 'teste-%'");
}

test('preço novo encerra o anterior e mantém o histórico', talvez, async () => {
  await limpar();
  // encerra o preço de seed ANTES de inserir o de teste: o índice único
  // garante um só vigente por produto × período
  await query(
    `UPDATE preco SET vigente_ate = $1
      WHERE portal_id = 0 AND produto='CATALOGO' AND periodo='semestral' AND vigente_ate IS NULL`, [dia(-30)],
  );
  await query(
    `INSERT INTO preco (produto, periodo, centavos, vigente_de, criado_por)
     VALUES ('CATALOGO', 'semestral', 10000, $1, 'teste-base')`, [dia(-30)],
  );

  await alterarPreco('teste-admin', 'CATALOGO', 'semestral', 12000, dia(0));

  const linhas = await query<{ centavos: number; vigenteAte: Date | null }>(
    `SELECT centavos, vigente_ate AS "vigenteAte" FROM preco
      WHERE produto='CATALOGO' AND periodo='semestral' AND criado_por LIKE 'teste-%'
      ORDER BY vigente_de`,
  );
  assert.equal(linhas.length, 2, 'o anterior continua na tabela');
  assert.equal(linhas[0].centavos, 10000);
  assert.ok(linhas[0].vigenteAte, 'o anterior ganhou data de fim');
  assert.equal(linhas[1].centavos, 12000);
  assert.equal(linhas[1].vigenteAte, null, 'o novo é o vigente');
  await limpar();
  await query(
    `UPDATE preco SET vigente_ate = NULL
      WHERE portal_id = 0 AND produto='CATALOGO' AND periodo='semestral' AND vigente_ate = $1`, [dia(-30)],
  );
});

test('correção no mesmo dia atualiza a linha em vez de criar duração zero', talvez, async () => {
  await limpar();
  await query(
    `UPDATE preco SET vigente_ate = $1
      WHERE portal_id = 0 AND produto='CATALOGO' AND periodo='trimestral' AND vigente_ate IS NULL`, [dia(0)],
  );
  await alterarPreco('teste-admin', 'CATALOGO', 'trimestral', 9900, dia(0));
  // digitou errado e corrige no mesmo dia
  await alterarPreco('teste-admin', 'CATALOGO', 'trimestral', 8900, dia(0));

  const linhas = await query<{ centavos: number }>(
    `SELECT centavos FROM preco
      WHERE produto='CATALOGO' AND periodo='trimestral' AND criado_por LIKE 'teste-%'`,
  );
  assert.equal(linhas.length, 1, 'a correção não cria segunda linha no mesmo dia');
  assert.equal(linhas[0].centavos, 8900, 'vale o valor corrigido');
  await limpar();
  await query(
    `UPDATE preco SET vigente_ate = NULL
      WHERE portal_id = 0 AND produto='CATALOGO' AND periodo='trimestral' AND vigente_ate = $1`, [dia(0)],
  );
});

test('vigência retroativa é recusada', talvez, async () => {
  await assert.rejects(
    () => alterarPreco('teste-admin', 'MATERIA', 'anual', 100, '2020-01-01'),
    /não pode ser anterior/,
  );
});

test('valor negativo é recusado', talvez, async () => {
  await assert.rejects(
    () => alterarPreco('teste-admin', 'MATERIA', 'anual', -1, dia(1)),
    /valor inválido/,
  );
});

test('data malformada é recusada', talvez, async () => {
  await assert.rejects(
    () => alterarPreco('teste-admin', 'MATERIA', 'anual', 100, '29/08/2026'),
    /data inválida/,
  );
});

test.after(async () => { await pool.end(); });
