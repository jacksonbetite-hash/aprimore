import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * O professor SEM portal (db/046) contra banco de verdade: cadastro,
 * contrato, a comissão carimbada na venda do catálogo e a apuração
 * mensal com o professor como dono — o ciclo inteiro do §5.6.1.
 *
 * Sem banco alcançável, pula em vez de falhar (padrão de admin.test.ts).
 */
const { pool, query, queryOne } = await import('./db.ts');
const {
  cadastrarProfessorDoCatalogo, contratoVigente, registrarContratoProfessor, definirChavePix,
  ehProfessorDoCatalogo, posseDaMateria, assinarMateria, vendasDoProfessor, resumoDoProfessor,
  COMISSAO_PADRAO_PP,
} = await import('./professor-catalogo.ts');
const { cadastrar } = await import('./auth.ts');
const { abrirPedido } = await import('./checkout.ts');
const { apurarComissao, listarApuracoes, contestarApuracao, aprovarApuracao, informarNota, registrarRepasse, pagarRepasse } = await import('./apuracao.ts');
const { criarMateria } = await import('./admin-cursos.ts');

let temBanco = true;
try {
  await pool.query('SELECT 1 FROM contrato_professor LIMIT 1');
} catch {
  temBanco = false;
}
const talvez = { skip: temBanco ? false : 'banco não disponível' };

const PREFIXO = 'teste-catalogo-';
const email = (s: string) => `${PREFIXO}${s}@exemplo.com`;
const SENHA = 'senha-bem-longa-2026';
const CPF = '529.982.247-25';

async function limpar() {
  // A venda com comissão segura a conta do professor (FK sem ON DELETE):
  // as vendas de teste saem primeiro, depois as contas, depois os cursos.
  await query(`DELETE FROM pedido WHERE professor_id IN (SELECT id FROM usuario WHERE email LIKE $1)`, [`${PREFIXO}%`]);
  await query(`DELETE FROM usuario WHERE email LIKE $1`, [`${PREFIXO}%`]);
  await query(`DELETE FROM materia WHERE portal_id = 0 AND slug LIKE 'teste-catalogo-%'`);
}

test('cadastro: conta nova vira professor com contrato de 40%; e-mail existente exige a senha dele', talvez, async () => {
  await limpar();
  const id = await cadastrarProfessorDoCatalogo({
    nome: 'Prof Catálogo', email: email('novo'), senha: SENHA, documento: CPF, aceitouContrato: true,
  });
  const u = await queryOne<{ papel: string; documento: string | null }>(
    `SELECT u.papel, c.documento FROM usuario u JOIN conta c ON c.id = u.conta_id WHERE u.id = $1`, [id]);
  assert.equal(u?.papel, 'professor');
  assert.equal(u?.documento, '52998224725');
  const contrato = await contratoVigente(id);
  assert.equal(Number(contrato?.comissaoPp), COMISSAO_PADRAO_PP);
  assert.ok(contrato?.aceitoEm, 'o aceite fica gravado');
  assert.equal(await ehProfessorDoCatalogo(id), true);

  // Aluno que já existe: só com a senha certa.
  const alunoId = (await cadastrar(0, 'Aluna Que Vira Prof', email('aluna'), SENHA))!;
  await assert.rejects(
    () => cadastrarProfessorDoCatalogo({ nome: 'X Y', email: email('aluna'), senha: 'outra-senha-9', documento: CPF, aceitouContrato: true }),
    /senha dela/,
  );
  const promovido = await cadastrarProfessorDoCatalogo({
    nome: 'Aluna Que Vira Prof', email: email('aluna'), senha: SENHA, documento: CPF, aceitouContrato: true,
  });
  assert.equal(promovido, alunoId, 'a mesma conta, promovida');
  assert.equal((await queryOne<{ papel: string }>('SELECT papel FROM usuario WHERE id = $1', [alunoId]))?.papel, 'professor');

  await assert.rejects(
    () => cadastrarProfessorDoCatalogo({ nome: 'Y Z', email: email('aluna'), senha: SENHA, documento: CPF, aceitouContrato: true }),
    /já é professor do catálogo/,
  );
  await assert.rejects(
    () => cadastrarProfessorDoCatalogo({ nome: 'Z W', email: email('semdoc'), senha: SENHA, documento: '111.111.111-11', aceitouContrato: true }),
    /CPF ou CNPJ/,
  );
  await assert.rejects(
    () => cadastrarProfessorDoCatalogo({ nome: 'Z W', email: email('semaceite'), senha: SENHA, documento: CPF, aceitouContrato: false }),
    /aceitar/,
  );
});

