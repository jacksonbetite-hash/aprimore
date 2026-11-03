/**
 * Demonstração — os alunos da plataforma, pelos fluxos de verdade.
 *
 * Fecha o terceiro produto: além do portal do professor e da empresa,
 * quem paga curso na vitrine da casa. Cria contas em /cadastrar, ativa o
 * teste de 7 dias, compra curso e passe completo pelo checkout com
 * webhook do gateway, assiste às aulas com o vídeo tocando, responde
 * exercícios (acertando e errando, para o caderno de erros ter lastro) e
 * compra o curso do professor parceiro — a venda que nasce na nossa
 * vitrine e rende comissão a ele.
 *
 *   BASE_URL=http://localhost:3010 CHROMIUM="…/chrome.exe" \
 *   DATABASE_URL=postgres://… node scripts/demo/alunos-da-plataforma.mjs
 */
import { join } from 'node:path';
import {
  BASE, MIDIA, pool, passo, fim, abrirNavegador, webhook, preencher, senhaDemo,
} from './_comum.mjs';

const SENHA = senhaDemo('estudar-todo-dia-2026');
const SUFIXO = 'exemplo.com.br';

/**
 * Quatro perfis diferentes de propósito: o painel do aluno, a retaguarda
 * e o extrato do professor só mostram o que sabem fazer quando há gente
 * em estágios diferentes do funil.
 */
const ALUNOS = [
  { nome: 'Camila Ferraz', email: `camila.ferraz@${SUFIXO}`,
    compra: { produto: 'MATERIA', periodo: 'anual', curso: 'Noções de Direito Constitucional' },
    assistir: 3, exercicios: 2 },
  { nome: 'Paulo Menezes', email: `paulo.menezes@${SUFIXO}`,
    compra: { produto: 'CATALOGO', periodo: 'mensal' },
    assistir: 2, exercicios: 1 },
  { nome: 'Renata Aguiar', email: `renata.aguiar@${SUFIXO}`,
    trial: 'Introdução ao Direito', assistir: 1, exercicios: 1 },
  { nome: 'Marcos Vilela', email: `marcos.vilela@${SUFIXO}`,
    parceiro: true, assistir: 1, exercicios: 0 },
];

async function limpar() {
  const emails = ALUNOS.map((a) => `'${a.email}'`).join(', ');
  const ids = `SELECT id FROM usuario WHERE lower(email) IN (${emails})`;
  for (const sql of [
    `DELETE FROM resposta WHERE usuario_id IN (${ids})`,
    `DELETE FROM progresso_aula WHERE usuario_id IN (${ids})`,
    `DELETE FROM licenca WHERE usuario_id IN (${ids})`,
    `DELETE FROM assinatura WHERE usuario_id IN (${ids})`,
    `DELETE FROM pedido WHERE usuario_id IN (${ids})`,
    `DELETE FROM sessao WHERE usuario_id IN (${ids})`,
    `DELETE FROM usuario WHERE lower(email) IN (${emails})`,
    `DELETE FROM evento_gateway WHERE evento_id LIKE 'demo-aluno-%'`,
  ]) await pool.query(sql);
}

const { b } = await (async () => { await limpar(); return abrirNavegador(); })();

/**
 * O endereço da aula depende de QUEM é o curso: no acervo da casa é
 * `/aula/<slug>`; num curso de professor parceiro visto pela nossa
 * vitrine, é `/parceiros/<mascara>/aula/<slug>` (§5.10.2, etapa 5).
 */
const enderecoDaAula = (aula) =>
  aula.mascara ? `${BASE}/parceiros/${aula.mascara}/aula/${aula.slug}` : `${BASE}/aula/${aula.slug}`;

/** Marca a aula como assistida pela mesma rota que o player usa. */
async function assistir(pagina, aula) {
  await pagina.goto(enderecoDaAula(aula), { waitUntil: 'load' });
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
 * Responde o exercício da aula aberta com o gabarito em mãos: erra as
 * primeiras `erradas` de propósito e acerta o resto. Aluno que erra tudo
 * não é aluno, é ruído — e o caderno de erros ficaria com o exercício
 * inteiro dentro, o que não demonstra nada.
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
    // O exercício da aula usa <button> por alternativa, e o texto é o que
    // os liga ao gabarito — o id não vai para o HTML. Buscamos o texto.
    const { rows: [alt] } = await pool.query(
      'SELECT texto FROM alternativa WHERE id = $1', [alvo]);
    const botao = pagina.locator('#exercicio button.alternativa')
      .filter({ hasText: alt.texto.slice(0, 40) }).first();
    if (await botao.count() === 0) continue;
    await botao.evaluate((el) => el.click());
    await pagina.locator('#exercicio .comentario').first()
      .waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await pagina.waitForTimeout(250);
    respondidas++;
    await pagina.locator('#exercicio .nav-exercicio .btn-primario').click().catch(() => {});
    await pagina.waitForTimeout(200);
  }
  return respondidas;
}

