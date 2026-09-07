-- =====================================================================
-- Demonstração — universidade corporativa "Grupo Aurora Varejo"
-- Parte 2: trilhas 5 (Liderança de equipes) e 6 (IA no trabalho).
--
-- NÃO é migração. O portal (mascara 'aurora', tipo EMPRESA) é criado
-- pela interface antes de este arquivo rodar; tudo aqui o referencia por
-- (SELECT id FROM portal WHERE mascara = 'aurora').
--
-- Rótulos na tela: trilha = materia, módulo = assunto.
-- Cada aula tem exercício (≥ 5 questões) e cada trilha tem UMA avaliação
-- final (tabela avaliacao, questões com avaliacao_id).
--
-- Rodar:  docker exec -i aprimoreosaber-db-1 psql -U aprimore \
--           -d aprimoreosaber -v ON_ERROR_STOP=1 < scripts/demo/empresa-aurora-2.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Áreas
-- A área "Ferramentas de trabalho" pode já existir se a trilha de Excel
-- (criada pela interface) entrou antes; por isso o INSERT é condicional
-- pelo nome, e a matéria de IA procura a área também pelo nome.
-- ---------------------------------------------------------------------
INSERT INTO area (portal_id, slug, nome, ordem)
SELECT p.id, 'ferramentas', 'Ferramentas de trabalho', 3
  FROM portal p
 WHERE p.mascara = 'aurora'
   AND NOT EXISTS (SELECT 1 FROM area a WHERE a.portal_id = p.id
                     AND (a.slug = 'ferramentas' OR a.nome = 'Ferramentas de trabalho'));

INSERT INTO area (portal_id, slug, nome, ordem)
SELECT p.id, 'lideranca', 'Liderança', 4
  FROM portal p
 WHERE p.mascara = 'aurora'
   AND NOT EXISTS (SELECT 1 FROM area a WHERE a.portal_id = p.id
                     AND (a.slug = 'lideranca' OR a.nome = 'Liderança'));

-- =====================================================================
-- TRILHA 5 — Liderança de equipes
-- =====================================================================
INSERT INTO materia (portal_id, area_id, slug, nome, ementa, onda, status, professor, ordem, na_vitrine_plataforma)
VALUES (
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT a.id FROM area a JOIN portal p ON p.id = a.portal_id
    WHERE p.mascara = 'aurora' AND a.nome = 'Liderança' ORDER BY a.id LIMIT 1),
  'lideranca-de-equipes', 'Liderança de equipes',
  'O que separa um grupo de trabalho de uma equipe de verdade: propósito compartilhado, respeito ao jeito de cada um, conexão, rede de apoio e alegria coletiva — e como o líder cria essas condições na loja, no CD e no escritório.',
  NULL, 'publicado', 'Equipe de Treinamento e Desenvolvimento', 5, false
);

INSERT INTO assunto (portal_id, materia_id, slug, nome, ordem)
VALUES (
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT m.id FROM materia m JOIN portal p ON p.id = m.portal_id
    WHERE p.mascara = 'aurora' AND m.slug = 'lideranca-de-equipes'),
  'trabalho-em-equipe', 'Trabalho em equipe', 1
);

INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
VALUES (
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id JOIN portal p ON p.id = m.portal_id
    WHERE p.mascara = 'aurora' AND m.slug = 'lideranca-de-equipes' AND s.slug = 'trabalho-em-equipe'),
  'cinco-regras-de-ouro-do-trabalho-em-equipe', 'As 5 regras de ouro do trabalho em equipe', 580,
  $$Grupo de trabalho e equipe não são a mesma coisa. Um grupo é gente no mesmo lugar cumprindo tarefas; uma equipe vai além de "estar no mesmo barco, remar na mesma direção e no mesmo ritmo": nela, as pessoas gostam de trabalhar umas com as outras. O vídeo desta aula chama isso de uma magia que se sente no ar — e avisa que refeitório bonito, salário acima do mercado e bônus ajudam, mas não criam essa magia. Ela aparece até em trabalho voluntário sem condição nenhuma, e faz um grupo pequeno entregar mais do que um grupo muito maior.

Regra 1: propósito compartilhado. Todo mundo se conecta com o motivo de a equipe existir — "nós existimos para...". Esse propósito conversa com o que cada pessoa quer para si, com quem ela ama e, muitas vezes, com a vontade de deixar um legado. É daí que nasce o tecido que liga as pessoas. Na Aurora, a equipe de uma loja não existe para "bater meta": existe para que o cliente saia resolvido e volte. A meta é consequência.

Regra 2: cada um pode ser quem é. Numa equipe de verdade, o jeito de um complementa o jeito do outro e forma um todo mais forte. A diversidade é bem-vinda e o acolhimento é total. Quando as pessoas podem ser elas mesmas, trabalham com mais alegria, mais criatividade e mais colaboração — e quem chega tímido, diferente ou de outra área não é tolerado; é incluído.

