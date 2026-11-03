-- =====================================================================
-- Conteúdo de demonstração — portal do professor "Prof. Otávio Lins"
-- (máscara: otaviolins). Curso "Direito Administrativo para concursos".
--
-- NÃO é migração. A área, a matéria (slug gerado pela aplicação:
-- direito-administrativo-para-concursos), o assunto (estrutura-da-
-- administracao-publica) e a AULA 1 são criados pela interface, a partir
-- de scripts/demo/professor-otaviolins-administrativo-aula-1.json.
-- Este arquivo só ADICIONA a segunda aula desse assunto.
--
-- Uso (depois de a interface criar o curso):
--   docker exec -i aprimore-db-1 psql -U aprimore -d aprimoreosaber \
--     -v ON_ERROR_STOP=1 < scripts/demo/professor-otaviolins-administrativo-aula-2.sql
--
-- Vídeo (provedor LOCAL): otaviolins-adm-parte-2.mp4 — trecho 6:00-12:00
-- de "Saber Direito Aula - Direito Administrativo - Estrutura da
-- Administração - Aula 1", canal Saber Direito (CC BY).
-- =====================================================================

-- ---------- Aula 2 ----------
INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
SELECT p.id,
  (SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id
    WHERE m.slug = 'direito-administrativo-para-concursos'
      AND s.slug = 'estrutura-da-administracao-publica'
      AND m.portal_id = p.id),
  'estrutura-da-administracao-publica-parte-2', 'Estrutura da Administração Pública (parte 2)', 360,
$r$Por que estudar a estrutura da Administração? Porque a Administração de hoje faz de tudo: educa, cuida da saúde, administra presídios, presta serviços públicos de toda ordem e chega a organizar uma Olimpíada, como o Rio de Janeiro fez em 2016. Para dar conta disso ela usa muitos negócios jurídicos e muitas estruturas diferentes — e é por isso que, na vida real, fica difícil saber com quem você está falando. Conhecer a estrutura serve exatamente para identificar a que órgão ou entidade levar o seu problema, pessoal ou profissional.

A pergunta de partida é: o que é administrar? No sentido comum, administrar é gerir bens, interesses ou recursos de outra pessoa. Uma administradora de imóveis cuida de um apartamento que não é dela. A Administração Pública faz a mesma coisa, só que o dono é a coletividade: ela gere bens, direitos e interesses de toda a sociedade brasileira. E interesses coletivos, às vezes, entram em rota de colisão uns com os outros — a mesma sociedade quer mais escolas e menos impostos.

Dessa ideia de gestão de interesse alheio nascem características que a administração de uma empresa privada não tem. Se o interesse é da coletividade, o gestor não pode dispor dele como se fosse seu: é a indisponibilidade do interesse público, e o seu par, a supremacia do interesse público sobre o privado. E como a Constituição atribui certos serviços ao Estado, eles não podem parar: é o princípio da continuidade dos serviços públicos. Para honrar esses compromissos, a Administração precisa se estruturar de maneira adequada.

A Constituição dá as balizas dessa estruturação. O art. 1º diz que a República é um Estado Democrático de Direito. Democrático, na expressão de Norberto Bobbio, é o governo em público: decisões visíveis, que todos podem conhecer — o que se traduz no princípio da publicidade do art. 37. De Direito significa que a Administração determina condutas pela lei, mas também se subordina a ela: é o princípio da legalidade, também do art. 37, e no topo dessa subordinação está a própria Constituição.

O segundo elemento constitucional é o federalismo. A República Federativa do Brasil é formada pela União, pelos Estados, pelo Distrito Federal e pelos Municípios (art. 18), todos autônomos. Isso significa que não existe uma única Administração Pública, e sim várias, uma para cada ente federado — cada uma com a sua estrutura de órgãos e entidades. É desse ponto que a próxima aula parte para desenhar a moldura constitucional da organização administrativa.