test('a venda do curso dele carimba professor_id e a comissão; a apuração fecha por professor', talvez, async () => {
  await limpar();
  const profId = await cadastrarProfessorDoCatalogo({
    nome: 'Prof Vendas', email: email('vendas'), senha: SENHA, documento: CPF, aceitouContrato: true,
  });
  const area = await queryOne<{ id: number }>('SELECT id::int AS id FROM area WHERE portal_id = 0 ORDER BY id LIMIT 1');
  assert.ok(area, 'precisa de uma área da plataforma');
  const { id: materiaId } = await criarMateria('teste', 0, {
    areaId: area!.id, nome: 'Teste Catalogo Curso', ementa: 'x'.repeat(80), status: 'publicado',
    professor: 'Prof Vendas', ordem: 99, naVitrinePlataforma: false,
  });
  await query(`UPDATE materia SET slug = 'teste-catalogo-curso' WHERE id = $1`, [materiaId]);
  await assinarMateria(profId, materiaId, 'Prof Vendas');
  await posseDaMateria(query, profId, materiaId);
  await assert.rejects(() => posseDaMateria(query, profId + 1, materiaId), /não é seu/);

  const alunoId = (await cadastrar(0, 'Aluno Comprador', email('comprador'), SENHA))!;
  const preco = await queryOne<{ centavos: number }>(
    `SELECT centavos FROM preco WHERE portal_id = 0 AND produto = 'MATERIA' AND periodo = 'mensal' AND vigente_ate IS NULL`);
  assert.ok(preco, 'precisa do preço mensal da plataforma');

  const pedido = await abrirPedido(0, alunoId, email('comprador'), 'MATERIA', 'mensal', materiaId, 'PIX');
  const linha = await queryOne<{ professorId: number; pp: string; portalId: number }>(
    `SELECT professor_id::int AS "professorId", comissao_professor_pp AS pp, portal_id::int AS "portalId"
       FROM pedido WHERE referencia = $1`, [pedido.referencia]);
  assert.equal(linha?.professorId, profId, 'a venda sabe de quem é a comissão');
  assert.equal(Number(linha?.pp), COMISSAO_PADRAO_PP);
  assert.equal(linha?.portalId, 0, 'a venda é da plataforma');

  // Paga em julho de 2026, para a competência ficar determinística.
  await query(`UPDATE pedido SET status = 'PAGO', pago_em = '2026-07-10' WHERE referencia = $1`, [pedido.referencia]);
  const vendas = await vendasDoProfessor(profId);
  assert.equal(vendas.length, 1);
  assert.equal(vendas[0].aReceber, Math.round(preco!.centavos * COMISSAO_PADRAO_PP / 100));
  assert.equal((await resumoDoProfessor(profId)).alunos, 1);

  const ap = await apurarComissao('teste', { professorId: profId }, '2026-07-01');
  const esperado = Math.round(preco!.centavos * COMISSAO_PADRAO_PP / 100);
  assert.equal(ap.centavosComissao, esperado);
  assert.equal(ap.status, esperado >= 10_000 ? 'EM_CONFERENCIA' : 'ACUMULADA');
  const lista = await listarApuracoes({ professorId: profId });
  assert.equal(lista.length, 1);
  assert.equal(lista[0].professorId, profId);
  assert.equal(lista[0].portalId, null);
  await assert.rejects(() => apurarComissao('teste', { professorId: profId }, '2026-07-01'), /já foi apurada/);

  if (ap.status === 'EM_CONFERENCIA') {
    await contestarApuracao({ professorId: profId }, ap.id, 'faltou uma venda', new Date('2026-07-02'));
    await assert.rejects(() => informarNota({ professorId: profId }, ap.id, 'NF-1'), /aprovação/);
    await aprovarApuracao('teste-admin', ap.id, 'conferido, está certo');
    await informarNota({ professorId: profId }, ap.id, 'NF-1');
    // Sem subconta, o gateway recusa e manda registrar por fora.
    await assert.rejects(() => pagarRepasse('teste-admin', ap.id), /pague por fora/);
    await registrarRepasse('teste-admin', ap.id, 'PIX-123');
    assert.equal((await listarApuracoes({ professorId: profId }))[0].status, 'PAGA');
  }

  // Um contrato novo não muda a venda antiga.
  await registrarContratoProfessor('teste-admin', profId, { comissaoPp: 55, vigenteDe: '2027-01-01' });
  assert.equal(Number((await contratoVigente(profId))?.comissaoPp), 55);
  assert.equal(Number((await queryOne<{ pp: string }>(
    'SELECT comissao_professor_pp AS pp FROM pedido WHERE referencia = $1', [pedido.referencia]))?.pp), COMISSAO_PADRAO_PP);
  await definirChavePix(profId, 'prof@pix.exemplo');
  assert.equal((await contratoVigente(profId))?.chavePix, 'prof@pix.exemplo');
});

test('curso do catálogo sem contrato vigente não vende', talvez, async () => {
  await limpar();
  const profId = await cadastrarProfessorDoCatalogo({
    nome: 'Prof Sem Contrato', email: email('semcontrato'), senha: SENHA, documento: CPF, aceitouContrato: true,
  });
  await query('UPDATE contrato_professor SET vigente_ate = current_date + 1 WHERE usuario_id = $1', [profId]);
  await query('UPDATE contrato_professor SET aceito_em = NULL WHERE usuario_id = $1', [profId]);
  const area = await queryOne<{ id: number }>('SELECT id::int AS id FROM area WHERE portal_id = 0 ORDER BY id LIMIT 1');
  const { id: materiaId } = await criarMateria('teste', 0, {
    areaId: area!.id, nome: 'Teste Catalogo Sem Contrato', ementa: 'x'.repeat(80), status: 'publicado',
    professor: 'Prof', ordem: 99, naVitrinePlataforma: false,
  });
  await query(`UPDATE materia SET slug = 'teste-catalogo-sem-contrato' WHERE id = $1`, [materiaId]);
  await assinarMateria(profId, materiaId, 'Prof');
  const alunoId = (await cadastrar(0, 'Aluno Dois', email('comprador2'), SENHA))!;
  await assert.rejects(
    () => abrirPedido(0, alunoId, email('comprador2'), 'MATERIA', 'mensal', materiaId, 'PIX'),
    /sem contrato de professor/,
  );
});

test.after(async () => {
  if (temBanco) await limpar();
  await pool.end();
});
