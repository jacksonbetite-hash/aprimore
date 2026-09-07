-- =====================================================================
-- Onda 2 — Processo, Direito Privado e Trabalho ganham conteúdo (portal 0).
--
-- Até aqui, "Teoria Geral do Processo" e "Direito do Consumidor" eram
-- rascunhos sem assunto, e a área "Trabalho" não tinha matéria nenhuma:
-- três das sete áreas do catálogo apareciam vazias na vitrine. Este seed
-- publica as duas matérias, cria "Noções de Direito do Trabalho" e dá a
-- cada uma o primeiro assunto com aula(s) completa(s), no padrão do §5.3:
-- vídeo local, resumo em parágrafos (o último é a atribuição CC BY),
-- dispositivos vinculados e exercício com no mínimo 5 questões, com
-- comentário em TODAS as alternativas.
--
-- Os vídeos são trechos de aulas publicadas sob Creative Commons
-- Atribuição no YouTube (Me Julga, Instituto Ícone e Saber Direito);
-- os professores da plataforma são fictícios. Tudo referenciado por
-- slug — nada de id fixo. portal_id fica no DEFAULT 0.
-- =====================================================================

-- ############################################################
-- A. Teoria Geral do Processo (área Processo)
-- ############################################################
UPDATE materia
   SET status = 'publicado', onda = 2, professor = 'Prof. Marcos Vilela'
 WHERE slug = 'teoria-geral-do-processo' AND portal_id = 0;

INSERT INTO assunto (materia_id, slug, nome, ordem) VALUES
  ((SELECT id FROM materia WHERE slug = 'teoria-geral-do-processo' AND portal_id = 0),
   'conflito-acao-e-processo', 'Conflito, ação e processo', 1);

INSERT INTO aula (assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id) VALUES
  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id
     WHERE s.slug = 'conflito-acao-e-processo' AND m.slug = 'teoria-geral-do-processo' AND m.portal_id = 0),
   'acao-e-processo-qual-a-diferenca', 'Ação e processo: qual é a diferença?', 98,
   $$Ação e processo andam juntos, mas não são a mesma coisa. Ação é o direito de pedir ao Poder Judiciário que se manifeste sobre um problema: o direito de agir, de bater à porta da Justiça. Processo é o caminho que esse pedido percorre depois que entra: uma sequência lógica e ordenada de atos que serve para esclarecer o conflito e permitir a decisão.

O direito de ação vem antes de qualquer processo. Ele está garantido na Constituição, no art. 5º, XXXV: a lei não excluirá da apreciação do Poder Judiciário lesão ou ameaça a direito. O CPC repete a ideia no art. 3º. Exercer a ação não significa ter razão: quem pede pode ganhar ou perder. A ação garante uma resposta do juiz, não uma resposta favorável; o pedido pode ser julgado procedente ou improcedente, e cada caso é analisado individualmente.

Para exercer a ação, o CPC exige dois requisitos, no art. 17: interesse e legitimidade. Interesse é precisar do Judiciário para resolver o problema (não faz sentido pedir na Justiça o que já se pode obter sem ela). Legitimidade é ser a pessoa certa para pedir; em regra, o próprio titular do direito discutido.

O processo, por sua vez, é a sequência de atos. O roteiro clássico: o autor apresenta a petição inicial; o réu é citado e oferece contestação, em que se defende e explica seu ponto de vista; o autor pode apresentar réplica para rebater os argumentos do réu; o juiz pode determinar que as partes tragam mais provas ou marcar audiência para ouvir testemunhas; e, ao final, profere a sentença, dizendo se o pedido do autor é procedente ou não. Cada ato prepara o seguinte, e é essa ordenação que dá segurança às partes.

O art. 2º do CPC resume a relação entre os dois conceitos: o processo começa por iniciativa da parte (é a ação sendo exercida) e se desenvolve por impulso oficial (é o juiz conduzindo a sequência de atos). A parte abre a porta; o juiz caminha pelo corredor.

Um terceiro termo costuma aparecer junto: procedimento. Processo é a relação jurídica que se forma entre autor, réu e juiz; procedimento é o rito, a forma concreta como os atos se encadeiam (procedimento comum, procedimento dos Juizados Especiais, procedimentos especiais). O mesmo processo pode seguir procedimentos diferentes conforme a lei mandar.

Vídeo: "Qual é a diferença entre AÇÃO e PROCESSO?", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$$,
   true, true, 'publicado', 1, 'LOCAL', 'acao-e-processo-qual-a-diferenca.mp4'),

  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id
     WHERE s.slug = 'conflito-acao-e-processo' AND m.slug = 'teoria-geral-do-processo' AND m.portal_id = 0),
   'teoria-geral-do-processo-primeira-aula', 'Teoria Geral do Processo: por onde tudo começa', 720,
   $$A Teoria Geral do Processo é a porta de entrada do Direito Processual. Ela estuda os conceitos que valem para qualquer processo (civil, penal ou trabalhista) e gira em torno de três ideias: jurisdição (o poder do Estado de dizer o direito no caso concreto), ação (o direito de provocar essa atividade) e processo (a sequência ordenada de atos pela qual a jurisdição é exercida). Esta aula abre a matéria pelos princípios que sustentam esse sistema.

Os dois pilares são a legalidade e o devido processo legal, ambos no art. 5º da CF/88. A legalidade (inciso II) exige que exista lei prévia regulando a jurisdição, a ação e o processo, e também os direitos e garantias das partes e de seus procuradores. O devido processo legal (inciso LIV) diz que ninguém será privado da liberdade ou de seus bens sem um processo previamente regulado por lei: regras para quem pede (o autor), para quem julga (o juiz) e para quem resiste (o réu), sem surpresas nem arbitrariedades. A garantia tem raízes históricas na proteção do patrimônio e da liberdade, os dois bens que o processo mais toca.