Regra 3: conexão profunda. As pessoas se conhecem de verdade, brincam entre si, e o nível de brincadeira acompanha o nível de intimidade. Um cuidado que a Aurora acrescenta ao vídeo: a brincadeira só é sinal de conexão quando é de mão dupla e todo mundo se diverte. Se alguém se sente diminuído, não é conexão, é assédio — e para isso existe o canal de denúncia. O sinal mais claro de equipe é o que o vídeo descreve: todos podem brincar entre si, mas ninguém de fora fala mal de um dos nossos. Nesse momento nasce a noção de "somos um só".

Regra 4: rede de apoio. Quando alguém está com dificuldade, todos se mobilizam para ajudar, sem esperar ordem. Não existe mais "ele e eu": se um não está bem, a equipe não está bem. É o "um por todos e todos por um", fruto direto da conexão da regra 3. Exemplo de loja: fila no caixa e reposição atrasada — quem está livre assume o segundo caixa em vez de esperar o supervisor mandar.

Regra 5: a felicidade de um é a felicidade de todos. Quando alguém realiza um sonho ou supera uma dificuldade, a equipe inteira vibra. Isso multiplica as chances de cada pessoa se sentir realizada no trabalho: você fica feliz quando consegue o que quer e também quando o colega consegue. E a reflexão final do vídeo é a tarefa desta trilha: alguém precisa criar as condições para que um grupo vire equipe. Esse alguém pode ser você, com ou sem cargo de liderança.

Vídeo: "Melhore o trabalho em equipe nas empresas com 5 regras de ouro", canal Gilberto de Souza (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$$,
  false, false, 'publicado', 1, 'LOCAL', 'aurora-lideranca-1.mp4'
);

INSERT INTO exercicio (aula_id)
SELECT a.id FROM aula a JOIN portal p ON p.id = a.portal_id
 WHERE p.mascara = 'aurora' AND a.slug = 'cinco-regras-de-ouro-do-trabalho-em-equipe';

