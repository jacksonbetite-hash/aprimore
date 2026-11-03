/**
 * Demonstração — a base de alunos de UM portal de professor, pelos
 * fluxos de verdade.
 *
 * Os roteiros anteriores montaram o portal (portal-professor.mjs) e os
 * alunos da nossa vitrine (alunos-da-plataforma.mjs). Faltava o meio: a
 * base do professor. Sem ela, três telas do painel dele ficam vazias e
 * não dá para avaliar nada — "Alunos", "Financeiro" (extrato venda a
 * venda) e o consumo que vira fatura.
 *
 * Tudo aqui passa pela tela: a conta nasce em /cadastrar DO PORTAL, a
 * compra abre pedido no checkout do portal, o pagamento entra pelo
 * webhook assinado do gateway, a aula é assistida pela rota de progresso
 * do player, o exercício é respondido clicando na alternativa e o
 * reembolso é pedido pelo botão de /conta — o do art. 49 do CDC.
 *
 *   BASE_URL=http://localhost:3010 CHROMIUM="…/chrome.exe" \
 *   DATABASE_URL=postgres://… PORTAL=tecnologiaempaula \
 *   node scripts/demo/alunos-do-professor.mjs
 *
 * PORTAL é a máscara do portal (o subdomínio). O portal precisa estar
 * ATIVO, com subconta APROVADA — sem ela não há venda (§5.10.2, etapa 2)
 * — e com pelo menos um curso publicado.
 *
 * Idempotente por destruição: apaga os alunos que criou, neste portal,
 * antes de recomeçar.
 */
import { PORTA, pool, passo, fim, abrirNavegador, webhook, preencher, senhaDemo } from './_comum.mjs';

const MASCARA = process.env.PORTAL ?? 'tecnologiaempaula';
const PORTAL_URL = `http://${MASCARA}.localhost:${PORTA}`;
/** Uma senha só para todos: é demonstração local, e a lista tem de caber num recado. */
const SENHA = senhaDemo('aluno-demo-2026');
const CPF = '529.982.247-25';

/**
 * Quatro situações diferentes DE PROPÓSITO. O painel do professor só
 * mostra o que sabe fazer quando a base tem gente em estágios distintos:
 * quem pagou e estuda, quem pagou o passe, quem desistiu dentro dos 7
 * dias e quem abriu o pedido e não pagou.
 */
const ALUNOS = [
  { nome: 'Ana Prado', email: 'ana.prado@aluno-demo.com.br',
    compra: { produto: 'MATERIA', periodo: 'anual' }, assistir: 3, exercicios: 1 },
  { nome: 'Bruno Tavares', email: 'bruno.tavares@aluno-demo.com.br',
    compra: { produto: 'CATALOGO', periodo: 'mensal' }, assistir: 2, exercicios: 1 },
  { nome: 'Carla Mendes', email: 'carla.mendes@aluno-demo.com.br',
    compra: { produto: 'MATERIA', periodo: 'mensal' }, assistir: 1, exercicios: 0,
    reembolso: true },
  { nome: 'Diego Rocha', email: 'diego.rocha@aluno-demo.com.br',
    compra: { produto: 'MATERIA', periodo: 'trimestral', naoPagar: true }, assistir: 0, exercicios: 0 },
];

const { rows: [portal] } = await pool.query(
  `SELECT id::int AS id, nome_exibicao AS nome, status, subconta_situacao AS subconta
     FROM portal WHERE lower(mascara) = lower($1)`, [MASCARA]);
if (!portal) {
  console.error(`✘ portal "${MASCARA}" não existe`);
  await pool.end();
  process.exit(1);
}