O contraditório (art. 5º, LV) é a garantia de que a toda ação corresponde uma oportunidade de reação: o que o autor traz ao processo é submetido ao réu, e o que o réu apresenta (contestação, preliminares, documentos) volta ao autor para manifestação. O contraditório também se estabelece entre o juiz e as partes: quando o juiz submete o laudo pericial a elas antes de decidir, está garantindo que ninguém seja surpreendido por uma decisão sobre a qual não pôde falar.

O direito de defesa existe no processo civil, mas com intensidade menor que no processo penal, em que a ampla defesa é levada mais a fundo. No processo civil a defesa é um direito disponível: o réu pode contestar e, na mesma peça, apresentar reconvenção, mas não é obrigado. Se não o fizer, sofre os efeitos da revelia, presumindo-se verdadeiras as alegações de fato do autor (art. 344 do CPC). A exceção são os direitos indisponíveis e as situações em que o juiz nomeia curador especial para defender quem não se defendeu (art. 72 do CPC). Atenção: o vídeo cita o art. 297, numeração do CPC de 1973; no CPC de 2015, a contestação está no art. 335 e a reconvenção no art. 343, e as antigas exceções autônomas deixaram de existir.

O duplo grau de jurisdição é princípio constitucional apenas implícito. A Constituição não diz que toda pessoa tem direito a recorrer; o que ela faz, no art. 92, é organizar o Judiciário em juízes e tribunais, o que pressupõe a possibilidade de revisão das decisões. Por isso o legislador ordinário pode limitá-lo: a Lei 9.099/95, dos Juizados Especiais, não admite recurso contra decisões interlocutórias, e isso não fere a Constituição.

Por fim, a celeridade, ou duração razoável do processo, está no art. 5º, LXXVIII, inserido pela Emenda Constitucional 45/2004: a todos são assegurados a razoável duração do processo e os meios que garantam a celeridade de sua tramitação. Razoável não é rápido a qualquer custo: é o tempo necessário para respeitar as garantias das partes, sem demoras que esvaziem o direito.

Vídeo: "Aula 01: Teoria Geral do Processo I - Prof. Heitor Guimarães Miranda", canal Instituto Ícone (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 0:00 a 12:00.$$,
   false, true, 'publicado', 2, 'LOCAL', 'teoria-geral-do-processo-primeira-aula.mp4');

-- ############################################################
-- B. Direito do Consumidor (área Direito Privado)
-- ############################################################
UPDATE materia
   SET status = 'publicado', onda = 2, professor = 'Prof.ª Letícia Bandeira'
 WHERE slug = 'direito-do-consumidor' AND portal_id = 0;

INSERT INTO assunto (materia_id, slug, nome, ordem) VALUES
  ((SELECT id FROM materia WHERE slug = 'direito-do-consumidor' AND portal_id = 0),
   'relacao-de-consumo', 'A relação de consumo', 1);

INSERT INTO aula (assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id) VALUES
  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id
     WHERE s.slug = 'relacao-de-consumo' AND m.slug = 'direito-do-consumidor' AND m.portal_id = 0),
   'consumidor-e-fornecedor', 'Consumidor e fornecedor: quem é quem na relação de consumo', 720,
   $$Antes de qualquer discussão sobre garantia, propaganda enganosa ou cláusula abusiva, a pergunta que decide tudo é: existe relação de consumo? Se não existe, o Código de Defesa do Consumidor (Lei 8.078/90) simplesmente não se aplica, e o caso vai para o Código Civil ou para outra lei. Por isso a relação de consumo é o eixo do CDC, e ela se forma quando estão presentes, ao mesmo tempo, os seus elementos subjetivos (as pessoas) e objetivos (aquilo que se negocia).

Os elementos subjetivos estão nos arts. 2º e 3º. Consumidor é toda pessoa física ou jurídica que adquire ou utiliza produto ou serviço como destinatário final (art. 2º). Pessoa jurídica também pode ser consumidora; o que importa é a posição de destinatário final: aquele em quem o produto ou serviço se esgota, que não o repassa à cadeia produtiva. Quem compra um refrigerante na hora do almoço é destinatário final; a lanchonete que compra o mesmo refrigerante para revender não é, porque reinsere o bem no mercado.

Fornecedor é toda pessoa física ou jurídica, pública ou privada, nacional ou estrangeira, e também os entes despersonalizados, que desenvolvem atividade de produção, montagem, criação, construção, transformação, importação, exportação, distribuição ou comercialização de produtos ou prestação de serviços (art. 3º). Pessoa física pode ser fornecedora (a manicure autônoma, o mecânico); a pessoa jurídica de direito público também se submete ao CDC quando presta serviços ao consumidor; a empresa estrangeira que negocia com consumidor brasileiro segue as nossas regras; e a massa falida é o exemplo clássico de ente despersonalizado que pode figurar como fornecedor.

Os elementos objetivos são o produto e o serviço. Produto é qualquer bem, móvel ou imóvel, material ou imaterial (art. 3º, §1º): a energia elétrica, embora imaterial, é produto. Serviço é qualquer atividade fornecida no mercado de consumo mediante remuneração, inclusive as de natureza bancária, financeira, de crédito e securitária, salvo as decorrentes das relações de caráter trabalhista (art. 3º, §2º). O corte de cabelo, a depilação, o alinhamento do carro, o plano de saúde, o empréstimo bancário: todos são serviços de consumo.