-- ############ Exercício: As 5 regras de ouro do trabalho em equipe ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'cinco-regras-de-ouro-do-trabalho-em-equipe'),
    'multipla_escolha', 'Segundo a aula, o que diferencia uma equipe de verdade de um simples grupo de trabalho?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Todos remam na mesma direção, ao mesmo tempo e com a mesma intensidade.', false, 'Errada. Isso descreve um grupo bem alinhado, e o vídeo diz que equipe é mais do que isso: além de remar junto, as pessoas gostam de trabalhar umas com as outras.', 1),
 ('As pessoas gostam de trabalhar umas com as outras e se sentem parte de um só time.', true, 'Correta. É o ingrediente que o vídeo chama de magia: a conexão entre as pessoas, que faz um grupo pequeno entregar mais do que um grupo grande.', 2),
 ('Salário acima do mercado, bônus e um refeitório bonito.', false, 'Errada. Boas condições são bem-vindas, mas o vídeo é claro: elas não criam o espírito de equipe. Ele surge até em trabalho voluntário sem condição nenhuma.', 3),
 ('A existência de um líder formal designado pela empresa.', false, 'Errada. A aula fala em alguém que cria as condições para o grupo virar equipe, e diz que esse alguém pode ser qualquer pessoa, com ou sem cargo.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'cinco-regras-de-ouro-do-trabalho-em-equipe'),
    'multipla_escolha', 'O que significa, na prática, a regra do propósito compartilhado?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Todos assinaram o mesmo contrato de metas no início do ano.', false, 'Errada. Meta assinada é obrigação, não propósito. O propósito responde "para que existimos", e a meta é consequência dele.', 1),
 ('Todos se conectam com o motivo de a equipe existir, e esse motivo conversa com o que cada um quer para si e para quem ama.', true, 'Correta. É exatamente a descrição do vídeo: o propósito é compartilhado quando fala aos anseios de cada pessoa e, muitas vezes, à vontade de deixar um legado.', 2),
 ('O gerente definiu o propósito e comunicou por e-mail para toda a loja.', false, 'Errada. Propósito comunicado não é propósito compartilhado. Compartilhar exige que cada pessoa se conecte com ele, e não apenas o receba.', 3),
 ('A empresa tem missão, visão e valores emoldurados na parede.', false, 'Errada. O quadro na parede pode até ajudar, mas a regra é sobre conexão das pessoas com o motivo de existir da equipe, não sobre o texto exposto.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'cinco-regras-de-ouro-do-trabalho-em-equipe'),
    'multipla_escolha', 'Um vendedor novo, mais tímido, entrou na loja. A equipe o "aceita", mas ele fica de fora das conversas e das decisões do dia. Qual regra de ouro está sendo descumprida?', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Regra 2: cada um pode ser quem é, com acolhimento total.', true, 'Correta. Tolerar não é acolher. A regra 2 diz que o jeito de cada um complementa o dos outros e que a diversidade é bem-vinda; deixar o tímido de fora é o oposto disso.', 1),
 ('Regra 1: propósito compartilhado.', false, 'Errada. O problema descrito não é falta de propósito comum, e sim falta de acolhimento ao jeito de ser do novo colega.', 2),
 ('Regra 5: a felicidade de um é a felicidade de todos.', false, 'Errada. A regra 5 trata de vibrar com a conquista do outro. A situação fala de exclusão no dia a dia, que é tema da regra 2.', 3),
 ('Nenhuma: timidez é um problema que o próprio vendedor precisa resolver.', false, 'Errada. A aula coloca o acolhimento como responsabilidade da equipe, e é quando a pessoa pode ser ela mesma que ela rende mais.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'cinco-regras-de-ouro-do-trabalho-em-equipe'),
    'multipla_escolha', 'Qual das situações abaixo é um exemplo da regra 4, a rede de apoio?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A fila cresce no caixa e a colega que estava livre assume o segundo caixa sem esperar ordem.', true, 'Correta. Rede de apoio é isso: alguém percebe a dificuldade e a turma se mobiliza, porque não existe mais "ele e eu", e sim "nós".', 1),
 ('Um colega anota os erros do outro para apresentar na reunião mensal.', false, 'Errada. Vigiar para cobrar depois é o contrário de apoiar. A rede de apoio age na hora, para ajudar a pessoa a performar melhor.', 2),
 ('O supervisor chama o funcionário com dificuldade para uma conversa individual de cobrança.', false, 'Errada. A cobrança pode ter o seu lugar, mas a regra 4 é sobre a equipe se mobilizar para ajudar, e não sobre o chefe cobrar.', 3),
 ('A equipe espera o gerente redistribuir as tarefas antes de fazer qualquer coisa.', false, 'Errada. Esperar ordem é o comportamento do grupo, não da equipe. Na equipe, a ajuda vem de quem percebe a necessidade.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'cinco-regras-de-ouro-do-trabalho-em-equipe'),
    'certo_errado', 'Julgue: "Segundo a aula, as brincadeiras entre integrantes indicam intimidade; por isso, uma brincadeira vinda de alguém de fora da equipe é recebida da mesma forma."', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A aula diz o oposto: de dentro, todos brincam entre si; quando alguém de fora fala de um dos integrantes, todos se posicionam. É aí que aparece o "somos um só".', 1),
 ('Errado', true, 'Certo. A brincadeira interna é sinal de intimidade, mas a equipe não aceita que gente de fora fale mal de um dos seus. Lembre também do cuidado da Aurora: brincadeira que diminui alguém não é conexão, é assédio.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'cinco-regras-de-ouro-do-trabalho-em-equipe'),
    'certo_errado', 'Julgue: "Para a aula, benefícios, ambiente bonito e salário acima do mercado são o que cria o espírito de equipe."', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O vídeo diz que oferecer boas condições é ótimo, mas não é isso que cria a magia da equipe: ela surge até entre voluntários sem nenhuma condição, dormindo e comendo mal.', 1),
 ('Errado', true, 'Certo. O que cria a equipe são os cinco elementos: propósito compartilhado, poder ser quem é, conexão profunda, rede de apoio e alegria compartilhada. Condições ajudam, mas não substituem isso.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Avaliação final — Liderança de equipes ############
INSERT INTO avaliacao (portal_id, materia_id, titulo, descricao, nota_minima, max_tentativas, embaralhar, status)
VALUES (
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT m.id FROM materia m JOIN portal p ON p.id = m.portal_id
    WHERE p.mascara = 'aurora' AND m.slug = 'lideranca-de-equipes'),
  'Avaliação — Liderança de equipes',
  'Cinco questões sobre as regras de ouro do trabalho em equipe. Nota mínima 70, até três tentativas. Releia o resumo da aula antes de começar.',
  70, 3, true, 'publicado'
);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'lideranca-de-equipes'),
    'multipla_escolha', 'Quais são as cinco regras de ouro do trabalho em equipe apresentadas na trilha?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Propósito compartilhado, cada um pode ser quem é, conexão profunda, rede de apoio e a felicidade de um é a de todos.', true, 'Correta. São exatamente os cinco elementos do vídeo, na ordem em que ele os apresenta.', 1),
 ('Metas claras, bônus por resultado, feedback mensal, hierarquia definida e reuniões semanais.', false, 'Errada. Esses são instrumentos de gestão, e a aula deixa claro que condições e processos não criam, por si, o espírito de equipe.', 2),
 ('Salário justo, refeitório, plano de saúde, ambiente bonito e premiações.', false, 'Errada. O vídeo cita esses itens justamente para dizer que eles não bastam: a magia da equipe surge até onde não há nenhum deles.', 3),
 ('Disciplina, obediência, pontualidade, silêncio e competição interna.', false, 'Errada. Competição interna e silêncio vão contra a conexão profunda e a rede de apoio, que são regras da aula.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'lideranca-de-equipes'),
    'multipla_escolha', 'Por que a aula diz que a regra 5 ("a felicidade de um é a felicidade de todos") é tão importante?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Porque multiplica as chances de cada pessoa se sentir realizada: você vibra com o que conquista e com o que cada colega conquista.', true, 'Correta. É o argumento do vídeo: ser feliz só com a própria conquista é uma chance; ser feliz também com a do colega são muitas.', 1),
 ('Porque a equipe passa a dividir o bônus em partes iguais.', false, 'Errada. A regra é sobre alegria compartilhada, não sobre divisão de premiação.', 2),
 ('Porque ninguém pode comemorar uma conquista sozinho.', false, 'Errada. A regra não proíbe nada; ela descreve o que acontece naturalmente numa equipe de verdade: a conquista de um contagia todos.', 3),
 ('Porque o líder deve premiar apenas resultados coletivos.', false, 'Errada. A aula não trata de política de premiação; trata do vínculo entre as pessoas.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'lideranca-de-equipes'),
    'multipla_escolha', 'Uma gerente de loja quer transformar o seu grupo em uma equipe. Pela ordem apresentada na aula, por onde ela deve começar?', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Pelo propósito compartilhado: é a partir dele que começa a se formar o tecido que conecta as pessoas.', true, 'Correta. O vídeo apresenta o propósito como elemento número um e diz que é a partir dele que o tecido da equipe começa a se criar.', 1),
 ('Reformando o refeitório e pagando um bônus extra.', false, 'Errada. Condições materiais são bem-vindas, mas a aula é explícita: elas não criam o espírito de equipe.', 2),
 ('Contratando só pessoas parecidas entre si, para evitar conflito.', false, 'Errada. Isso contraria a regra 2: a diversidade é bem-vinda, e o jeito de um complementa o do outro.', 3),
 ('Publicando uma norma interna que obriga todos a ajudar todos.', false, 'Errada. A rede de apoio é fruto da conexão entre as pessoas, não de decreto. Ela nasce quando "ele e eu" vira "nós".', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'lideranca-de-equipes'),
    'certo_errado', 'Julgue: "Na aula, a rede de apoio (regra 4) é apresentada como consequência da conexão profunda (regra 3): quando as pessoas se sentem um só organismo, ajudar o outro deixa de ser favor."', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. O vídeo diz que o senso de organismo único é fruto da conexão do elemento 3, e é dele que nasce o "um por todos e todos por um".', 1),
 ('Errado', false, 'Errado. A afirmativa está correta: a aula liga explicitamente a rede de apoio à conexão profunda. Sem vínculo, a ajuda vira obrigação; com vínculo, vira reflexo.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'lideranca-de-equipes'),
    'certo_errado', 'Julgue: "Segundo a aula, uma equipe de verdade só surge em ambientes com boas condições de trabalho e remuneração acima do mercado."', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O vídeo cita justamente o exemplo de voluntários sem nenhuma condição, e ainda assim com a magia da equipe presente.', 1),
 ('Errado', true, 'Certo. A equipe nasce dos cinco elementos, não das condições materiais. Condições boas são um bônus, nunca a causa.', 2)
) AS v(texto, correta, comentario, ordem);

-- =====================================================================
-- TRILHA 6 — Inteligência artificial no trabalho
-- =====================================================================
INSERT INTO materia (portal_id, area_id, slug, nome, ementa, onda, status, professor, ordem, na_vitrine_plataforma)
VALUES (
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT a.id FROM area a JOIN portal p ON p.id = a.portal_id
    WHERE p.mascara = 'aurora' AND a.nome = 'Ferramentas de trabalho' ORDER BY a.id LIMIT 1),
  'ia-no-trabalho', 'Inteligência artificial no trabalho',
  'Os conceitos por trás da inteligência artificial que já chegou ao balcão, ao estoque e ao atendimento: o que é um modelo, como ele aprende com dados, a diferença entre IA, machine learning, data science e deep learning — e o uso responsável dessas ferramentas no varejo.',
  NULL, 'publicado', 'Equipe de Treinamento e Desenvolvimento', 6, false
);

INSERT INTO assunto (portal_id, materia_id, slug, nome, ordem)
VALUES (
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT m.id FROM materia m JOIN portal p ON p.id = m.portal_id
    WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho'),
  'fundamentos-de-ia', 'Fundamentos de IA', 1
);

INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
VALUES
(
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id JOIN portal p ON p.id = m.portal_id
    WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho' AND s.slug = 'fundamentos-de-ia'),
  'o-que-e-essencial-para-treinar-uma-ia', 'O que é essencial para treinar uma IA', 258,
  $$A primeira coisa que esta aula separa é modelo de IA. O modelo — o famoso LLM, modelo de linguagem — é o cérebro: um programa já treinado, que responde ao que você pergunta. A IA é o corpo em volta desse cérebro: o aplicativo que usa o modelo e mais alguns recursos. O modelo não navega na internet nem desenha; quando você pede uma imagem, um modelo próprio de imagem devolve os dados que o programa transforma em figura, e quando pede uma busca, é o programa que consulta a web, lê os resultados e entrega ao modelo para montar a resposta.

O ChatGPT é o exemplo do vídeo: por trás de um chat só, há vários modelos, e o serviço tenta primeiro o modelo menor e mais rápido. Só se ele não der conta é que o modelo maior é chamado. O motivo é prático: o modelo grande é caro e lento, e fornecer o serviço sempre com ele seria inviável. Guarde a ideia, porque vale para qualquer ferramenta de IA que a Aurora contratar: o que está por trás é uma composição de modelos e programas, não uma entidade mágica.

O que é essencial para treinar, então? Duas coisas. Primeira: um modelo pré-treinado como ponto de partida — começar do zero é possível, mas é um caos, exige equipe grande e muito tempo até obter uma resposta satisfatória. Segunda: um conjunto de dados organizado, com objetivo e estratégia definidos. Você vai ensinar o quê? Se não sabe o que vai ensinar e não tem essa estrutura de dados bem definida, esqueça o treinamento.

O grande insight do vídeo é o que interessa ao varejo: o seu sistema pode usar o modelo como cérebro para ficar mais inteligente, substituindo trabalho braçal — tarefas repetitivas em que a pessoa pensa pouco e decide o básico. Na Aurora, é o que já fazemos ao classificar mensagens de clientes por assunto, resumir reclamações longas do SAC e sugerir uma primeira resposta para o atendente revisar.

E aqui entra o uso responsável. Dados de cliente — CPF, endereço, histórico de compras — são dados pessoais protegidos pela Lei Geral de Proteção de Dados (Lei 13.709/2018), e só entram em ferramentas de IA homologadas pela empresa, nunca em contas pessoais ou serviços gratuitos. O modelo erra com a maior confiança, então toda resposta gerada para um cliente passa por revisão humana antes de sair. O que sai pela IA sai em nome da Aurora.

Vídeo: "O que é Essencial para Treinar uma IA?", canal Pisani da ArcH (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$$,
  false, false, 'publicado', 1, 'LOCAL', 'aurora-ia-1.mp4'
),
(
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id JOIN portal p ON p.id = m.portal_id
    WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho' AND s.slug = 'fundamentos-de-ia'),
  'ia-machine-learning-e-data-science', 'IA, machine learning, data science e deep learning: as diferenças', 720,
  $$"Inteligência artificial" virou palavra para tudo, e a aula começa por aí: é um guarda-chuva gigantesco com várias subáreas. Cabem nele o processamento de linguagem natural (interpretar uma frase e construir a resposta — é o que faz um chatbot), o aprendizado de máquina ou machine learning (aprender padrões a partir de dados: liberar ou não um cartão de crédito, decidir se um perfil é um robô, separar spam) e o planejamento e a otimização (achar o melhor caminho num mapa que você não conhece inteiro, como o Waze faz). O alerta do vídeo: quem usa "IA" para qualquer coisa talvez não saiba do que está falando.

Machine learning é explicado com o exemplo do filho pequeno. O pai mostra um cachorro e diz "au au"; mostra outro, "au au"; mostra mais um. Está fornecendo dados com a resposta certa — isso é aprendizado supervisionado. Quando a criança vê um porco pela primeira vez, ela também diz "au au", porque o estimador que ela criou só conhece uma classe. Com mais dados, ela aprende a separar cachorro de porco. Traduzindo: X são os dados (focinho, pelo, tamanho) e Y é a classe; o problema de descobrir Y a partir de X é uma classificação. Máquinas conseguirem fazer isso com dados é coisa muito recente.

Das subáreas, as que mais aparecem no dia a dia são duas: linguagem natural e machine learning. Dentro de machine learning há centenas de algoritmos — maneiras diferentes de estimar se é cachorro ou porco —, e é aí que ficam as redes neurais e o deep learning, termos que o vídeo cita como os que mais aparecem. Deep learning é o aprendizado de máquina feito com redes neurais de muitas camadas, que hoje está por trás dos modelos de linguagem. Data science aparece no vídeo ao lado de data visualization e data engineering, como áreas vizinhas: ciência de dados é o trabalho de tirar respostas de dados, e pode ou não usar machine learning para isso.

Para quem trabalha com dados, marketing ou vendas, a aula aponta três usos concretos. Clusterização: agrupar clientes por perfil de consumo — quem compra mais moda, quem compra mais eletro, quem só vem em promoção. Regressão: estimar um valor, como o preço ideal de um produto; é por isso que o shampoo do marketplace custa R$ 13,37 hoje e R$ 13,42 amanhã — o site está testando o preço que convence mais gente. Classificação: separar em categorias, como o "au au" e o porquinho. O próprio vídeo lembra que essas ferramentas servem para o bem e para o mal, inclusive para empurrar compras.

Na Aurora, machine learning já roda na recomendação de produtos e na previsão de demanda dos centros de distribuição. Os dados de cliente usados nesses modelos seguem a LGPD (Lei 13.709/2018): só a finalidade informada, só o dado necessário. Decisão automatizada que afeta o cliente — o limite do cartão da loja, por exemplo — precisa oferecer revisão, direito garantido pelo art. 20 da LGPD. E chatbot no atendimento se apresenta como assistente virtual, não finge ser gente, e sempre deixa o cliente chegar a uma pessoa. IA acelera o trabalho; a responsabilidade pelo que ela diz continua sendo nossa.

Vídeo: "Qual a diferença entre Inteligência Artificial, Machine Learning, Data Science, Deep Learning, etc?", canal Filipe Deschamps (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 0:00 a 12:00.$$,
  false, false, 'publicado', 2, 'LOCAL', 'aurora-ia-2.mp4'
);

INSERT INTO exercicio (aula_id)
SELECT a.id FROM aula a JOIN portal p ON p.id = a.portal_id
 WHERE p.mascara = 'aurora'
   AND a.slug IN ('o-que-e-essencial-para-treinar-uma-ia', 'ia-machine-learning-e-data-science');

-- ############ Exercício: O que é essencial para treinar uma IA ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'o-que-e-essencial-para-treinar-uma-ia'),
    'multipla_escolha', 'Segundo a aula, qual é a diferença entre o modelo e a IA?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O modelo é o cérebro pré-treinado; a IA é o programa que usa o modelo junto com outros recursos, como busca na web e geração de imagem.', true, 'Correta. É a imagem do vídeo: o modelo é o cérebro e a IA é o corpo que o utiliza, com outros modelos e programas em volta.', 1),
 ('São sinônimos: toda IA é um modelo e todo modelo é uma IA.', false, 'Errada. A aula insiste na diferença justamente porque as pessoas confundem: o ChatGPT (IA) usa vários modelos por trás.', 2),
 ('O modelo é o programa; a IA é o banco de dados que ele consulta.', false, 'Errada. Está invertido. O modelo é o componente que responde; o programa em volta é a IA, e os dados são outra coisa ainda.', 3),
 ('A IA é a versão pequena e rápida; o modelo é a versão grande e lenta.', false, 'Errada. Modelo pequeno e modelo grande são ambos modelos. A escolha entre eles é feita pelo programa, que é a IA.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'o-que-e-essencial-para-treinar-uma-ia'),
    'multipla_escolha', 'Você pede ao ChatGPT que pesquise na internet e responda. O que acontece, de acordo com a aula?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O próprio modelo de linguagem navega pelos sites e lê as páginas.', false, 'Errada. O vídeo é direto: o modelo não vai à internet. Quem busca é o programa em volta dele.', 1),
 ('O programa faz a busca (provavelmente pelo Bing), lê os resultados e os entrega ao modelo, que monta a resposta a partir deles.', true, 'Correta. É exatamente a sequência descrita: busca feita pela IA, resultado apresentado ao modelo, resposta processada com base naquilo.', 2),
 ('O modelo já tem toda a internet decorada e responde de memória.', false, 'Errada. O modelo tem o que aprendeu no treinamento, não a internet ao vivo. Para conteúdo atual, o programa precisa buscar.', 3),
 ('O pedido é recusado, porque IA não acessa a web.', false, 'Errada. A IA (o programa) acessa; o que não acessa é o modelo sozinho. A aula descreve a busca acontecendo normalmente.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'o-que-e-essencial-para-treinar-uma-ia'),
    'multipla_escolha', 'Por que, segundo a aula, os serviços de IA tentam primeiro o modelo menor antes de chamar o maior?', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Porque o modelo maior é caro e lento; ele só é chamado se o menor não resolver a pergunta.', true, 'Correta. O vídeo diz que usar sempre o modelo top seria caro demais para o fornecedor e lento demais para o usuário.', 1),
 ('Porque o modelo menor é sempre mais preciso.', false, 'Errada. O menor é mais rápido e barato, não mais preciso. Se fosse mais preciso, o maior não seria chamado nunca.', 2),
 ('Porque o modelo maior fica reservado para clientes corporativos.', false, 'Errada. A aula não fala em reserva por tipo de cliente; fala em custo e velocidade.', 3),
 ('Porque o usuário não tem como pedir o modelo maior.', false, 'Errada. O vídeo diz que, mesmo quando o usuário escolhe o modelo mais avançado, o serviço tenta o menor primeiro e escala se precisar.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'o-que-e-essencial-para-treinar-uma-ia'),
    'multipla_escolha', 'O que é essencial para começar a treinar uma IA, de acordo com a aula?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Um modelo pré-treinado como ponto de partida e um conjunto de dados organizado, com objetivo e estratégia definidos.', true, 'Correta. São os dois requisitos do vídeo: o modelo já treinado (para não começar do zero) e a estrutura de dados bem definida (para saber o que ensinar).', 1),
 ('Um supercomputador próprio e uma equipe de cientistas.', false, 'Errada. Isso é o que seria necessário para começar do zero, que a aula chama de caos e desaconselha.', 2),
 ('Começar do zero, para ter controle total sobre o que o modelo aprende.', false, 'Errada. O vídeo diz que dá para fazer, mas é muito trabalhoso, exige equipe grande e muito tempo até uma resposta satisfatória.', 3),
 ('Apenas uma boa pergunta, porque o modelo aprende sozinho a partir dela.', false, 'Errada. Perguntar bem ajuda a usar o modelo, mas treinar exige dados organizados e objetivo claro.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'o-que-e-essencial-para-treinar-uma-ia'),
    'certo_errado', 'Julgue: "Segundo a aula, treinar um modelo do zero é a opção recomendada para quem quer respostas satisfatórias em pouco tempo."', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O vídeo diz o contrário: começar do zero é um caos, exige equipe muito grande e muito tempo. O caminho é partir de um modelo pré-treinado.', 1),
 ('Errado', true, 'Certo. A recomendação da aula é usar um modelo já treinado e concentrar o esforço em organizar os dados e definir o objetivo.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'o-que-e-essencial-para-treinar-uma-ia'),
    'certo_errado', 'Julgue: "Na Aurora, é permitido colar a lista de clientes com CPF em uma ferramenta de IA gratuita, na conta pessoal, para ganhar tempo, desde que a resposta seja revisada depois."', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. CPF e histórico de compras são dados pessoais protegidos pela LGPD (Lei 13.709/2018). Só entram em ferramentas homologadas pela empresa; conta pessoal ou serviço gratuito está fora, revisada ou não a resposta.', 1),
 ('Errado', true, 'Certo. A revisão humana é obrigatória, mas não autoriza o vazamento: dado de cliente só em ferramenta homologada pela Aurora, com finalidade definida.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Exercício: IA, machine learning, data science e deep learning ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'ia-machine-learning-e-data-science'),
    'multipla_escolha', 'Segundo a aula, a expressão "inteligência artificial" é mais bem descrita como:', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Um guarda-chuva com várias subáreas, como linguagem natural, machine learning e planejamento/otimização.', true, 'Correta. O vídeo chama a IA de "gigantesca", com várias subcategorias, e cita essas três como exemplos.', 1),
 ('Outro nome para chatbot.', false, 'Errada. Chatbot é uma aplicação de uma das subáreas (processamento de linguagem natural), não a IA inteira.', 2),
 ('Sinônimo exato de deep learning.', false, 'Errada. Deep learning é uma das muitas maneiras de estimar dentro do machine learning, que por sua vez é uma subárea da IA.', 3),
 ('Um único algoritmo que serve para tudo.', false, 'Errada. A aula diz justamente o oposto: quem usa "IA" para qualquer coisa talvez não saiba do que está falando.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'ia-machine-learning-e-data-science'),
    'multipla_escolha', 'No exemplo do "au au", o que caracteriza o aprendizado supervisionado?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O pai mostra vários animais e informa a classe de cada um: "au au", "porquinho".', true, 'Correta. Supervisionar o aprendizado é fornecer os dados junto com a resposta certa, para que o estimador aprenda a separar as classes.', 1),
 ('A criança aprende sozinha, só observando os animais no parque.', false, 'Errada. Sem alguém dizendo qual é a classe, não há supervisão. Aprender só olhando os dados é outro tipo de aprendizado.', 2),
 ('O pai corrige o erro com um castigo.', false, 'Errada. No exemplo, o erro ("au au" para o porco) é corrigido com mais dados rotulados, não com punição.', 3),
 ('A criança decora um dicionário de nomes de animais.', false, 'Errada. O aprendizado do exemplo vem de exemplos repetidos com a resposta certa, não de decorar definições.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'ia-machine-learning-e-data-science'),
    'multipla_escolha', 'O shampoo de um marketplace custa R$ 13,37 hoje e R$ 13,42 amanhã. Pela aula, isso é exemplo de qual uso de machine learning?', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Regressão: estimar um valor, no caso o preço que convence mais gente a comprar.', true, 'Correta. O vídeo usa exatamente esse exemplo para explicar precificação, e diz que estimar valores é regressão.', 1),
 ('Clusterização: agrupar clientes por perfil.', false, 'Errada. Clusterização agrupa pessoas ou coisas parecidas. O exemplo do shampoo é sobre estimar um número (o preço).', 2),
 ('Processamento de linguagem natural.', false, 'Errada. Linguagem natural trata de interpretar e produzir texto ou fala, não de calcular preço.', 3),
 ('Planejamento de rota, como no Waze.', false, 'Errada. Planejamento e otimização de caminho são outra subárea da IA; o exemplo do preço é regressão dentro do machine learning.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'ia-machine-learning-e-data-science'),
    'multipla_escolha', 'O marketing da Aurora quer separar os clientes em perfis: quem compra mais moda, quem compra mais eletro, quem só vem em promoção. Qual técnica a aula associa a isso?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Clusterização.', true, 'Correta. É o caso clássico citado no vídeo: categorizar clientes por tipo de consumo é clusterização, uma área do machine learning.', 1),
 ('Regressão.', false, 'Errada. Regressão estima um valor numérico (preço, demanda). Agrupar clientes parecidos é clusterização.', 2),
 ('Processamento de linguagem natural.', false, 'Errada. Linguagem natural entra quando o dado é texto ou fala; aqui o dado é o histórico de compras.', 3),
 ('Planejamento e otimização.', false, 'Errada. Planejamento é achar o melhor caminho ou a melhor sequência de ações, não agrupar clientes.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'ia-machine-learning-e-data-science'),
    'certo_errado', 'Julgue: "No exemplo da aula, quando a criança vê um porco pela primeira vez e diz au au, o estimador dela errou porque só conhecia a classe cachorro; mais dados rotulados corrigem isso."', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É a explicação do vídeo: o estimador só tinha uma classe, chutou a única que conhecia e passou a acertar depois de ver porquinhos rotulados.', 1),
 ('Errado', false, 'Errado. A afirmativa está correta. O erro inicial e a correção com mais dados são o coração do exemplo de aprendizado supervisionado.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
            WHERE p.mascara = 'aurora' AND a.slug = 'ia-machine-learning-e-data-science'),
    'certo_errado', 'Julgue: "Na Aurora, uma decisão automatizada sobre o limite do cartão da loja não precisa oferecer revisão ao cliente, porque foi tomada por um algoritmo e não por uma pessoa."', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. É justamente o contrário: o art. 20 da LGPD (Lei 13.709/2018) garante ao titular o direito de solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado que afetem seus interesses.', 1),
 ('Errado', true, 'Certo. Decisão automatizada que afeta o cliente exige canal de revisão, por força do art. 20 da LGPD. Na Aurora, o atendente consegue reencaminhar o caso para análise.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Avaliação final — IA no trabalho ############
INSERT INTO avaliacao (portal_id, materia_id, titulo, descricao, nota_minima, max_tentativas, embaralhar, status)
VALUES (
  (SELECT id FROM portal WHERE mascara = 'aurora'),
  (SELECT m.id FROM materia m JOIN portal p ON p.id = m.portal_id
    WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho'),
  'Avaliação — IA no trabalho',
  'Cinco questões cobrindo as duas aulas da trilha: modelo e IA, o que é preciso para treinar, as subáreas da inteligência artificial e o uso responsável no varejo. Nota mínima 70, até três tentativas.',
  70, 3, true, 'publicado'
);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho'),
    'multipla_escolha', 'Uma colega diz que "o ChatGPT é um modelo de linguagem". Pela trilha, qual é a correção mais precisa?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O ChatGPT é uma IA: um programa que usa um ou mais modelos por trás, além de recursos como busca na web e geração de imagem.', true, 'Correta. O modelo é o cérebro; o ChatGPT é o corpo que o usa, escolhendo inclusive entre modelo menor e maior conforme a pergunta.', 1),
 ('Está certa: IA e modelo são a mesma coisa.', false, 'Errada. A primeira aula insiste na distinção: o modelo não navega nem desenha; quem faz isso é o programa em volta dele.', 2),
 ('O ChatGPT é um banco de dados com toda a internet.', false, 'Errada. O modelo tem o que aprendeu no treinamento; para conteúdo atual, o programa faz uma busca e entrega o resultado ao modelo.', 3),
 ('O ChatGPT é apenas um mecanismo de busca.', false, 'Errada. A busca é um dos recursos que a IA aciona quando necessário; a resposta é montada pelo modelo.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho'),
    'multipla_escolha', 'A Aurora quer treinar uma IA para classificar as mensagens do SAC por assunto. Pela trilha, o que é essencial ter antes de começar?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Um modelo pré-treinado como base e um conjunto de mensagens organizado, com os assuntos definidos e um objetivo claro.', true, 'Correta. São os dois requisitos da primeira aula: modelo já treinado (não partir do zero) e dados organizados com objetivo e estratégia.', 1),
 ('Um modelo criado do zero pela própria equipe de TI, para ter controle total.', false, 'Errada. A aula chama isso de caos: equipe grande, muito tempo e resultado demorado. O caminho é partir de um modelo pronto.', 2),
 ('Todas as mensagens do SAC, sem classificação, porque o modelo descobre os assuntos sozinho.', false, 'Errada. Sem estrutura de dados bem definida não há o que ensinar. Você precisa saber o que vai ensinar, e isso exige organização.', 3),
 ('Apenas a assinatura de um serviço de IA gratuito na conta de um funcionário.', false, 'Errada. Além de não resolver o treinamento, mensagens de cliente são dados pessoais e só entram em ferramentas homologadas pela empresa.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho'),
    'multipla_escolha', 'Assinale a associação correta entre problema e técnica, conforme a segunda aula:', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Agrupar clientes por perfil de consumo → clusterização.', true, 'Correta. É o exemplo do vídeo para quem trabalha com marketing ou BI: categorizar clientes parecidos é clusterização.', 1),
 ('Estimar o preço ideal de um produto → processamento de linguagem natural.', false, 'Errada. Estimar valor é regressão. Linguagem natural cuida de texto e fala.', 2),
 ('Interpretar a mensagem de um cliente no chat → regressão.', false, 'Errada. Interpretar frases é processamento de linguagem natural; regressão estima números.', 3),
 ('Separar cachorro de porco a partir de fotos rotuladas → planejamento de rota.', false, 'Errada. Esse é o exemplo de classificação com aprendizado supervisionado; planejamento de rota é outra subárea da IA.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho'),
    'certo_errado', 'Julgue: "Deep learning e redes neurais são, na trilha, apresentados como maneiras de estimar dentro do machine learning, e não como algo separado da inteligência artificial."', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. A segunda aula coloca redes neurais e deep learning entre os muitos algoritmos do machine learning, que por sua vez está dentro do guarda-chuva da IA.', 1),
 ('Errado', false, 'Errado. A afirmativa está correta. Deep learning não é uma coisa à parte: é machine learning feito com redes neurais de muitas camadas.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id JOIN portal p ON p.id = m.portal_id
            WHERE p.mascara = 'aurora' AND m.slug = 'ia-no-trabalho'),
    'certo_errado', 'Julgue: "Ao usar IA no atendimento da Aurora, toda resposta ao cliente passa por revisão humana, dados pessoais só entram em ferramentas homologadas pela empresa e decisões automatizadas que afetam o cliente precisam oferecer revisão."', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. São as três regras de uso responsável da trilha: revisão humana porque o modelo erra, ferramenta homologada por causa da LGPD (Lei 13.709/2018) e direito à revisão de decisão automatizada (art. 20 da LGPD).', 1),
 ('Errado', false, 'Errado. A afirmativa está correta e resume a política da Aurora: a IA acelera o trabalho, mas a responsabilidade pelo que ela diz e decide continua sendo da empresa.', 2)
) AS v(texto, correta, comentario, ordem);