async function limpar() {
  const emails = ALUNOS.map((a) => `'${a.email}'`).join(', ');
  // Escopo no PORTAL, não só no e-mail: o mesmo e-mail pode existir em
  // outro portal (a chave é portal + e-mail), e apagar por e-mail solto
  // levaria junto o aluno de um portal que não é este.
  const ids = `SELECT id FROM usuario WHERE portal_id = ${portal.id} AND lower(email) IN (${emails})`;
  for (const sql of [
    `DELETE FROM resposta WHERE usuario_id IN (${ids})`,
    `DELETE FROM progresso_aula WHERE usuario_id IN (${ids})`,
    `DELETE FROM licenca WHERE usuario_id IN (${ids})`,
    `DELETE FROM reembolso WHERE pedido_id IN (SELECT id FROM pedido WHERE usuario_id IN (${ids}))`,
    `DELETE FROM pagamento WHERE pedido_id IN (SELECT id FROM pedido WHERE usuario_id IN (${ids}))`,
    `DELETE FROM apuracao_item WHERE pedido_id IN (SELECT id FROM pedido WHERE usuario_id IN (${ids}))`,
    `DELETE FROM assinatura WHERE usuario_id IN (${ids})`,
    `DELETE FROM pedido WHERE usuario_id IN (${ids})`,
    `DELETE FROM anotacao WHERE usuario_id IN (${ids})`,
    `DELETE FROM favorito WHERE usuario_id IN (${ids})`,
    `DELETE FROM sessao WHERE usuario_id IN (${ids})`,
    `DELETE FROM usuario WHERE portal_id = ${portal.id} AND lower(email) IN (${emails})`,
    `DELETE FROM evento_gateway WHERE evento_id LIKE 'demo-aluno-prof-%'`,
  ]) await pool.query(sql);
}

/** Marca a aula como assistida pela mesma rota que o player usa. */
async function assistir(pagina, aula) {
  await pagina.goto(`${PORTAL_URL}/aula/${aula.slug}`, { waitUntil: 'load' });
  const temPlayer = await pagina.locator('video source').count() > 0;
  await pagina.evaluate(async ([id, seg]) => {
    await fetch('/api/progresso', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aulaId: id, segundos: seg, concluida: true }),
    });
  }, [Number(aula.id), Number(aula.dur)]);
  return temPlayer;
}

/**
 * Responde o exercício da aula aberta com o gabarito em mãos: erra a
 * primeira de propósito e acerta o resto. Aluno que erra tudo não é
 * aluno, é ruído — e o caderno de erros ficaria com o exercício inteiro
 * dentro, o que não demonstra nada.
 */
async function responderExercicio(pagina, aulaId, erradas = 1) {
  const { rows: gabarito } = await pool.query(
    `SELECT q.id::int AS questao,
            (SELECT x.id::int FROM alternativa x WHERE x.questao_id = q.id AND x.correta LIMIT 1) AS certa,
            (SELECT x.id::int FROM alternativa x WHERE x.questao_id = q.id AND NOT x.correta LIMIT 1) AS errada
       FROM questao q JOIN exercicio e ON e.id = q.exercicio_id
      WHERE e.aula_id = $1 ORDER BY q.ordem, q.id`, [aulaId]);

  // O exercício vive numa aba e mostra UMA questão por vez: a âncora abre
  // a aba (AbasAula ouve o hash), e entre uma questão e outra o roteiro
  // clica em "Próxima questão", como o aluno faz.
  await pagina.evaluate(() => { window.location.hash = 'exercicio'; });
  await pagina.locator('#exercicio').waitFor({ state: 'visible', timeout: 10000 });

  let respondidas = 0;
  for (const g of gabarito) {
    const alvo = respondidas < erradas ? g.errada : g.certa;
    const { rows: [alt] } = await pool.query('SELECT texto FROM alternativa WHERE id = $1', [alvo]);
    const botao = pagina.locator('#exercicio button.alternativa')
      .filter({ hasText: alt.texto.slice(0, 40) }).first();
    if (await botao.count() === 0) continue;
    await botao.evaluate((el) => el.click());
    // O comentário da alternativa só aparece depois que a resposta é
    // gravada: esperá-lo é esperar o fim do salvamento, e não um prazo
    // chutado que ora sobra, ora falta.
    await pagina.locator('#exercicio .comentario').first()
      .waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await pagina.waitForTimeout(250);
    respondidas++;
    await pagina.locator('#exercicio .nav-exercicio .btn-primario').click().catch(() => {});
    await pagina.waitForTimeout(200);
  }
  return respondidas;
}

const { b } = await (async () => { await limpar(); return abrirNavegador(); })();