A razão de existir desse sistema é o desequilíbrio natural da relação: o consumidor é a parte vulnerável (art. 4º, I), e a lei entra para reequilibrar o jogo. É essa vulnerabilidade que justifica os direitos básicos do art. 6º: proteção da vida e da saúde, informação adequada e clara, proteção contra publicidade enganosa e cláusulas abusivas, reparação dos danos e facilitação da defesa em juízo, inclusive com a inversão do ônus da prova.

Um detalhe que cai em prova: a expressão destinatário final gera debate. A teoria finalista exige destinação fática e econômica (consome para si, não como insumo da atividade produtiva); a maximalista se contenta com a retirada do bem do mercado. O STJ adota o finalismo, mas o mitiga quando a pessoa jurídica ou o profissional demonstra vulnerabilidade concreta diante do fornecedor. Esta aula fica na regra geral; as exceções virão nas próximas.

Vídeo: "Direito do Consumidor - aula 1", canal Saber Direito (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 0:00 a 12:00.$$,
   true, true, 'publicado', 1, 'LOCAL', 'consumidor-e-fornecedor.mp4');

-- ############################################################
-- C. Noções de Direito do Trabalho (área Trabalho, hoje vazia)
-- ############################################################
INSERT INTO materia (area_id, slug, nome, ementa, onda, status, professor, ordem) VALUES
  ((SELECT id FROM area WHERE slug = 'trabalho' AND portal_id = 0),
   'nocoes-de-direito-do-trabalho', 'Noções de Direito do Trabalho',
   'O ramo que cuida do trabalho subordinado: de onde veio, o que a CLT chama de empregado e de empregador, e os princípios que protegem quem trabalha. A base para entender relação de emprego, contrato de trabalho e os direitos do art. 7º da Constituição.',
   3, 'publicado', 'Prof. Anderson Malta', 1);

INSERT INTO assunto (materia_id, slug, nome, ordem) VALUES
  ((SELECT id FROM materia WHERE slug = 'nocoes-de-direito-do-trabalho' AND portal_id = 0),
   'introducao-ao-direito-do-trabalho', 'Introdução ao Direito do Trabalho', 1);

INSERT INTO aula (assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id) VALUES
  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id
     WHERE s.slug = 'introducao-ao-direito-do-trabalho' AND m.slug = 'nocoes-de-direito-do-trabalho' AND m.portal_id = 0),
   'introducao-ao-direito-do-trabalho', 'Introdução ao Direito do Trabalho', 720,
   $$Direito do Trabalho é o ramo que cuida do trabalho subordinado: a relação em que alguém (o empregador) tem o poder de dirigir e alguém (o empregado) tem o dever de cumprir ordens. A aula introdutória mostra de onde essa ideia vem, o que a palavra trabalho significa, como se define o ramo e qual é a sua natureza jurídica.

Historicamente, a evolução se divide em dois grandes momentos. O pré-industrial abrange a Antiguidade, com o trabalho escravo; a Idade Média, com a servidão; e as corporações de ofício, com mestres, companheiros e aprendizes. O industrial começa com a Revolução Industrial, quando a máquina, a fábrica e a exploração em massa criaram a necessidade de o Estado intervir para proteger o trabalhador. É nesse segundo momento que nasce o Direito do Trabalho como o conhecemos.

A própria palavra carrega história. Trabalho vem do latim tripalium, um instrumento de três pontas usado pelos agricultores para bater os cereais colhidos e também empregado como instrumento de tortura; daí a ideia de algo penoso, que sobrevive até hoje no reclamar de segunda-feira. Em sentido econômico, trabalho é o esforço físico ou mental voltado ao sustento próprio ou à produção de riqueza. Em sentido jurídico, o conceito é mais estreito: trabalho é o trabalho subordinado, e é dele que o ramo se ocupa.

Na definição de Arnaldo Süssekind, Direito do Trabalho é o conjunto de normas e princípios, legais e extralegais, que regem as relações individuais e coletivas de trabalho subordinado. Legais são a CF/88, a CLT e as leis esparsas; extralegais são as convenções e os acordos coletivos, os regulamentos de empresa e os costumes. Individual é a relação entre um empregado e seu empregador; coletiva é a que envolve sindicatos e categorias inteiras.

Sobre a natureza jurídica há quatro correntes. Direito público, porque o Estado intervém com normas imperativas e o empregado não pode renunciar aos seus direitos, que são indisponíveis; direito privado, porque a relação nasce de um contrato entre particulares e as normas da CLT são de direito privado; direito social, porque o interesse coletivo de proteger o hipossuficiente prevalece sobre o do particular; e natureza mista, por combinar normas públicas e privadas. A doutrina majoritária conclui pela natureza de direito privado, ainda que com forte intervenção estatal.

Os personagens dessa relação estão na CLT. Empregador é a empresa, individual ou coletiva, que, assumindo os riscos da atividade econômica, admite, assalaria e dirige a prestação pessoal de serviço (art. 2º). Empregado é toda pessoa física que presta serviços de natureza não eventual a empregador, sob a dependência deste e mediante salário (art. 3º). Dali saem os cinco requisitos do vínculo de emprego: pessoa física, pessoalidade, não eventualidade, onerosidade e subordinação. E o art. 7º da CF/88 lista os direitos mínimos de todo trabalhador (salário mínimo, FGTS, férias, décimo terceiro, jornada de oito horas), o piso que nenhum contrato pode rebaixar.

Vídeo: "Introdução ao Direito do Trabalho - aula 1", canal Saber Direito (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 0:00 a 12:00.$$,
   true, true, 'publicado', 1, 'LOCAL', 'introducao-ao-direito-do-trabalho.mp4');

