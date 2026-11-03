-- =====================================================================
-- Conteúdo de demonstração — portal "Tecnologia em pauta"
-- (máscara: tecnologiaempaula), curso "Entendendo a IA".
--
-- NÃO é migração. O portal e o curso já existem, criados pelo professor;
-- este arquivo só dá ao curso o que faltava para ele existir de verdade
-- na página do portal: um ASSUNTO e três AULAS publicadas, cada uma com
-- resumo e exercício comentado.
--
-- As aulas nascem SEM VÍDEO, de propósito. É o professor quem anexa a
-- gravação de cada uma, em Painel do professor → "Vídeos das aulas" —
-- que é justamente a tela onde ele vê, de uma vez, quais aulas ainda
-- estão sem gravação. Aula sem vídeo vai ao ar e serve resumo e
-- exercício; o vídeo entra depois, sem republicar nada.
--
-- Idempotente: apaga o que criou antes de recriar.
--
-- Uso:
--   docker exec -i aprimore-db-1 psql -U aprimore -d aprimoreosaber \
--     -v ON_ERROR_STOP=1 < scripts/demo/professor-tecnologiaempaula-ia.sql
-- =====================================================================

\set MASCARA '\'tecnologiaempaula\''
\set CURSO '\'entendendo-a-ia\''
\set ASSUNTO '\'fundamentos-da-ia\''

-- ---------- Limpeza (o roteiro pode rodar de novo) ----------
DELETE FROM assunto s
 USING materia m, portal p
 WHERE s.materia_id = m.id AND m.portal_id = p.id
   AND p.mascara = :MASCARA AND m.slug = :CURSO AND s.slug = :ASSUNTO;
-- aula, exercicio, questao e alternativa saem em cascata pelo assunto.

-- ---------- Assunto ----------
INSERT INTO assunto (portal_id, materia_id, slug, nome, ordem)
SELECT p.id, m.id, :ASSUNTO, 'Fundamentos da IA', 1
  FROM portal p JOIN materia m ON m.portal_id = p.id
 WHERE p.mascara = :MASCARA AND m.slug = :CURSO;

-- ---------- Aula 1 ----------
INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo,
                  amostra_gratuita, no_trial, status, ordem)
SELECT p.id, s.id, 'o-que-e-inteligencia-artificial',
  'O que é inteligência artificial, afinal', 480,
$r$Inteligência artificial não é um programa que "pensa". É um programa que aprende a associar entradas a saídas a partir de exemplos, em vez de seguir regras que alguém escreveu à mão. A diferença é essa, e ela explica quase tudo o que vem depois.

O software tradicional é uma receita: se o CPF tem 11 dígitos, aceite; senão, recuse. Alguém escreveu a regra, e o programa a executa igual todas as vezes. Um modelo de IA é o contrário: mostramos milhares de exemplos de entrada e resposta certa, e o próprio modelo ajusta seus parâmetros até acertar a maioria. Ninguém escreveu a regra — ela ficou distribuída em números que não se lê como se lê código.

Daí vêm as duas consequências práticas que mais aparecem no dia a dia. A primeira: o modelo é tão bom quanto os exemplos que viu. Dados enviesados produzem respostas enviesadas, e nenhuma correção de código conserta isso — corrige-se com dados. A segunda: o modelo responde por probabilidade, não por certeza. Ele produz a saída mais provável dado o que viu, e "mais provável" às vezes está errado com toda a convicção do mundo.

Três termos que aparecem juntos e não são sinônimos. Inteligência artificial é o campo inteiro. Aprendizado de máquina é o método dominante dentro dele: aprender por exemplos. Aprendizado profundo (redes neurais com muitas camadas) é uma técnica de aprendizado de máquina — a que destravou visão computacional e linguagem na última década.

O que fica desta aula: use IA onde a regra é difícil de escrever e os exemplos são fáceis de juntar. Onde a regra é clara e a resposta precisa ser sempre a mesma, software tradicional continua sendo a escolha certa — mais barato, mais rápido e auditável.$r$,
  true, true, 'publicado', 1
  FROM portal p
  JOIN materia m ON m.portal_id = p.id AND m.slug = :CURSO
  JOIN assunto s ON s.materia_id = m.id AND s.slug = :ASSUNTO
 WHERE p.mascara = :MASCARA;

-- ---------- Aula 2 ----------
INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo,
                  amostra_gratuita, no_trial, status, ordem)
SELECT p.id, s.id, 'como-um-modelo-de-linguagem-responde',
  'Como um modelo de linguagem responde', 540,
$r$Um modelo de linguagem faz uma coisa só: dado um texto, estima qual é o próximo pedaço de texto mais provável. Repetindo isso muitas vezes, sai um parágrafo. Parece pouco para explicar o que ele faz — e é exatamente isso que ele faz.

Para estimar essa probabilidade, o modelo foi treinado sobre um volume enorme de texto e guardou, nos seus parâmetros, regularidades da língua e do mundo descrito por ela. Ele não consulta uma base de dados na hora de responder: o que ele "sabe" está congelado no treinamento, e por isso um modelo tem data de corte de conhecimento.