try {
  passo(portal.status === 'ATIVO' && portal.subconta === 'APROVADA',
    `portal "${portal.nome}" (${MASCARA}) ${portal.status.toLowerCase()}, `
    + `subconta ${portal.subconta.toLowerCase().replace('_', ' ')}`);

  const { rows: cursos } = await pool.query(
    `SELECT m.id::int AS id, m.nome, m.slug FROM materia m
      WHERE m.portal_id = $1 AND m.status = 'publicado'
        AND EXISTS (SELECT 1 FROM aula a JOIN assunto s ON s.id = a.assunto_id
                     WHERE s.materia_id = m.id AND a.status = 'publicado')
      ORDER BY m.ordem, m.id`, [portal.id]);
  passo(cursos.length > 0,
    `${cursos.length} curso(s) publicado(s) com aula no ar: ${cursos.map((c) => c.nome).join(', ')}`);
  if (cursos.length === 0) throw new Error('sem curso com aula publicada — não há o que vender');

  for (const [i, aluno] of ALUNOS.entries()) {
    const ctx = await b.newContext({ reducedMotion: 'reduce' });
    const pg = await ctx.newPage();
    // Cada aluno compra um curso diferente quando há mais de um: o
    // extrato do professor fica com produtos distintos, que é o que
    // permite conferir a coluna "Produto" de verdade.
    const curso = cursos[i % cursos.length];

    // ---- conta, no endereço DO PORTAL ----
    await pg.goto(`${PORTAL_URL}/cadastrar`, { waitUntil: 'load' });
    await preencher(pg.locator('form'), { nome: aluno.nome, email: aluno.email, senha: SENHA });
    await pg.click('form button[type=submit]');
    await pg.waitForURL('**/painel**', { timeout: 40000 });
    const { rows: [conta] } = await pool.query(
      `SELECT portal_id::int AS portal FROM usuario
        WHERE lower(email) = $1 AND portal_id = $2`, [aluno.email, portal.id]);
    passo(conta?.portal === portal.id,
      `${aluno.nome}: conta criada DENTRO do portal (base do professor, não a nossa)`);

    // ---- compra ----
    await pg.goto(`${PORTAL_URL}/planos`, { waitUntil: 'load' });
    if (aluno.compra.periodo !== 'mensal') {
      const rotulo = { anual: 'Anual', trimestral: 'Trimestral', semestral: 'Semestral' }[aluno.compra.periodo];
      await pg.click(`.alternador button:has-text("${rotulo}")`);
    }
    const cartao = pg.locator(`form:has(input[name=produto][value=${aluno.compra.produto}])`);
    if (aluno.compra.produto === 'MATERIA') {
      await cartao.locator('select[name=materiaId]').selectOption(String(curso.id));
    }
    if (await cartao.locator('input[name=cpf]').count()) {
      await cartao.locator('input[name=cpf]').fill(CPF);
    }
    await cartao.locator('button[type=submit]').click();
    await pg.waitForURL('**/checkout/**', { timeout: 40000 });
    const referencia = pg.url().split('/').pop();
    passo(referencia.startsWith('AD-'),
      `${aluno.nome}: pedido aberto no checkout do portal (${referencia})`);

    if (aluno.compra.naoPagar) {
      // Pedido aberto e abandonado: é o que o professor vê como venda que
      // não fechou. Existe de propósito — sem ele, "situação" no extrato
      // teria um valor só.
      passo(true, `${aluno.nome}: deixou o pedido em aberto, sem pagar (Pix abandonado)`);
    } else {
      const r = await webhook({
        eventoId: `demo-aluno-prof-${referencia}`, tipo: 'pagamento.confirmado',
        referencia, centavos: 0,
      });
      const { rows: [venda] } = await pool.query(
        `SELECT centavos, percentual_aplicado AS percentual,
                round(centavos * coalesce(percentual_aplicado, 0) / 100)::int AS retido
           FROM pedido WHERE referencia = $1`, [referencia]);
      passo(r.processado === true && Number(r.licencaId) > 0,
        `${aluno.nome}: pago — R$ ${(venda.centavos / 100).toFixed(2)}, `
        + `${Number(venda.percentual)}% da plataforma (R$ ${(venda.retido / 100).toFixed(2)}), `
        + `o resto na conta do professor`);
    }

    // ---- estudo ----
    const { rows: liberadas } = await pool.query(
      `SELECT DISTINCT a.id::int AS id, a.slug, a.duracao_segundos AS dur,
              a.video_id IS NOT NULL AS "temVideo"
         FROM aula a JOIN assunto s ON s.id = a.assunto_id JOIN materia m ON m.id = s.materia_id
         JOIN licenca l ON l.usuario_id = (SELECT id FROM usuario
                                            WHERE lower(email) = $1 AND portal_id = $3)
              AND l.status = 'ATIVA'
              AND (l.materia_id = m.id OR (l.escopo = 'CATALOGO' AND m.portal_id = l.portal_id))
        WHERE a.status = 'publicado' AND m.portal_id = $3
        ORDER BY id LIMIT $2`, [aluno.email, aluno.assistir, portal.id]);

    let tocaram = 0;
    for (const a of liberadas) if (await assistir(pg, a)) tocaram++;
    const comVideo = liberadas.filter((a) => a.temVideo).length;
    if (aluno.assistir > 0) {
      passo(liberadas.length > 0 && tocaram === comVideo,
        `${aluno.nome}: ${liberadas.length} aula(s) concluída(s)`
        + (comVideo === 0
          ? ' — nenhuma tem vídeo ainda; a página serve resumo e exercício'
          : `, ${tocaram} com vídeo tocando`));
    }

    if (aluno.exercicios > 0 && liberadas.length > 0) {
      await pg.goto(`${PORTAL_URL}/aula/${liberadas[0].slug}`, { waitUntil: 'load' });
      await pg.waitForLoadState('networkidle');
      const n = await responderExercicio(pg, liberadas[0].id, 1);
      const { rows: [r] } = await pool.query(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE NOT acertou)::int AS erros
           FROM resposta WHERE usuario_id = (SELECT id FROM usuario
                                              WHERE lower(email) = $1 AND portal_id = $2)`,
        [aluno.email, portal.id]);
      // O que importa é o estado final no banco: houve resposta, houve
      // erro (o caderno de erros precisa de lastro) e não foi tudo erro
      // — aluno que erra tudo não demonstra nada.
      passo(n > 0 && r.total > 0 && r.erros >= 1 && r.erros < r.total,
        `${aluno.nome}: ${r.total} questão(ões) respondida(s), ${r.erros} para o caderno de erros`);
    }

    // ---- arrependimento em 7 dias (CDC, art. 49), pelo botão de /conta ----
    if (aluno.reembolso) {
      await pg.goto(`${PORTAL_URL}/conta`, { waitUntil: 'load' });
      await pg.click('form:has(input[name=pedidoId]) button:has-text("Pedir reembolso")');
      await pg.waitForLoadState('networkidle');
      const { rows: [dev] } = await pool.query(
        `SELECT status FROM pedido WHERE referencia = $1`, [referencia]);
      passo(dev?.status === 'REEMBOLSADO',
        `${aluno.nome}: pediu reembolso nos 7 dias e o pedido voltou como reembolsado`);
    }

    await ctx.close();
  }

  // -------------------------------------------------------------------
  // O que o painel do professor passa a mostrar
  // -------------------------------------------------------------------
  const { rows: [base] } = await pool.query(
    `SELECT (SELECT count(*)::int FROM usuario WHERE portal_id = $1 AND papel = 'aluno') AS alunos,
            (SELECT count(*)::int FROM licenca WHERE portal_id = $1 AND status = 'ATIVA'
               AND now() BETWEEN inicio_em AND fim_em) AS licencas,
            (SELECT count(*)::int FROM pedido WHERE portal_id = $1 AND status = 'PAGO') AS pagos,
            (SELECT count(*)::int FROM pedido WHERE portal_id = $1 AND status = 'ABERTO') AS abertos,
            (SELECT count(*)::int FROM pedido WHERE portal_id = $1 AND status = 'REEMBOLSADO') AS devolvidos,
            (SELECT coalesce(sum(centavos), 0)::int FROM pedido
              WHERE portal_id = $1 AND status = 'PAGO') AS vendido,
            (SELECT coalesce(sum(round(centavos * coalesce(percentual_aplicado, 0) / 100)), 0)::int
               FROM pedido WHERE portal_id = $1 AND status = 'PAGO') AS retido,
            (SELECT count(*)::int FROM progresso_aula p JOIN aula a ON a.id = p.aula_id
              WHERE a.portal_id = $1 AND p.concluida) AS concluidas`, [portal.id]);
  passo(base.alunos >= ALUNOS.length && base.pagos >= 2,
    `base do professor: ${base.alunos} alunos, ${base.licencas} licença(s) vigente(s), `
    + `${base.concluidas} aula(s) concluída(s)`);
  passo(base.vendido > 0,
    `financeiro: ${base.pagos} venda(s) paga(s) somando R$ ${(base.vendido / 100).toFixed(2)} `
    + `(R$ ${(base.retido / 100).toFixed(2)} de comissão da plataforma, `
    + `R$ ${((base.vendido - base.retido) / 100).toFixed(2)} do professor) · `
    + `${base.abertos} em aberto · ${base.devolvidos} reembolsado(s)`);

  console.log(`\nEntre como qualquer um deles em ${PORTAL_URL}/entrar — senha "${SENHA}":`);
  for (const a of ALUNOS) console.log(`   ${a.email}`);
} catch (err) {
  passo(false, `erro: ${err.message}`);
}

await fim(b);