-- ############################################################
-- Vínculo aula ↔ dispositivo (§5.4) — forma segura: não falha se o
-- artigo ainda não estiver no vade-mécum.
-- ############################################################
INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'acao-e-processo-qual-a-diferenca' AND n.slug = 'cpc' AND d.rotulo IN ('Art. 2º', 'Art. 3º', 'Art. 17')
ON CONFLICT DO NOTHING;
INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'acao-e-processo-qual-a-diferenca' AND n.slug = 'cf-88' AND d.rotulo IN ('Art. 5º')
ON CONFLICT DO NOTHING;

INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'teoria-geral-do-processo-primeira-aula' AND n.slug = 'cf-88' AND d.rotulo IN ('Art. 5º', 'Art. 92')
ON CONFLICT DO NOTHING;
INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'teoria-geral-do-processo-primeira-aula' AND n.slug = 'cpc' AND d.rotulo IN ('Art. 2º', 'Art. 3º', 'Art. 72', 'Art. 335', 'Art. 343', 'Art. 344')
ON CONFLICT DO NOTHING;

INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'consumidor-e-fornecedor' AND n.slug = 'cdc' AND d.rotulo IN ('Art. 2º', 'Art. 3º', 'Art. 4º', 'Art. 6º')
ON CONFLICT DO NOTHING;

INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'introducao-ao-direito-do-trabalho' AND n.slug = 'clt' AND d.rotulo IN ('Art. 2º', 'Art. 3º')
ON CONFLICT DO NOTHING;
INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'introducao-ao-direito-do-trabalho' AND n.slug = 'cf-88' AND d.rotulo IN ('Art. 7º')
ON CONFLICT DO NOTHING;

-- ############################################################
-- Exercícios: um por aula
-- ############################################################
INSERT INTO exercicio (aula_id)
SELECT id FROM aula WHERE portal_id = 0 AND slug IN (
  'acao-e-processo-qual-a-diferenca',
  'teoria-geral-do-processo-primeira-aula',
  'consumidor-e-fornecedor',
  'introducao-ao-direito-do-trabalho'
);

