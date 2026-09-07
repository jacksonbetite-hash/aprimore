-- =====================================================================
-- A cota do teste gratuito, recalibrada — §6.1.
--
-- O discovery é explícito: o teste de 7 dias libera "cerca de 20% das
-- aulas", e a tela de planos promete isso com todas as letras. Com a 2ª
-- onda de conteúdo (db/036, db/037), a marcação `no_trial` foi caindo
-- em quase toda aula nova, e a conta virou outra: Introdução ao Direito
-- passou a entregar 6 das 7 aulas no teste, e Constitucional 5 de 7.
--
-- Isso não é um detalhe de configuração. É o paywall inteiro: quem testa
-- termina o curso dentro dos 7 dias e não tem por que assinar. Pior, a
-- tela continua dizendo "cerca de 20%", o que passa a ser propaganda
-- errada da própria oferta.
--
-- A regra que este arquivo aplica, por matéria:
--
--   * amostra gratuita continua aberta a qualquer visitante, sem
--     cadastro — é a isca de topo de funil, e não sai daqui;
--   * o teste acrescenta, no máximo, UMA aula além das amostras em
--     matéria pequena, e DUAS em matéria com cinco ou mais aulas.
--
-- Toda aula de amostra continua marcada como `no_trial`: seria estranho
-- que o teste "fechasse" uma aula que o visitante anônimo já vê.
-- =====================================================================

-- Ponto de partida: nada no teste, exceto o que é amostra aberta.
UPDATE aula SET no_trial = amostra_gratuita, atualizada_em = now()
WHERE portal_id = 0;

-- Introdução ao Direito — 7 publicadas, 2 de amostra. O teste ganha as
-- duas aulas que fecham o raciocínio da primeira: o que é norma e de
-- onde ela vem.
UPDATE aula SET no_trial = true, atualizada_em = now()
WHERE portal_id = 0 AND slug IN ('o-que-e-norma-juridica', 'fontes-do-direito');

-- Noções de Direito Constitucional — 7 publicadas, 3 de amostra. O teste
-- ganha as duas que mais vendem o curso: poder constituinte e cláusulas
-- pétreas.
UPDATE aula SET no_trial = true, atualizada_em = now()
WHERE portal_id = 0 AND slug IN ('poder-constituinte', 'clausulas-petreas');

-- Teoria Geral do Processo — 2 publicadas, 1 de amostra. A segunda aula
-- sai do teste: com duas aulas, incluir a segunda é liberar o curso.
-- (nada a fazer: o UPDATE inicial já a tirou)

-- Matérias de uma aula só (Carreiras, Consumidor, Trabalho) ficam apenas
-- com a amostra: não há 20% de uma aula.

-- Conferência: o que o TESTE acrescenta além das amostras não passa de
-- um quarto do acervo da matéria.
--
-- Conta-se o acréscimo, e não o total acessível, porque a amostra já é
-- pública para qualquer visitante: incluí-la no teto puniria a matéria
-- por ter feito o que o §6.1 manda (abrir a 1ª aula de cada assunto).
DO $$
DECLARE folgada RECORD;
BEGIN
  FOR folgada IN
    SELECT m.slug,
           count(*) FILTER (WHERE a.no_trial AND NOT a.amostra_gratuita) AS acrescimo,
           count(*) AS total
      FROM aula a JOIN assunto s ON s.id = a.assunto_id JOIN materia m ON m.id = s.materia_id
     WHERE a.portal_id = 0 AND a.status = 'publicado'
     GROUP BY m.slug
    HAVING count(*) FILTER (WHERE a.no_trial AND NOT a.amostra_gratuita)
           > greatest(1, ceil(count(*) * 0.25))
  LOOP
    RAISE EXCEPTION 'o teste acrescenta % aula(s) em % (acervo de %) — acima de um quarto',
      folgada.acrescimo, folgada.slug, folgada.total;
  END LOOP;
END $$;