try {
  // As aulas publicadas da plataforma, para o roteiro escolher o que assistir.
  const { rows: aulas } = await pool.query(
    `SELECT a.id, a.slug, a.duracao_segundos AS dur, m.nome AS curso, m.slug AS "cursoSlug"
       FROM aula a JOIN assunto s ON s.id = a.assunto_id JOIN materia m ON m.id = s.materia_id
      WHERE a.portal_id = 0 AND a.status = 'publicado' AND m.status = 'publicado'
      ORDER BY m.ordem, s.ordem, a.ordem`);
  passo(aulas.length >= 15, `${aulas.length} aulas publicadas no catálogo da plataforma`);

  // Curso de parceiro COM aula publicada: a vitrine aceita cursos ainda
  // em produção (aparecem como "em breve"), e comprar um deles daria uma
  // demonstração de um aluno sem nada para assistir.
  const { rows: [parceiro] } = await pool.query(
    `SELECT m.id, m.slug, m.nome, p.mascara FROM materia m JOIN portal p ON p.id = m.portal_id
      WHERE m.na_vitrine_plataforma AND m.status = 'publicado' AND p.tipo = 'PROFESSOR'
        AND EXISTS (SELECT 1 FROM aula a JOIN assunto s ON s.id = a.assunto_id
                     WHERE s.materia_id = m.id AND a.status = 'publicado')
      ORDER BY m.id LIMIT 1`);
  passo(Boolean(parceiro), `curso de parceiro na vitrine: ${parceiro?.nome ?? '—'}`);

  for (const aluno of ALUNOS) {
    const ctx = await b.newContext({ reducedMotion: 'reduce' });
    const pg = await ctx.newPage();

    // ---- conta ----
    await pg.goto(`${BASE}/cadastrar`, { waitUntil: 'load' });
    await preencher(pg.locator('form'), { nome: aluno.nome, email: aluno.email, senha: SENHA });
    await pg.click('form button[type=submit]');
    await pg.waitForURL('**/painel**', { timeout: 40000 });
    passo(pg.url().includes('bemvindo=1'), `${aluno.nome}: conta criada e sessão aberta`);

    // ---- teste gratuito ----
    if (aluno.trial) {
      await pg.goto(`${BASE}/planos`, { waitUntil: 'load' });
      const f = pg.locator('form:has(select#trial-materia)');
      await f.locator('select#trial-materia').selectOption({ label: aluno.trial });
      await f.locator('button[type=submit]').click();
      await pg.waitForURL('**/painel**', { timeout: 40000 });
      const { rows: [l] } = await pool.query(
        `SELECT l.origem, l.status FROM licenca l JOIN usuario u ON u.id = l.usuario_id
          WHERE lower(u.email) = $1`, [aluno.email]);
      passo(l?.origem === 'TRIAL' && l.status === 'ATIVA',
        `${aluno.nome}: teste de 7 dias ativo em ${aluno.trial}`);
    }

    // ---- compra na vitrine da casa ----
    if (aluno.compra) {
      await pg.goto(`${BASE}/planos`, { waitUntil: 'load' });
      if (aluno.compra.periodo !== 'mensal') {
        await pg.click(`.alternador button:has-text("${aluno.compra.periodo === 'anual' ? 'Anual' : 'Trimestral'}")`);
      }
      const cartao = aluno.compra.produto === 'MATERIA'
        ? pg.locator('form:has(input[name=produto][value=MATERIA])')
        : pg.locator('form:has(input[name=produto][value=CATALOGO])');
      if (aluno.compra.curso) {
        await cartao.locator('select[name=materiaId]').selectOption({ label: aluno.compra.curso });
      }
      if (await cartao.locator('input[name=cpf]').count()) {
        await cartao.locator('input[name=cpf]').fill('529.982.247-25');
      }
      await cartao.locator('button[type=submit]').click();
      await pg.waitForURL('**/checkout/**', { timeout: 40000 });
      const referencia = pg.url().split('/').pop();
      passo(referencia.startsWith('AD-'), `${aluno.nome}: pedido aberto (${referencia})`);

      const r = await webhook({
        eventoId: `demo-aluno-${referencia}`, tipo: 'pagamento.confirmado',
        referencia, centavos: 0,
      });
      passo(r.processado === true && Number(r.licencaId) > 0,
        `${aluno.nome}: pagamento confirmado pelo gateway e licença emitida`);
    }

    // ---- compra do curso do parceiro, pela nossa vitrine ----
    if (aluno.parceiro && parceiro) {
      await pg.goto(`${BASE}/parceiros/${parceiro.mascara}/materia/${parceiro.slug}`,
        { waitUntil: 'load' });
      const f = pg.locator('form:has(input[name=materiaId])').first();
      if (await f.locator('input[name=cpf]').count()) {
        await f.locator('input[name=cpf]').fill('529.982.247-25');
      }
      await f.locator('button[type=submit]').click();
      await pg.waitForURL('**/checkout/**', { timeout: 40000 });
      const referencia = pg.url().split('/').pop();
      const r = await webhook({
        eventoId: `demo-aluno-${referencia}`, tipo: 'pagamento.confirmado',
        referencia, centavos: 0,
      });
      const { rows: [venda] } = await pool.query(
        `SELECT p.portal_id AS "portalDoAluno", p.materia_portal_id AS "portalDoCurso",
                p.comissao_professor_pp AS comissao
           FROM pedido p WHERE p.referencia = $1`, [referencia]);
      passo(r.processado === true && Number(venda.portalDoAluno) === 0
        && Number(venda.portalDoCurso) !== 0 && Number(venda.comissao) > 0,
        `${aluno.nome}: comprou o curso do parceiro na nossa vitrine — venda nossa, `
        + `com ${Number(venda.comissao)}% de comissão ao professor`);
    }

    // ---- estudo: assistir e responder ----
    const { rows: liberadas } = await pool.query(
      `SELECT DISTINCT a.id, a.slug, a.duracao_segundos AS dur,
              a.video_id IS NOT NULL AS "temVideo",
              CASE WHEN m.portal_id = 0 THEN NULL ELSE pt.mascara END AS mascara
         FROM aula a JOIN assunto s ON s.id = a.assunto_id JOIN materia m ON m.id = s.materia_id
         JOIN portal pt ON pt.id = m.portal_id
         JOIN licenca l ON l.usuario_id = (SELECT id FROM usuario WHERE lower(email) = $1)
              AND l.status = 'ATIVA'
              AND (l.materia_id = m.id OR (l.escopo = 'CATALOGO' AND m.portal_id = l.portal_id))
        WHERE a.status = 'publicado' AND (l.origem <> 'TRIAL' OR a.no_trial)
        ORDER BY a.id LIMIT $2`, [aluno.email, aluno.assistir]);

    let tocaram = 0;
    for (const a of liberadas) if (await assistir(pg, a)) tocaram++;
    // Uma aula da 1ª onda ficou sem gravação por falta de vídeo em
    // licença compatível (db/039); ela serve resumo e exercício do mesmo
    // jeito, e o roteiro não a cobra como defeito.
    const comVideo = liberadas.filter((a) => a.temVideo).length;
    passo(liberadas.length > 0 && tocaram === comVideo,
      `${aluno.nome}: ${liberadas.length} aula(s) assistida(s), ${tocaram} com vídeo tocando`);

    if (aluno.exercicios > 0 && liberadas.length > 0) {
      await pg.goto(enderecoDaAula(liberadas[0]), { waitUntil: 'load' });
      await pg.waitForLoadState('networkidle');
      const n = await responderExercicio(pg, liberadas[0].id, 1);
      const { rows: [r] } = await pool.query(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE NOT acertou)::int AS erros
           FROM resposta WHERE usuario_id = (SELECT id FROM usuario WHERE lower(email) = $1)`,
        [aluno.email]);
      passo(r.total >= n && n > 0 && r.erros >= 1 && r.erros < r.total,
        `${aluno.nome}: ${r.total} questões respondidas, ${r.erros} para o caderno de erros`);
    }

    // ---- o painel reflete o estudo ----
    await pg.goto(`${BASE}/painel`, { waitUntil: 'load' });
    await pg.waitForLoadState('networkidle');
    const painel = await pg.locator('body').innerText();
    passo(painel.includes('SEU DESEMPENHO') && !painel.includes('ainda não tem curso liberado'),
      `${aluno.nome}: o painel mostra progresso e licenças`);
    await ctx.close();
  }

  // -------------------------------------------------------------------
  // O que a retaguarda e o professor passam a ver
  // -------------------------------------------------------------------
  const { rows: [resumo] } = await pool.query(
    `SELECT (SELECT count(*)::int FROM licenca WHERE status = 'ATIVA' AND portal_id = 0) AS licencas,
            (SELECT count(*)::int FROM pedido WHERE status = 'PAGO') AS pedidos,
            (SELECT count(*)::int FROM resposta) AS respostas,
            (SELECT count(*)::int FROM progresso_aula WHERE concluida) AS concluidas`);
  passo(resumo.pedidos >= 3 && resumo.respostas > 0,
    `retaguarda: ${resumo.licencas} licenças ativas, ${resumo.pedidos} pedidos pagos, `
    + `${resumo.concluidas} aulas concluídas, ${resumo.respostas} respostas`);

  const { rows: [vitrine] } = await pool.query(
    `SELECT count(*)::int AS vendas, coalesce(sum(pe.centavos), 0)::int AS total
       FROM pedido pe WHERE pe.status = 'PAGO' AND pe.materia_portal_id <> 0`);
  passo(vitrine.vendas >= 1,
    `professor parceiro: ${vitrine.vendas} venda(s) pela nossa vitrine, a apurar como comissão`);
} catch (err) {
  passo(false, `erro: ${err.message}`);
}

await fim(b);