Vídeo: "Saber Direito Aula - Direito Administrativo - Estrutura da Administração - Aula 1", canal Saber Direito (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 6:00 a 12:00.$r$,
  false, true, 'publicado', 2, 'LOCAL', 'otaviolins-adm-parte-2.mp4'
FROM portal p
WHERE p.mascara = 'otaviolins';

-- ---------- Vade-mécum (forma segura) ----------
INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')
   AND a.slug = 'estrutura-da-administracao-publica-parte-2'
   AND n.slug = 'cf-88' AND d.rotulo IN ('Art. 37', 'Art. 1º', 'Art. 18')
ON CONFLICT DO NOTHING;

-- ---------- Exercício ----------
INSERT INTO exercicio (aula_id)
SELECT id FROM aula
 WHERE portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')
   AND slug = 'estrutura-da-administracao-publica-parte-2';

-- ############ Aula: Estrutura da Administração Pública (parte 2) ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'estrutura-da-administracao-publica-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'A aula compara a Administração Pública a uma administradora de imóveis. O que diferencia a primeira da segunda?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A Administração Pública gere bens próprios, e a administradora gere bens de terceiros.', false, 'Errada. As duas gerem interesse alheio. A diferença está em QUEM é o dono: na Administração Pública, é a coletividade.', 1),
 ('A Administração Pública gere interesses da coletividade, que são indisponíveis, e não de um indivíduo determinado.', true, 'Correta. Administrar é gerir bens e interesses de terceiro; na Administração Pública o terceiro é toda a sociedade, e por isso o interesse é indisponível e prevalece sobre o privado.', 2),
 ('A Administração Pública não precisa se subordinar à lei, ao contrário da administradora.', false, 'Errada. É o oposto: a Administração determina condutas pela lei e também se subordina a ela (princípio da legalidade, art. 37 da CF/88).', 3),
 ('Não há diferença relevante entre as duas atividades.', false, 'Errada. A gestão de interesses coletivos atrai características próprias — indisponibilidade, supremacia do interesse público e continuidade — que não existem na gestão privada.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'estrutura-da-administracao-publica-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Os serviços que a Constituição atribui ao Estado não devem ser interrompidos. Esse é o princípio da:', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Supremacia do interesse público.', false, 'Errada. A supremacia diz que o interesse coletivo prevalece sobre o individual em caso de conflito; não trata da não interrupção do serviço.', 1),
 ('Indisponibilidade do interesse público.', false, 'Errada. A indisponibilidade impede o gestor de abrir mão do interesse coletivo como se fosse seu — é ideia vizinha, mas a aula usa outro nome para a não interrupção.', 2),
 ('Continuidade dos serviços públicos.', true, 'Correta. Como os serviços são cometidos ao Estado pela Constituição, eles não podem parar: é o princípio da continuidade, que fundamenta, por exemplo, os limites à greve nos serviços essenciais.', 3),
 ('Publicidade dos atos administrativos.', false, 'Errada. Publicidade (art. 37 da CF/88) é a exigência de que as decisões sejam visíveis e conhecidas por todos — o "governo em público" de Bobbio.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'estrutura-da-administracao-publica-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'certo_errado', 'Julgue: "Ser Estado de Direito significa que a Administração Pública determina condutas por meio da lei, mas não se subordina a ela".', 'Inspirada em prova · Cebraspe', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A segunda parte da frase inverte a aula: a Administração determina condutas pela lei E se subordina a ela, tendo a Constituição no topo dessa subordinação (princípio da legalidade, art. 37 da CF/88).', 1),
 ('Errado', true, 'Certo. Estado de Direito é justamente a submissão do próprio Estado ao Direito. A Administração só pode fazer o que a lei autoriza, e a Constituição é o topo da cadeia.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'estrutura-da-administracao-publica-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'A professora cita Norberto Bobbio para explicar o Estado Democrático como "governo em público". A qual princípio do art. 37 da CF/88 essa ideia corresponde?', 'Autoral', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Eficiência.', false, 'Errada. Eficiência (incluída pela EC 19/1998) diz respeito a resultados com o menor custo; não trata da visibilidade das decisões.', 1),
 ('Publicidade.', true, 'Correta. Governo em público é governo de decisões visíveis, que todos podem conhecer — é o princípio da publicidade do art. 37, caput, da CF/88.', 2),
 ('Impessoalidade.', false, 'Errada. Impessoalidade proíbe favorecimentos e perseguições e veda a promoção pessoal do agente; é outro princípio do mesmo artigo.', 3),
 ('Moralidade.', false, 'Errada. Moralidade exige conduta honesta e proba do administrador; a ideia de Bobbio é sobre transparência das decisões, não sobre honestidade.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'estrutura-da-administracao-publica-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Segundo a aula e o art. 18 da CF/88, a organização político-administrativa da República Federativa do Brasil compreende:', 'Autoral · OAB', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A União, os Estados e o Distrito Federal, apenas.', false, 'Errada. Faltam os Municípios, que a CF/88 elevou à condição de entes federados autônomos — uma peculiaridade do federalismo brasileiro.', 1),
 ('A União, os Estados, o Distrito Federal e os Municípios, todos autônomos.', true, 'Correta. É a redação do art. 18 da CF/88. Cada ente tem a sua própria Administração Pública, com órgãos e entidades próprios.', 2),
 ('A União, os Estados e as regiões metropolitanas.', false, 'Errada. Região metropolitana é agrupamento de Municípios criado por lei complementar estadual (art. 25, § 3º); não é ente federado.', 3),
 ('A União e os Estados, sendo os Municípios meras divisões administrativas dos Estados.', false, 'Errada. Antes de 1988 havia debate sobre isso; hoje o Município é ente federado com autonomia política, administrativa e financeira (arts. 18, 29 e 30 da CF/88).', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'estrutura-da-administracao-publica-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Para a professora, qual é a utilidade prática de estudar a estrutura da Administração Pública?', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Decorar o organograma do Governo Federal para a prova.', false, 'Errada. A aula insiste que o importante é entender a racionalidade da organização, não decorar organogramas ou o teor de artigos.', 1),
 ('Saber identificar com que órgão ou entidade se deve tratar um problema pessoal ou profissional.', true, 'Correta. Como a Administração usa muitas estruturas para atividades muito diversas, conhecer a estrutura é saber a quem levar a demanda.', 2),
 ('Reduzir o tamanho do Estado ao modelo de guarda-noturno.', false, 'Errada. O Estado guarda-noturno é a referência histórica de uma Administração enxuta; a aula mostra que hoje o Estado faz muito mais, e não propõe voltar atrás.', 3),
 ('Permitir que o administrador escolha livremente a forma de organizar cada serviço.', false, 'Errada. A aula pergunta justamente se o administrador tem livre escolha — e a resposta passa por critérios constitucionais e legais, não por liberdade plena.', 4)
) AS v(texto, correta, comentario, ordem);