Três consequências que todo usuário precisa reconhecer. Alucinação: quando o modelo não sabe, ele não se cala — produz a continuação mais plausível, que pode ser uma citação inventada com aparência perfeita. Contexto: o que você escreve no pedido entra na conta, e é a forma mais barata de melhorar a resposta. Não determinismo: a mesma pergunta pode render respostas diferentes, porque há sorteio na escolha de cada pedaço.

Daí a regra de trabalho: peça o que dá para conferir. Peça a fonte, peça o passo a passo, dê o texto de referência dentro do próprio pedido em vez de esperar que ele lembre. E confira toda afirmação que você mesmo não saberia refutar — número, data, nome de norma, citação.

O que fica desta aula: o modelo é excelente para transformar texto que você fornece e arriscado para inventar fato que você não tem como checar. Use-o com a informação por perto, não no lugar dela.$r$,
  false, true, 'publicado', 2
  FROM portal p
  JOIN materia m ON m.portal_id = p.id AND m.slug = :CURSO
  JOIN assunto s ON s.materia_id = m.id AND s.slug = :ASSUNTO
 WHERE p.mascara = :MASCARA;

-- ---------- Aula 3 ----------
INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo,
                  amostra_gratuita, no_trial, status, ordem)
SELECT p.id, s.id, 'ia-no-trabalho-o-que-delegar',
  'IA no trabalho: o que delegar e o que não', 600,
$r$A pergunta útil não é "a IA vai substituir a minha profissão", e sim "quais tarefas do meu dia ela faz bem o bastante para eu conferir mais rápido do que faria sozinho". Tarefa, não profissão: é assim que a decisão fica concreta.

Delegue com folga o que é transformação de texto que você já tem: resumir uma reunião que você gravou, reescrever um e-mail em outro tom, extrair itens de um documento, traduzir, comparar duas versões, rascunhar a primeira versão de algo que você vai reescrever de qualquer jeito. Nesses casos a informação vem de você, e o modelo só muda a forma — o erro possível é de estilo, e você o vê de imediato.

Delegue com desconfiança o que exige fato verificável: número, data, valor de norma, jurisprudência, referência bibliográfica. Aqui o modelo erra com aparência de acerto, e o custo do erro é seu. Se usar, peça a fonte e abra a fonte.

Não delegue decisão que exige responsabilidade: diagnosticar, sentenciar, demitir, aprovar crédito, orientar juridicamente um caso concreto. Não é uma questão técnica — é que a responsabilidade continua com você, e ela não se transfere para um fornecedor de software.

Some a isso três cuidados de higiene: não coloque dado sensível de terceiro numa ferramenta que você não sabe onde guarda o que recebe; combine com a sua equipe o que pode e o que não pode ser colado ali; e diga quando um material foi produzido com apoio de IA, se ele vai ao público. O que fica desta aula é um critério, não uma lista: quanto mais fácil for conferir o resultado, mais seguro é delegar.$r$,
  false, false, 'publicado', 3
  FROM portal p
  JOIN materia m ON m.portal_id = p.id AND m.slug = :CURSO
  JOIN assunto s ON s.materia_id = m.id AND s.slug = :ASSUNTO
 WHERE p.mascara = :MASCARA;

-- ---------- Exercícios (§5.3: toda aula termina em exercício) ----------
INSERT INTO exercicio (aula_id)
SELECT a.id FROM aula a JOIN assunto s ON s.id = a.assunto_id
  JOIN materia m ON m.id = s.materia_id JOIN portal p ON p.id = m.portal_id
 WHERE p.mascara = :MASCARA AND m.slug = :CURSO AND s.slug = :ASSUNTO;