-- ############ Aula: Ação e processo: qual é a diferença? ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'acao-e-processo-qual-a-diferenca' AND a.portal_id = 0),
    'multipla_escolha', 'Em poucas palavras, o que é o direito de ação?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O direito de pedir ao Poder Judiciário que se manifeste sobre um problema.', true, 'Correta. Ação é o direito de agir, de provocar o Judiciário e obter uma resposta. Está no art. 5º, XXXV, da CF/88 e no art. 3º do CPC: nenhuma lesão ou ameaça a direito fica fora da apreciação jurisdicional.', 1),
 ('O direito de ter o pedido julgado procedente.', false, 'Errada. A ação garante uma resposta do juiz, não uma resposta favorável. O pedido pode ser julgado procedente ou improcedente; cada caso é analisado individualmente.', 2),
 ('A sequência de atos que vai da petição inicial até a sentença.', false, 'Errada. Essa é a definição de processo, não de ação. A ação é o direito de provocar; o processo é o caminho percorrido depois.', 3),
 ('O ato do juiz que decide o conflito.', false, 'Errada. O ato que decide o conflito é a sentença, o último elo da cadeia de atos do processo. A ação vem antes de tudo isso.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'acao-e-processo-qual-a-diferenca' AND a.portal_id = 0),
    'multipla_escolha', 'Qual das opções descreve melhor o processo?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Um único ato: a petição inicial protocolada pelo autor.', false, 'Errada. A petição inicial é apenas o primeiro ato. O processo é a sequência inteira, que passa pela contestação, pelas provas e chega à sentença.', 1),
 ('Uma sequência lógica e ordenada de atos destinada a esclarecer o conflito e permitir a decisão.', true, 'Correta. Processo é justamente essa cadeia ordenada: cada ato prepara o seguinte, do pedido do autor até a sentença. É isso que dá previsibilidade e segurança às partes.', 2),
 ('O direito de entrar na Justiça para discutir um problema.', false, 'Errada. Isso é a ação. Confundir os dois é o erro que a aula quer evitar: ação é o direito de pedir; processo é o instrumento pelo qual o pedido é examinado.', 3),
 ('O conjunto de leis que o juiz aplica para decidir.', false, 'Errada. As leis aplicadas ao mérito são o direito material. O processo é o instrumento que permite aplicá-las ao caso concreto, não o conteúdo delas.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'acao-e-processo-qual-a-diferenca' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "quem exerce o direito de ação tem garantido que o seu pedido será acolhido pelo juiz".', 'Inspirada em prova · Cebraspe', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O direito de ação é o direito de obter uma resposta do Judiciário, e não uma resposta favorável. O pedido pode ser julgado improcedente sem que isso viole o direito de ação.', 1),
 ('Errado', true, 'Certo. A ação garante que o problema seja apreciado (art. 5º, XXXV, da CF/88); o resultado depende da análise de cada caso. Ter ação não é ter razão.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'acao-e-processo-qual-a-diferenca' AND a.portal_id = 0),
    'multipla_escolha', 'No roteiro básico de um processo, qual é o ato em que o réu apresenta a sua defesa?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Petição inicial', false, 'Errada. A petição inicial é o ato do autor: é com ela que o processo começa (art. 2º do CPC). O réu ainda nem foi citado nesse momento.', 1),
 ('Contestação', true, 'Correta. Contestação é a peça em que o réu se defende e explica o seu ponto de vista sobre o que o autor pediu. No CPC de 2015 ela está disciplinada a partir do art. 335.', 2),
 ('Réplica', false, 'Errada. A réplica é do autor, não do réu: serve para rebater os argumentos trazidos na contestação. Ela vem depois da defesa, não é a defesa.', 3),
 ('Sentença', false, 'Errada. A sentença é o ato do juiz que encerra a fase de conhecimento, dizendo se o pedido é procedente ou não. Não é ato de nenhuma das partes.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'acao-e-processo-qual-a-diferenca' AND a.portal_id = 0),
    'multipla_escolha', 'Segundo o art. 17 do CPC, o que é necessário para postular em juízo?', 'Autoral · OAB', 'intermediario', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Interesse e legitimidade.', true, 'Correta. O art. 17 do CPC é literal: para postular em juízo é necessário ter interesse e legitimidade. Interesse é precisar do Judiciário; legitimidade é ser a pessoa certa para pedir.', 1),
 ('Interesse, legitimidade e possibilidade jurídica do pedido.', false, 'Errada, e é a pegadinha. A possibilidade jurídica do pedido era condição da ação no CPC de 1973; o CPC de 2015 a abandonou como condição autônoma. Hoje o art. 17 fala só em interesse e legitimidade.', 2),
 ('Ter razão no mérito da causa.', false, 'Errada. Ter razão é questão de mérito, que só se resolve na sentença. Os requisitos para postular são verificados antes, na porta de entrada, e não dependem de o pedido ser procedente.', 3),
 ('Ter advogado e pagar as custas.', false, 'Errada. Capacidade postulatória e custas são pressupostos ou requisitos de outra ordem; não são o que o art. 17 exige. Além disso, há casos sem advogado (Juizados) e com gratuidade de justiça.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'acao-e-processo-qual-a-diferenca' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "nos termos do art. 2º do CPC, o processo começa por iniciativa da parte e se desenvolve por impulso oficial".', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É o texto do art. 2º do CPC. A parte exerce a ação e abre o processo; a partir daí o juiz conduz a sequência de atos de ofício, sem precisar ser provocado a cada passo.', 1),
 ('Errado', false, 'Errado. A afirmação reproduz o art. 2º do CPC. Quem marca a resposta como errada costuma imaginar que o juiz pode iniciar o processo sozinho, o que não acontece: a iniciativa é da parte.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Teoria Geral do Processo: por onde tudo começa ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-processo-primeira-aula' AND a.portal_id = 0),
    'multipla_escolha', 'A Teoria Geral do Processo se organiza em torno de três conceitos centrais. Quais são eles?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Jurisdição, ação e processo.', true, 'Correta. É a chamada trilogia estrutural: jurisdição (o poder do Estado de dizer o direito), ação (o direito de provocar a jurisdição) e processo (a sequência ordenada de atos pela qual ela se exerce).', 1),
 ('Autor, réu e juiz.', false, 'Errada. Esses são os sujeitos do processo, não os conceitos fundamentais da teoria. Eles atuam dentro do processo, mas a teoria é construída sobre jurisdição, ação e processo.', 2),
 ('Petição, contestação e sentença.', false, 'Errada. São atos processuais, elos da cadeia que forma o processo. A teoria geral fica um degrau acima: estuda o que é o processo, e não cada peça dele.', 3),
 ('Legalidade, contraditório e celeridade.', false, 'Errada. São princípios que sustentam o sistema, e a aula os estuda antes de entrar na trilogia. Mas princípios não se confundem com os três conceitos estruturais.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-processo-primeira-aula' AND a.portal_id = 0),
    'multipla_escolha', 'O princípio do devido processo legal, no art. 5º, LIV, da CF/88, estabelece que:', 'Autoral · OAB', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Ninguém será privado da liberdade ou de seus bens sem o devido processo legal.', true, 'Correta. É a redação do inciso LIV. A garantia nasce da proteção ao patrimônio e à liberdade: só se perde um ou outro depois de um processo previamente regulado por lei, com regras para autor, réu e juiz.', 1),
 ('Todo processo deve durar no máximo um ano.', false, 'Errada. Não há prazo fixo na Constituição. O que existe é a duração razoável do processo (art. 5º, LXXVIII), princípio distinto do devido processo legal.', 2),
 ('O juiz pode criar as regras do processo conforme o caso concreto.', false, 'Errada. É o contrário: o devido processo legal exige regras prévias, estabelecidas em lei, justamente para que não haja surpresas nem arbitrariedades no processamento das causas.', 3),
 ('Toda decisão judicial pode ser revista por um tribunal.', false, 'Errada. Isso descreve o duplo grau de jurisdição, que é apenas implícito na Constituição e pode ser limitado pelo legislador. O devido processo legal é garantia expressa e mais ampla.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-processo-primeira-aula' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "o duplo grau de jurisdição está previsto de forma expressa no art. 5º da CF/88 como garantia fundamental de recorrer de toda decisão".', 'Inspirada em prova · Cebraspe', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. Não existe inciso do art. 5º garantindo recurso contra toda decisão. O duplo grau é implícito: decorre da organização do Judiciário em juízes e tribunais (art. 92 da CF/88), e o legislador pode limitá-lo.', 1),
 ('Errado', true, 'Certo. O duplo grau é princípio implícito, extraído do art. 92 da CF/88. Prova disso é a Lei 9.099/95, que não admite recurso contra decisões interlocutórias nos Juizados Especiais sem qualquer inconstitucionalidade.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-processo-primeira-aula' AND a.portal_id = 0),
    'multipla_escolha', 'O juiz recebe o laudo do perito e, antes de decidir, manda que autor e réu se manifestem sobre ele. Qual princípio está sendo aplicado?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Contraditório', true, 'Correta. O contraditório (art. 5º, LV, da CF/88) não se dá só entre autor e réu: também se estabelece entre o juiz e as partes. Submeter o laudo à manifestação delas antes de decidir é exatamente isso.', 1),
 ('Duplo grau de jurisdição', false, 'Errada. Duplo grau diz respeito à possibilidade de um tribunal rever a decisão do juiz. Aqui a decisão ainda nem foi proferida; o que se garante é a oportunidade de falar antes dela.', 2),
 ('Celeridade', false, 'Errada. Abrir prazo para manifestação até alonga um pouco o processo. A celeridade (art. 5º, LXXVIII) convive com o contraditório, mas não é ela que explica o ato do juiz.', 3),
 ('Legalidade', false, 'Errada. A legalidade exige lei prévia regulando o processo. Ela está no pano de fundo de tudo, mas o ato específico de ouvir as partes sobre a prova é manifestação do contraditório.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-processo-primeira-aula' AND a.portal_id = 0),
    'multipla_escolha', 'Citado numa ação de cobrança, o réu, plenamente capaz, deixa de apresentar contestação. O que acontece, em regra?', 'Autoral · OAB', 'intermediario', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O juiz é obrigado a nomear um defensor para contestar em nome dele.', false, 'Errada. No processo civil a defesa é direito disponível: o réu capaz que não se defende arca com as consequências. O curador especial (art. 72 do CPC) é para hipóteses específicas, como o réu preso revel ou o citado por edital.', 1),
 ('O processo é extinto sem julgamento do mérito.', false, 'Errada. A falta de contestação não extingue o processo; ao contrário, ele segue, e o juiz pode julgar antecipadamente o pedido.', 2),
 ('Ele é considerado revel e presumem-se verdadeiras as alegações de fato do autor.', true, 'Correta. É a revelia do art. 344 do CPC. A defesa existe e é garantida, mas não é obrigatória para quem tem capacidade de constituir advogado ou procurar a Defensoria; se não a exerce, sofre a presunção de veracidade dos fatos alegados.', 3),
 ('O pedido do autor é automaticamente julgado procedente.', false, 'Errada. A presunção da revelia é relativa e recai sobre os fatos, não sobre o direito. O juiz continua obrigado a analisar se os fatos presumidos levam mesmo à procedência do pedido.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-processo-primeira-aula' AND a.portal_id = 0),
    'multipla_escolha', 'A garantia da razoável duração do processo foi inserida no art. 5º da CF/88 por qual emenda constitucional?', 'Autoral', 'intermediario', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Emenda Constitucional 45/2004', true, 'Correta. A EC 45/2004, conhecida como Reforma do Judiciário, acrescentou o inciso LXXVIII ao art. 5º: a todos são assegurados a razoável duração do processo e os meios que garantam a celeridade de sua tramitação.', 1),
 ('Emenda Constitucional 19/1998', false, 'Errada. A EC 19/1998 é a reforma administrativa, que mexeu no regime dos servidores e trouxe o princípio da eficiência ao art. 37. Não tratou de celeridade processual.', 2),
 ('Emenda Constitucional 32/2001', false, 'Errada. A EC 32/2001 reformulou as medidas provisórias (art. 62). Nada a ver com a duração do processo.', 3),
 ('Não foi emenda: o inciso já estava no texto original de 1988.', false, 'Errada. O texto original de 1988 não tinha essa garantia expressa. Ela só entrou em 2004, junto com outras medidas voltadas a acelerar a Justiça, como a súmula vinculante.', 4)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Consumidor e fornecedor ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'consumidor-e-fornecedor' AND a.portal_id = 0),
    'multipla_escolha', 'Segundo o art. 2º do CDC, consumidor é:', 'Autoral · OAB', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Toda pessoa física ou jurídica que adquire ou utiliza produto ou serviço como destinatário final.', true, 'Correta. É a literalidade do art. 2º. Repare nos dois verbos (adquire ou utiliza) e no elemento decisivo: destinatário final, aquele em quem o produto ou serviço se esgota.', 1),
 ('Apenas a pessoa física que compra produto ou serviço para uso próprio.', false, 'Errada. Pessoa jurídica também pode ser consumidora, desde que seja destinatária final. Limitar o conceito à pessoa física é um erro clássico de prova.', 2),
 ('Qualquer pessoa que participe de uma compra e venda.', false, 'Errada. O vendedor também participa da compra e venda e não é consumidor. Além disso, sem a condição de destinatário final não há consumidor: a lanchonete que compra para revender não é.', 3),
 ('A pessoa que utiliza o produto, ainda que para revendê-lo.', false, 'Errada. Quem adquire para revender reinsere o bem na cadeia produtiva e não é destinatário final. É justamente o oposto do que o art. 2º exige.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'consumidor-e-fornecedor' AND a.portal_id = 0),
    'multipla_escolha', 'Sobre o conceito de fornecedor no art. 3º do CDC, assinale a afirmativa correta.', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Só pessoas jurídicas de direito privado podem ser fornecedoras.', false, 'Errada. O art. 3º é amplo de propósito: pessoa física ou jurídica, pública ou privada. A pessoa jurídica de direito público que presta serviço ao consumidor também se submete ao CDC.', 1),
 ('Pessoa física nunca é fornecedora, porque não tem empresa.', false, 'Errada. A manicure autônoma, o mecânico, o professor particular: todos são fornecedores quando prestam serviço no mercado de consumo com habitualidade. Não é preciso ter CNPJ.', 2),
 ('Pode ser pessoa física ou jurídica, pública ou privada, nacional ou estrangeira, e até ente despersonalizado.', true, 'Correta. É exatamente a redação do art. 3º. O legislador quis alcançar todo mundo que coloca produto ou serviço no mercado, inclusive quem não tem personalidade jurídica, como a massa falida.', 3),
 ('Empresa estrangeira só é fornecedora se tiver sede no Brasil.', false, 'Errada. O art. 3º inclui expressamente o fornecedor estrangeiro. A empresa de fora que negocia com consumidor brasileiro se submete às nossas regras de proteção.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'consumidor-e-fornecedor' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "a energia elétrica não pode ser considerada produto para fins do CDC, porque é um bem imaterial".', 'Inspirada em prova · Cebraspe', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O art. 3º, §1º, do CDC define produto como qualquer bem, móvel ou imóvel, material ou imaterial. A energia elétrica é o exemplo clássico de produto imaterial na relação de consumo.', 1),
 ('Errado', true, 'Certo. A imaterialidade não afasta a natureza de produto. Energia elétrica, software, sinal de TV por assinatura: todos são bens imateriais que o CDC trata como produto (art. 3º, §1º).', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'consumidor-e-fornecedor' AND a.portal_id = 0),
    'multipla_escolha', 'Uma lanchonete compra 50 caixas de refrigerante de uma distribuidora para vender aos seus clientes. Nessa compra, a lanchonete é consumidora?', 'Autoral · OAB', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Sim, porque toda pessoa jurídica que compra é consumidora.', false, 'Errada. Pessoa jurídica pode ser consumidora, mas só quando é destinatária final. Comprar não basta; é preciso que o produto se esgote nela.', 1),
 ('Sim, porque pagou pelo produto.', false, 'Errada. Pagar é elemento de qualquer compra e venda, inclusive entre empresários. O que define o consumidor é a posição de destinatário final, não o pagamento.', 2),
 ('Não, porque não é destinatária final: reinsere o refrigerante na cadeia de consumo ao revendê-lo.', true, 'Correta. A lanchonete adquire o produto como insumo do seu negócio e o repassa ao cliente. Quem compra para revender não encerra a cadeia produtiva, logo não é consumidor (art. 2º do CDC).', 3),
 ('Não, porque pessoa jurídica nunca é consumidora.', false, 'Errada, e é a pegadinha. A conclusão está certa, mas o motivo não: o art. 2º admite pessoa jurídica consumidora. O problema aqui é a destinação, e não a natureza da compradora.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'consumidor-e-fornecedor' AND a.portal_id = 0),
    'multipla_escolha', 'Quais são os elementos que precisam estar presentes, ao mesmo tempo, para se formar uma relação de consumo?', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Elementos subjetivos (consumidor e fornecedor) e elementos objetivos (produto ou serviço).', true, 'Correta. Sem um consumidor de um lado, um fornecedor do outro e um produto ou serviço no meio, não há relação de consumo e o CDC não incide. Faltando qualquer um deles, o caso vai para o Código Civil.', 1),
 ('Contrato escrito e nota fiscal.', false, 'Errada. A relação de consumo não depende de forma: a compra de uma bala na padaria é relação de consumo sem contrato escrito. A nota fiscal ajuda a provar, mas não constitui a relação.', 2),
 ('Pessoa física de um lado e pessoa jurídica do outro.', false, 'Errada. Essa é a configuração mais comum, mas não a única: pessoa jurídica pode ser consumidora e pessoa física pode ser fornecedora. O CDC olha para o papel de cada um, não para a natureza da pessoa.', 3),
 ('Vulnerabilidade comprovada do consumidor no caso concreto.', false, 'Errada. A vulnerabilidade do consumidor é presumida pelo art. 4º, I, do CDC; não precisa ser provada caso a caso. Ela é a razão de ser da lei, não um requisito de formação da relação.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'consumidor-e-fornecedor' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "para o CDC, serviço é qualquer atividade fornecida no mercado de consumo mediante remuneração, inclusive as de natureza bancária e de crédito, salvo as decorrentes de relação trabalhista".', 'Autoral', 'intermediario', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É a redação do art. 3º, §2º, do CDC. Bancos, financeiras e seguradoras prestam serviço de consumo; o vínculo de emprego, não, porque tem lei própria (a CLT) e lógica diferente.', 1),
 ('Errado', false, 'Errado. A afirmação reproduz o art. 3º, §2º. Quem erra costuma achar que atividade bancária fica fora do CDC; o STF já decidiu o contrário, e o próprio texto legal a inclui expressamente.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Introdução ao Direito do Trabalho ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'introducao-ao-direito-do-trabalho' AND a.portal_id = 0),
    'multipla_escolha', 'De onde vem a palavra trabalho e que ideia ela carrega?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Do latim tripalium, instrumento de três pontas ligado à ideia de tortura e de algo penoso.', true, 'Correta. Tripalium era usado para bater cereais e também como instrumento de suplício. Daí a carga de sofrimento que a palavra ainda carrega, e que ajuda a entender por que o Direito do Trabalho nasce como direito de proteção.', 1),
 ('Do grego ergon, que significa obra ou realização.', false, 'Errada. Ergon é a raiz grega de palavras como ergonomia, mas não é a origem de trabalho em português. A aula é clara: a origem é latina, tripalium.', 2),
 ('Do latim labor, com sentido de nobreza e virtude.', false, 'Errada. Labor existe em latim e deu origem a laboral, mas não é a etimologia apresentada para trabalho, e o sentido histórico da palavra é o oposto de nobreza: é o de fardo.', 3),
 ('Do francês travail, que significa viagem ou jornada.', false, 'Errada. Travail é a versão francesa da mesma raiz latina tripalium; não é a origem, e o sentido de viagem é de outra palavra (voyage).', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'introducao-ao-direito-do-trabalho' AND a.portal_id = 0),
    'multipla_escolha', 'Em sentido jurídico, de que tipo de trabalho o Direito do Trabalho se ocupa?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('De todo esforço físico ou mental voltado à produção de riqueza.', false, 'Errada. Essa é a noção econômica de trabalho, mais ampla. O Direito do Trabalho não regula o esforço do artesão que trabalha só para si, por exemplo.', 1),
 ('Do trabalho subordinado, em que o empregador tem poder diretivo e o empregado tem o dever de cumprir ordens.', true, 'Correta. Juridicamente, o trabalho que interessa ao ramo é o subordinado: alguém dirige e alguém obedece. É a subordinação que traz a CLT para dentro da relação.', 2),
 ('Do trabalho autônomo, prestado sem patrão.', false, 'Errada. O trabalho autônomo é relação de trabalho, mas não de emprego: falta a subordinação. Ele fica, em regra, no Direito Civil (contrato de prestação de serviços).', 3),
 ('Apenas do trabalho prestado a órgãos públicos.', false, 'Errada. O servidor público estatutário tem regime próprio e fica fora da CLT. O Direito do Trabalho cuida principalmente do trabalho subordinado no setor privado.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'introducao-ao-direito-do-trabalho' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "para a doutrina majoritária, a natureza jurídica do Direito do Trabalho é de direito público, porque o Estado intervém com normas imperativas".', 'Inspirada em prova · Cebraspe', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A intervenção estatal e a indisponibilidade dos direitos do empregado são os argumentos da corrente publicista, mas ela não é a majoritária. A maioria da doutrina conclui pela natureza de direito privado.', 1),
 ('Errado', true, 'Certo. A doutrina majoritária vê o Direito do Trabalho como ramo do direito privado: a relação nasce de um contrato entre particulares, e as normas da CLT são de direito privado, ainda que com forte intervenção do Estado.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'introducao-ao-direito-do-trabalho' AND a.portal_id = 0),
    'multipla_escolha', 'Na definição de Arnaldo Süssekind adotada na aula, o Direito do Trabalho é o conjunto de normas e princípios:', 'Autoral', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Legais e extralegais que regem as relações individuais e coletivas de trabalho subordinado.', true, 'Correta. Três marcas da definição: fontes legais e extralegais (lei, CLT, mas também convenções coletivas e costumes), relações individuais e coletivas, e sempre trabalho subordinado.', 1),
 ('Exclusivamente legais que regem o contrato individual de trabalho.', false, 'Errada em dois pontos: a definição inclui normas extralegais (acordos e convenções coletivas, regulamentos de empresa) e abrange também as relações coletivas, não só o contrato individual.', 2),
 ('Constitucionais que garantem o direito ao trabalho.', false, 'Errada. A Constituição é fonte importante (art. 7º), mas a definição é muito mais ampla: envolve a CLT, leis esparsas, normas coletivas e princípios. E o objeto é a relação de trabalho subordinado, não o direito abstrato ao trabalho.', 3),
 ('Legais e extralegais que regem toda forma de trabalho humano, subordinado ou não.', false, 'Errada. A aula insiste: o Direito do Trabalho se ocupa do trabalho subordinado. Trabalho autônomo, eventual e outros ficam, em regra, fora do seu núcleo.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'introducao-ao-direito-do-trabalho' AND a.portal_id = 0),
    'multipla_escolha', 'Qual das etapas abaixo NÃO pertence ao momento pré-industrial da evolução do trabalho?', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A escravidão da Antiguidade', false, 'Pertence ao momento pré-industrial: é a primeira etapa, em que o trabalhador era tratado como coisa e não como sujeito de direitos.', 1),
 ('A servidão da Idade Média', false, 'Pertence ao momento pré-industrial: o servo estava preso à terra e devia trabalho ao senhor feudal, ainda sem qualquer proteção jurídica própria.', 2),
 ('As corporações de ofício', false, 'Pertence ao momento pré-industrial: mestres, companheiros e aprendizes organizados por profissão, com regras internas, mas ainda sem a figura do empregado moderno.', 3),
 ('A Revolução Industrial', true, 'Correta: é ela que inaugura o momento industrial. Com a fábrica e a máquina vieram as jornadas exaustivas e o trabalho de mulheres e crianças, e foi essa exploração em massa que fez nascer o Direito do Trabalho.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'introducao-ao-direito-do-trabalho' AND a.portal_id = 0),
    'multipla_escolha', 'Segundo o art. 3º da CLT, empregado é:', 'Autoral · OAB', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Toda pessoa física que presta serviços de natureza não eventual a empregador, sob a dependência deste e mediante salário.', true, 'Correta. É a redação do art. 3º da CLT, de onde se extraem os requisitos do vínculo: pessoa física, pessoalidade, não eventualidade, subordinação (dependência) e onerosidade (salário).', 1),
 ('Toda pessoa física ou jurídica que presta serviços a empregador mediante remuneração.', false, 'Errada. Empregado é sempre pessoa física. Pessoa jurídica que presta serviço celebra contrato civil ou empresarial, não contrato de trabalho.', 2),
 ('A pessoa que presta serviços eventuais mediante pagamento por tarefa.', false, 'Errada. A não eventualidade é requisito expresso do art. 3º. O trabalhador eventual, chamado para uma tarefa isolada, não é empregado.', 3),
 ('A empresa que, assumindo os riscos da atividade, admite, assalaria e dirige a prestação de serviço.', false, 'Errada. Essa é a definição de empregador, no art. 2º da CLT. A troca entre os arts. 2º e 3º é pegadinha frequente em prova.', 4)
) AS v(texto, correta, comentario, ordem);
