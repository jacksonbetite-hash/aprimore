-- =====================================================================
-- Vídeo real nas aulas da 1ª onda — e o crédito de quem gravou.
--
-- As nove aulas de db/003 nasceram com resumo autoral e sem gravação; o
-- `semear-video-local.mjs` pendurava nelas o vídeo institucional, que
-- serve para exercitar o player e não para assistir. Agora cada uma
-- recebe um vídeo de verdade, publicado sob licença Creative Commons
-- Atribuição (CC BY), e três coisas passam a bater entre si:
--
--   1. `duracao_segundos` = a duração real do arquivo (o player mostra
--      esse número, e a barra de progresso mede a conclusão por ele);
--   2. `video_id` = o arquivo no volume de mídia;
--   3. o último parágrafo do resumo = o crédito ao autor, que é a
--      condição da licença. Sem ele a reprodução não é permitida — o
--      crédito não é gentileza, é o preço da CC BY.
--
-- `poder-constituinte` fica sem gravação de propósito: não achamos vídeo
-- em licença compatível para o tema, e a página já sabe dizer isso ("a
-- gravação desta aula ainda está em produção") sem parecer defeito.
-- Aula sem vídeo continua servindo resumo, dispositivos e exercício.
-- =====================================================================

-- ---------- 1. Vídeo, duração e crédito ----------

UPDATE aula SET
  duracao_segundos = 561,
  video_provedor = 'LOCAL',
  video_id = 'o-que-e-uma-constituicao.mp4',
  resumo = resumo || E'\n\nVídeo: "CLASSIFICAÇÃO das CONSTITUIÇÕES: a maioria esquece disso e leva bomba", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.',
  atualizada_em = now()
WHERE portal_id = 0 AND slug = 'o-que-e-uma-constituicao';

UPDATE aula SET
  duracao_segundos = 525,
  video_provedor = 'LOCAL',
  video_id = 'direitos-fundamentais-na-pratica.mp4',
  resumo = resumo || E'\n\nVídeo: "Cap.3 Ep.1 Direitos e Garantias Fundamentais - Artigo 5º e o Direito à Vida e à Igualdade", canal Superior Tribunal de Justiça (STJ) (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.',
  atualizada_em = now()
WHERE portal_id = 0 AND slug = 'direitos-fundamentais-na-pratica';

UPDATE aula SET
  duracao_segundos = 370,
  video_provedor = 'LOCAL',
  video_id = 'clausulas-petreas.mp4',
  resumo = resumo || E'\n\nVídeo: "CLÁUSULAS PÉTREAS: O QUE SÃO E PARA QUE SERVEM? | Direito Constitucional", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.',
  atualizada_em = now()
WHERE portal_id = 0 AND slug = 'clausulas-petreas';

UPDATE aula SET
  duracao_segundos = 549,
  video_provedor = 'LOCAL',
  video_id = 'remedios-constitucionais.mp4',
  resumo = resumo || E'\n\nVídeo: "MANDADO DE SEGURANÇA: Resumo Simples, Rápido e Completo | Direito Constitucional OAB", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. A aula em vídeo aprofunda o mandado de segurança; os demais remédios estão no resumo acima.',
  atualizada_em = now()
WHERE portal_id = 0 AND slug = 'remedios-constitucionais';

UPDATE aula SET
  duracao_segundos = 650,
  video_provedor = 'LOCAL',
  video_id = 'separacao-dos-poderes.mp4',
  resumo = resumo || E'\n\nVídeo: "ATIVISMO JUDICIAL: existe “Juiz Herói”? Até onde pode ir o Poder Judiciário? | Judicialização", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. O vídeo trata dos limites entre os Poderes na prática — o outro lado da moeda dos freios e contrapesos explicados acima.',
  atualizada_em = now()
WHERE portal_id = 0 AND slug = 'separacao-dos-poderes';

UPDATE aula SET
  duracao_segundos = 419,
  video_provedor = 'LOCAL',
  video_id = 'o-que-e-norma-juridica.mp4',
  resumo = resumo || E'\n\nVídeo: "TEORIA TRIDIMENSIONAL DO DIREITO (Miguel Reale) | Fato, Valor e Norma (explicação simples)", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. A teoria tridimensional mostra de onde a norma vem: do fato social, filtrado por um valor, e transformado em regra.',
  atualizada_em = now()
WHERE portal_id = 0 AND slug = 'o-que-e-norma-juridica';

UPDATE aula SET
  duracao_segundos = 359,
  video_provedor = 'LOCAL',
  video_id = 'juiz-promotor-defensor.mp4',
  resumo = resumo || E'\n\nVídeo: "O que faz cada profissional do DIREITO? Tudo sobre Carreiras Jurídicas! Juiz, Promotor, Delegado etc", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.',
  atualizada_em = now()
WHERE portal_id = 0 AND slug = 'juiz-promotor-defensor';

-- Sem vídeo em licença compatível: a coluna volta a NULL, e a página diz
-- que a gravação está em produção. Melhor que apontar para um arquivo que
-- não existe — isso o player mostra como erro, e erro parece defeito.
UPDATE aula SET
  video_provedor = NULL, video_id = NULL, atualizada_em = now()
WHERE portal_id = 0 AND slug = 'poder-constituinte';

-- ---------- 2. Fontes do Direito: exercício e publicação ----------
--
-- A aula estava pronta em texto e travada em 'aprovado' desde db/006,
-- porque §5.3 não deixa publicar aula sem exercício — regra que agora a
-- aplicação também cobra (lib/admin-cursos.ts). Com as cinco questões
-- abaixo ela vai ao ar.

UPDATE aula SET
  duracao_segundos = 287,
  video_provedor = 'LOCAL',
  video_id = 'fontes-do-direito.mp4',
  resumo = resumo || E'\n\nVídeo: "FONTES DO DIREITO: Fonte Material e Formal | Primária e Secundária (Explicação FÁCIL e RÁPIDA)", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.',
  atualizada_em = now()
WHERE portal_id = 0 AND slug = 'fontes-do-direito';

INSERT INTO exercicio (aula_id)
SELECT id FROM aula WHERE portal_id = 0 AND slug = 'fontes-do-direito'
ON CONFLICT (aula_id) DO NOTHING;

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id
            WHERE a.slug = 'fontes-do-direito' AND a.portal_id = 0),
    'multipla_escolha', 'A diferença entre fonte material e fonte formal do Direito é que:',
    'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A material é a lei escrita; a formal é o costume.', false, 'Errada. As duas são formais: lei e costume são lugares por onde a norma se manifesta. A confusão é frequente porque "material" soa como "escrito".', 0),
 ('A material é o fato social que provoca a norma; a formal é o lugar por onde ela se manifesta.', true, 'Correta. A pressão para regular o trabalho por aplicativo é fonte material; a lei que sair disso é fonte formal.', 1),
 ('A material vale no Brasil; a formal, só em países de common law.', false, 'Errada. A distinção não é geográfica: os dois conceitos valem em qualquer sistema, inclusive no de tradição romano-germânica que é o nosso.', 2),
 ('A material obriga; a formal é apenas orientativa.', false, 'Errada. Quem obriga é a norma, e ela se manifesta por uma fonte formal. A fonte material é a causa social, não um comando.', 3)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id
            WHERE a.slug = 'fontes-do-direito' AND a.portal_id = 0),
    'multipla_escolha', 'No sistema jurídico brasileiro, a fonte formal PRINCIPAL é:',
    'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O costume.', false, 'Errada. O costume é fonte, mas subsidiária: ele entra onde a lei é omissa (LINDB, art. 4º), e não antes dela.', 0),
 ('A lei.', true, 'Correta. Somos de tradição romano-germânica: o texto escrito vem primeiro, e as demais fontes o complementam.', 1),
 ('A doutrina.', false, 'Errada. A doutrina influencia a interpretação e a produção legislativa, mas não obriga ninguém por si só.', 2),
 ('O precedente judicial, como no direito norte-americano.', false, 'Errada. O precedente ganhou peso no CPC/2015 e na súmula vinculante, mas o sistema continua tendo a lei como fonte principal — isso é o que separa a nossa tradição da do common law.', 3)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id
            WHERE a.slug = 'fontes-do-direito' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "a súmula vinculante do STF obriga a Administração Pública e os demais órgãos do Judiciário".',
    'Inspirada em prova · Cebraspe', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É o art. 103-A da CF/88: aprovada por dois terços dos ministros, a súmula vinculante obriga os demais órgãos do Judiciário e a Administração Pública direta e indireta, em todas as esferas.', 0),
 ('Errado', false, 'Errado. Ela obriga sim — é justamente o que a separa da súmula comum, que apenas orienta. Quem descumpre desafia reclamação direta ao STF.', 1)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id
            WHERE a.slug = 'fontes-do-direito' AND a.portal_id = 0),
    'multipla_escolha', 'Diante da omissão da lei, o juiz deve decidir. Segundo a LINDB, ele recorre a:',
    'Autoral · OAB', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Nada: sem lei, ele extingue o processo.', false, 'Errada. O juiz não pode se eximir de decidir alegando lacuna — é a vedação ao non liquet. A LINDB existe exatamente para essa hora.', 0),
 ('Analogia, costumes e princípios gerais de direito.', true, 'Correta. É o art. 4º da LINDB, nessa ordem. As três são fontes que entram quando a lei cala.', 1),
 ('Apenas à equidade, decidindo pelo que lhe parecer justo.', false, 'Errada. A equidade é excepcional e depende de previsão legal (CPC, art. 140, parágrafo único) — não é a porta de entrada da lacuna.', 2),
 ('À doutrina majoritária, que passa a ter força de lei.', false, 'Errada. A doutrina orienta a interpretação, mas não vira norma obrigatória por ser majoritária.', 3)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id
            WHERE a.slug = 'fontes-do-direito' AND a.portal_id = 0),
    'multipla_escolha', 'O que caracteriza o costume como fonte do Direito?',
    'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Qualquer hábito repetido por um grupo social.', false, 'Errada. Falta o elemento que transforma hábito em norma: a convicção de que aquilo é obrigatório. Sem ela, é etiqueta, não Direito.', 0),
 ('A prática reiterada acompanhada da convicção de sua obrigatoriedade.', true, 'Correta. São os dois elementos clássicos: o objetivo (a repetição) e o subjetivo (a opinio iuris, a convicção de obrigatoriedade).', 1),
 ('A prática que o Legislativo transformou em lei.', false, 'Errada. Virando lei, ela deixa de valer como costume e passa a valer como lei — a fonte muda.', 2),
 ('A decisão repetida dos tribunais sobre um mesmo tema.', false, 'Errada. Isso é jurisprudência, outra fonte. O costume nasce da prática social, não da atividade judicial.', 3)
) AS v(texto, correta, comentario, ordem);

UPDATE aula SET status = 'publicado', atualizada_em = now()
WHERE portal_id = 0 AND slug = 'fontes-do-direito';

-- Dispositivos citados na aula, na forma segura (não falha se o artigo
-- ainda não estiver no acervo).
INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'fontes-do-direito'
   AND n.slug = 'lindb' AND d.rotulo IN ('Art. 4º', 'Art. 5º')
ON CONFLICT DO NOTHING;

INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'fontes-do-direito'
   AND n.slug = 'cf-88' AND d.rotulo IN ('Art. 103-A')
ON CONFLICT DO NOTHING;