-- ############ Aula 1 ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  SELECT e.id, 'multipla_escolha',
    'Qual é a diferença central entre um programa tradicional e um modelo de aprendizado de máquina?',
    'Autoral', 'introdutorio', 1
    FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
   WHERE p.mascara = :MASCARA AND a.slug = 'o-que-e-inteligencia-artificial'
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O modelo executa regras escritas por um programador, só que mais rápido.', false,
  'Errada. Executar regra escrita à mão é o que faz o software tradicional. O modelo não recebe a regra pronta.', 1),
 ('O modelo ajusta os próprios parâmetros a partir de exemplos, em vez de seguir regras escritas à mão.', true,
  'Correta. É a definição prática de aprendizado de máquina — e o que explica tanto o poder quanto os limites da técnica.', 2),
 ('O modelo consulta a internet a cada resposta para descobrir a regra certa.', false,
  'Errada. Consultar fonte externa é um recurso que se acopla depois; não é o que define o aprendizado.', 3),
 ('Não há diferença real: os dois são o mesmo tipo de programa.', false,
  'Errada. A diferença é grande e prática: um é auditável linha a linha, o outro responde por probabilidade a partir do que viu.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  SELECT e.id, 'multipla_escolha',
    'Um modelo passou a recusar mais candidatos de um certo perfil. A causa mais provável está em quê?',
    'Autoral', 'introdutorio', 2
    FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
   WHERE p.mascara = :MASCARA AND a.slug = 'o-que-e-inteligencia-artificial'
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Nos dados de exemplo com que ele foi treinado.', true,
  'Correta. O modelo aprende o que os exemplos mostram, inclusive o viés que estava neles. Conserta-se com dados, não com remendo no código.', 1),
 ('Numa linha de código escrita errada.', false,
  'Errada. A regra não está escrita em lugar nenhum: ela está distribuída nos parâmetros aprendidos.', 2),
 ('Na velocidade do servidor.', false,
  'Errada. Infraestrutura muda o tempo de resposta, não o conteúdo do que o modelo aprendeu.', 3),
 ('No navegador de quem usa o sistema.', false,
  'Errada. O comportamento vem do modelo e dos seus dados, não do cliente que exibe a resposta.', 4)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula 2 ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  SELECT e.id, 'multipla_escolha',
    'O modelo citou um artigo de lei que não existe, com número e redação convincentes. Como se chama isso e o que fazer?',
    'Autoral', 'introdutorio', 1
    FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
   WHERE p.mascara = :MASCARA AND a.slug = 'como-um-modelo-de-linguagem-responde'
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Alucinação: o modelo produz a continuação mais plausível quando não sabe, e cabe a quem usa conferir na fonte.', true,
  'Correta. Ele não tem como sinalizar "não sei" por padrão: devolve o texto mais provável. Toda citação verificável precisa ser aberta na fonte.', 1),
 ('Defeito do servidor, que corrompeu a resposta no caminho.', false,
  'Errada. A resposta chegou íntegra; o problema está no conteúdo gerado, não no transporte.', 2),
 ('Censura do modelo, que trocou a norma de propósito.', false,
  'Errada. Não há intenção: há estimativa de probabilidade sobre o próximo pedaço de texto.', 3),
 ('Erro de digitação do usuário na pergunta.', false,
  'Errada. Uma pergunta mal escrita piora a resposta, mas a citação inventada aparece mesmo com a pergunta perfeita.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  SELECT e.id, 'multipla_escolha',
    'Qual é a forma mais barata e imediata de melhorar a qualidade de uma resposta?',
    'Autoral', 'introdutorio', 2
    FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
   WHERE p.mascara = :MASCARA AND a.slug = 'como-um-modelo-de-linguagem-responde'
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Dar contexto no próprio pedido: o texto de referência, o objetivo e o formato esperado.', true,
  'Correta. O que entra no pedido entra na conta da probabilidade. É o ajuste que custa nada e muda mais o resultado.', 1),
 ('Repetir a mesma pergunta até vir uma resposta melhor.', false,
  'Errada. Há sorteio na geração, então repetir varia a forma — mas não acrescenta a informação que faltava.', 2),
 ('Escrever tudo em letras maiúsculas para dar ênfase.', false,
  'Errada. Ênfase gráfica não substitui informação; o modelo precisa do dado, não do tom.', 3),
 ('Esperar a próxima versão do modelo.', false,
  'Errada. Pode ajudar um dia, mas não é ação sua nem resolve a resposta de hoje.', 4)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula 3 ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  SELECT e.id, 'multipla_escolha',
    'Segundo o critério da aula, qual tarefa é a mais segura para delegar a um modelo de linguagem?',
    'Autoral', 'introdutorio', 1
    FROM exercicio e JOIN aula a ON a.id = e.aula_id JOIN portal p ON p.id = a.portal_id
   WHERE p.mascara = :MASCARA AND a.slug = 'ia-no-trabalho-o-que-delegar'
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Resumir, em tópicos, uma ata de reunião que você mesmo escreveu.', true,
  'Correta. A informação vem de você e o resultado se confere numa lida: é transformação de texto, o uso de menor risco.', 1),
 ('Decidir sozinho quem será desligado na próxima avaliação.', false,
  'Errada. Decisão com responsabilidade não se delega — a responsabilidade continua com quem decide.', 2),
 ('Levantar de memória os cinco últimos acórdãos sobre um tema, sem conferir.', false,
  'Errada. É exatamente o caso em que o erro vem com aparência de acerto. Se usar, abra cada fonte.', 3),
 ('Colar dados pessoais de clientes numa ferramenta qualquer para "organizar".', false,
  'Errada. Antes da utilidade vem a pergunta de onde esse dado vai parar — e a resposta precisa ser conhecida.', 4)
) AS v(texto, correta, comentario, ordem);

-- ---------- Conferência ----------
SELECT m.nome AS curso, count(DISTINCT a.id) AS aulas,
       count(DISTINCT a.id) FILTER (WHERE a.video_id IS NOT NULL) AS com_video,
       count(qs.id) AS questoes
  FROM portal p
  JOIN materia m ON m.portal_id = p.id AND m.slug = :CURSO
  JOIN assunto s ON s.materia_id = m.id AND s.slug = :ASSUNTO
  JOIN aula a ON a.assunto_id = s.id
  LEFT JOIN exercicio e ON e.aula_id = a.id
  LEFT JOIN questao qs ON qs.exercicio_id = e.id
 WHERE p.mascara = :MASCARA
 GROUP BY m.nome;
