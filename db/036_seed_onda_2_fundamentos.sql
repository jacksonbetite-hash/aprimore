-- =====================================================================
-- Conteúdo da 2ª onda (portal 0 — a plataforma): fundamentos.
--
-- Introdução ao Direito ganha a aula de abertura ("O que é Direito?"),
-- uma visão panorâmica de teoria geral do Direito e um assunto novo de
-- método de estudo ("Como estudar Direito"). Noções de Direito
-- Constitucional publica três aulas que estavam aprovadas sem exercício
-- (poder constituinte, remédios, separação dos Poderes) e ganha o
-- assunto "Controle de constitucionalidade".
--
-- §5.3: toda aula publicada tem vídeo, resumo, exercício com no mínimo
-- 5 questões e comentário em TODA alternativa. Vídeos locais (LOCAL),
-- reproduzidos sob licença CC BY com os créditos ao autor no resumo.
-- Nas tabelas area/materia/assunto/aula o portal_id tem DEFAULT 0, por
-- isso ele é omitido nos INSERTs. Nada aqui usa ID numérico fixo.
-- =====================================================================

-- #####################################################################
-- A. Introdução ao Direito
-- #####################################################################

-- ---------- A1. Assunto "Norma, Direito e sociedade": aula de abertura ----------
INSERT INTO aula (assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id) VALUES
  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id AND m.portal_id = s.portal_id
     WHERE s.portal_id = 0 AND m.slug = 'introducao-ao-direito' AND s.slug = 'norma-e-direito'),
   'o-que-e-direito', 'O que é Direito? Os sentidos da palavra', 235,
   $$"O que é Direito?" parece pergunta de primeiro dia de aula — e é. Mas a resposta não é óbvia, porque a palavra tem vários sentidos. A aula parte de uma definição clássica e a desmonta pedaço por pedaço: Direito é o conjunto de normas de conduta social, imposto coercitivamente pelo Estado, para a realização da segurança segundo critérios de justiça.

Primeiro pedaço: "conjunto de normas de conduta social". Norma é o que diz quais comportamentos são permitidos, proibidos ou obrigatórios na vida em sociedade. Ela traça a linha que separa o lícito do ilícito e impõe deveres — mas não só isso: há normas que estruturam o próprio Estado e organizam a relação entre as pessoas e os órgãos públicos. A Constituição, ao dividir o Estado em Legislativo, Executivo e Judiciário (art. 2º da CF/88), é o exemplo mais claro dessa segunda função.

Segundo pedaço: "imposto coercitivamente pelo Estado". É isso que separa a norma jurídica de outras regras sociais, como a moral ou a etiqueta: só a jurídica pode ser cobrada à força, porque o Estado tem poder de coerção sobre as pessoas e cada um deve ajustar sua conduta ao que o poder público determina. Uma ressalva importante da aula: o Estado não é a única fonte do Direito. A própria sociedade cria normas, como acontece com os costumes — tanto que a LINDB manda o juiz decidir pelos costumes quando a lei é omissa (art. 4º).

Terceiro pedaço: "para a realização da segurança segundo critérios de justiça". O Direito não existe por si: é um instrumento em função do bem-estar da sociedade, e seu objetivo final é a justiça. Só que não há justiça sem segurança jurídica, isto é, sem normas que organizem a sociedade, tragam ordem e garantam respeito aos direitos das pessoas — é por isso que a CF/88 protege o direito adquirido, o ato jurídico perfeito e a coisa julgada (art. 5º, XXXVI). A aula fecha com a frase do jurista romano Ulpiano: justiça é a constante e perpétua vontade de dar a cada um o seu direito.

A definição estudada é a do Direito em sentido objetivo: o conjunto de normas ("o Direito brasileiro proíbe a tortura"). Vale fixar desde já o outro sentido que aparece o tempo todo, o subjetivo: a faculdade que a norma reconhece a alguém ("tenho direito a férias"). A mesma palavra ainda nomeia a ciência que estuda essas normas (o curso de Direito) e, no uso cotidiano, o que é justo ("isso não é direito"). Saber em qual sentido a palavra está sendo usada evita metade das confusões do primeiro semestre.

Vídeo: "O que é DIREITO? Quais são os SIGNIFICADOS do DIREITO? | Introdução ao Estudo do Direito", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$$,
   true, true, 'publicado', 0, 'LOCAL', 'o-que-e-direito.mp4');

-- A aula de abertura passa a ser a amostra do assunto; a antiga 1ª aula deixa de ser.
UPDATE aula SET amostra_gratuita = false WHERE slug = 'o-que-e-norma-juridica' AND portal_id = 0;

INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'o-que-e-direito' AND n.slug = 'cf-88' AND d.rotulo IN ('Art. 1º', 'Art. 2º', 'Art. 5º')
ON CONFLICT DO NOTHING;

INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'o-que-e-direito' AND n.slug = 'lindb' AND d.rotulo IN ('Art. 4º', 'Art. 5º')
ON CONFLICT DO NOTHING;

-- ---------- A2. Assunto "Fontes do Direito": teoria geral, visão panorâmica ----------
INSERT INTO aula (assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id) VALUES
  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id AND m.portal_id = s.portal_id
     WHERE s.portal_id = 0 AND m.slug = 'introducao-ao-direito' AND s.slug = 'fontes-do-direito'),
   'teoria-geral-do-direito-visao-panoramica', 'Teoria geral do Direito: uma visão panorâmica', 720,
   $$Teoria geral do Direito é o estudo dos conceitos que se repetem em todas as disciplinas jurídicas e permanecem os mesmos do primeiro ao último semestre: o que é Direito, norma jurídica, fato jurídico, relação jurídica, validade, vigência e eficácia, interpretação (hermenêutica). Esta aula é a abertura de um curso sobre o tema e começa pelo mais básico: o que é uma teoria e para que ela serve.

Teoria é um conjunto de proposições que visa conhecer um objeto. A realidade que a teoria explica é o que chamamos de prática. A teoria explica a prática; a prática confirma ou desmente (infirma) a teoria. Por isso a aula retoma Pontes de Miranda: não existe diferença entre teoria e prática — as duas são pontos de vista sobre o mesmo objeto. O que existe é conhecimento do objeto, e conhecer é conseguir aplicar a teoria à realidade.

Essa aplicação depende do que a aula chama de linguagem da experiência. Dois exemplos deixam isso concreto. O médico que estudou anos a teoria do câncer de pele, mas não reconhece a mancha no rosto do paciente e só descobre o tumor meses depois, pela biópsia: ele tem a teoria e tem a prática diante dos olhos, mas não conhece o câncer de pele, porque não faz a ligação entre as duas. O mesmo vale para o estudante que fez pós-graduação em processo civil e sabe toda a teoria dos recursos, mas, no escritório, não consegue dizer qual recurso cabe naquele caso concreto. Só conhecemos algo quando conseguimos associar a teoria a uma realidade determinada.

É aí que entra a função da teoria do Direito: ela é um conjunto de proposições descritivas sobre o direito positivo — o conjunto de normas em vigor. O direito positivo é uma linguagem enorme e complexa; a teoria é outra linguagem, que olha para a linguagem do Direito e reduz suas complexidades. Quem domina a teoria consegue aplicá-la para conhecer qualquer realidade jurídica que encontre, e não apenas o caso que já viu.

A aula fecha distinguindo três tipos de conhecimento sobre o direito positivo. O técnico é o de quem sabe a legislação, localiza o artigo certo e aplica o dispositivo ao caso concreto: é o conhecimento do manual, de quem sabe operar a máquina. Não é um conhecimento menor — exige estudo e dedicação —, mas não se ocupa de perguntas como a constitucionalidade de uma norma, a coerência interna do sistema ou a depuração dos conceitos usados pelo legislador. Essas perguntas pertencem ao conhecimento científico, que trabalha com uma linguagem mais depurada, elimina as contradições da linguagem do Direito e esclarece os conceitos do legislador. O terceiro tipo, o conhecimento filosófico, é apenas anunciado neste trecho e fica para as aulas seguintes.

Vídeo: "Teoria Geral do Direito - aula 1", canal Saber Direito (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 0:00 a 12:00.$$,
   false, true, 'publicado', 2, 'LOCAL', 'teoria-geral-do-direito-visao-panoramica.mp4');

-- ---------- A3. Assunto novo: Como estudar Direito ----------
INSERT INTO assunto (materia_id, slug, nome, ordem) VALUES
  ((SELECT id FROM materia WHERE portal_id = 0 AND slug = 'introducao-ao-direito'), 'como-estudar-direito', 'Como estudar Direito', 3);

INSERT INTO aula (assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id) VALUES
  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id AND m.portal_id = s.portal_id
     WHERE s.portal_id = 0 AND m.slug = 'introducao-ao-direito' AND s.slug = 'como-estudar-direito'),
   'primeiro-dia-de-aula-de-direito', 'Primeiro dia de aula de Direito: o que se aprende', 272,
   $$O que se aprende no primeiro dia de aula de Direito? A aula responde a partir das anotações que a professora guardou do caderno do primeiro semestre: um punhado de palavras que todo estudante ouve na primeira semana e que boa parte da população deveria conhecer. Vale como um glossário de boas-vindas.

A primeira palavra é Constituição. Ela é a norma mais importante do país: organiza o funcionamento do Estado e confere direitos e garantias ao povo. A diferença em relação às leis é de hierarquia — nenhuma lei pode contrariar a Constituição, porque ela está no topo do ordenamento jurídico. Um livrinho que parece não ter muita coisa e que, na verdade, guarda o que há de mais precioso para a organização nacional.

Daí vem a segunda palavra: ordenamento jurídico. É o nome que se dá ao nosso conjunto de normas, ao sistema jurídico como um todo. Dentro dele, a Constituição ocupa o lugar mais alto, e as demais normas precisam ser compatíveis com ela.

A terceira é petição, que significa simplesmente pedido. Petição é o documento escrito por meio do qual uma das partes do processo se comunica com o juiz para pedir alguma coisa. Quando o advogado entra com uma ação, ele apresenta a petição inicial: um texto em que explica o problema do cliente e pede que o juiz tome uma providência. Ao longo do processo, outras petições podem ser juntadas conforme a necessidade.

Ligada a ela vem a expressão pleitear em juízo, que assusta pelo som mas quer dizer apenas pedir ao Judiciário. Quem pleiteia diz ao juiz que seu direito foi lesado e pede uma solução. O juiz então ouve também a parte contrária, para ter as duas versões da história (é o contraditório do art. 5º, LV, da CF/88), e ao final julga o pedido procedente, parcialmente procedente ou improcedente — ou seja, concedido, concedido em parte ou negado.

Vídeo: "PRIMEIRO DIA DE AULA DE DIREITO: o que se aprende? Como é a 1ª aula da faculdade de Direito?", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$$,
   true, true, 'publicado', 1, 'LOCAL', 'primeiro-dia-de-aula-de-direito.mp4'),

  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id AND m.portal_id = s.portal_id
     WHERE s.portal_id = 0 AND m.slug = 'introducao-ao-direito' AND s.slug = 'como-estudar-direito'),
   'sete-dicas-para-quem-esta-comecando', '7 dicas para quem está começando no Direito', 410,
   $$Sete dicas para quem está entrando no Direito e quer aprender mais rápido, ir bem nas aulas e nas provas. Nenhuma delas é sobre decorar artigo — todas são sobre construir raciocínio jurídico, que é o que separa quem entende Direito de quem só repete.

Dica 1: entenda a filosofia jurídica. Ela ensina a pensar sobre o Direito e a construir raciocínio. O problema é que nem todo professor com grande conhecimento tem didática, e o aluno acaba achando a matéria um tormento. A saída não é abandonar a disciplina: é procurar vídeos e livros didáticos sobre os temas, porque essa base vai fazer falta lá na frente. Dica 2: aprenda história do Direito. Ao estudar os períodos históricos você percebe a influência de movimentos e ideias no nosso ordenamento — leis atuais que vêm do Direito romano, de Tomás de Aquino na Idade Média, dos pensadores iluministas da Revolução Francesa. A história também mostra o que já deu certo e errado: muita ideia que parece inovadora já foi testada no passado, e saber por que falhou ajuda a pensar soluções melhores.

Dica 3: os princípios são o mais importante. Ao começar as disciplinas (civil, penal, constitucional, administrativo), tenha em mente que o Direito muda todo dia e as leis sofrem grandes modificações, mas os princípios são como postes de luz que orientam o ordenamento jurídico. Quem conhece bem os princípios de cada matéria entende os assuntos com muito mais facilidade e não cai nas pegadinhas das provas. Dica 4: debata o que viu em aula com os colegas. O grupo de estudos pode ser no ônibus da volta para casa ou no grupo de WhatsApp da turma — que não serve só para meme e figurinha.

Dica 5: saia da zona de conforto. Conversar com pessoas diferentes, conhecer outras culturas e puxar papo com quem não faz parte da sua rotina traz inspiração e novas reflexões — e isso só acontece se você buscar algo além do que já conhece. Dica 6: um pouco por dia, aumentando aos poucos. Muita gente entra no curso apavorada com a quantidade de coisa para estudar. Quem não tinha o hábito de estudar sente dificuldade no começo, e isso é normal: o hábito se adquire estudando um pouco todo dia e aumentando gradualmente. Revisar as disciplinas aos poucos, ainda que uma horinha por dia, rende muito mais do que deixar tudo para a véspera da prova.

Dica 7: sem pressa para estudar as leis. Tem gente que entra no curso querendo logo civil e penal e decorar artigos, e por isso não dá valor à parte inicial — filosofia, teoria do Estado, introdução. O resultado são verdadeiros robozinhos jurídicos: sabem decorar, mas não conseguem pensar o Direito. Vai mais longe quem desenvolve pensamento crítico, e isso não se obtém apenas decorando.

Vídeo: "7 dicas para iniciantes no DIREITO: o que todo estudante precisa saber ao entrar na faculdade", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$$,
   false, true, 'publicado', 2, 'LOCAL', 'sete-dicas-para-quem-esta-comecando.mp4'),

  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id AND m.portal_id = s.portal_id
     WHERE s.portal_id = 0 AND m.slug = 'introducao-ao-direito' AND s.slug = 'como-estudar-direito'),
   'como-aprender-direito-mais-rapido', 'Como aprender Direito mais rápido, mesmo começando do zero', 302,
   $$Dá para aprender Direito de um jeito simples e mais rápido, mesmo começando do zero? A aula diz que sim — ou, pelo menos, sem tanto sofrimento — e apresenta o passo que a professora usou na própria formação e que serve para a faculdade, para concursos públicos, para o Exame da OAB e para qualquer prova com conteúdo jurídico.

Antes, um alerta: o método não é para quem vive no faz de conta e acha que aprende Direito assistindo a série de advogado. É para quem tem os pés no chão e sabe que vai precisar estudar. Sem essa disposição, nenhum atalho funciona.

O primeiro passo é buscar, em primeiro lugar, o básico: uma ideia geral de cada assunto. A aula usa uma metáfora de cozinha. Quem está aprendendo a cozinhar começa pelo arroz simples; ninguém prepara um risoto de camarão com limão siciliano e gorgonzola sem antes saber cozinhar arroz. No Direito é igual: querer conhecimento profundo sem ter a base é tentar o risoto sem nunca ter posto arroz na panela — e o resultado costuma ser uma gororoba.

O erro mais comum do estudante iniciante é exatamente esse: querer se aprofundar demais logo de saída. Ele pega um livro super aprofundado, abre no capítulo sobre os princípios por trás daquele assunto e não entende nada do que está lendo, porque não tem as premissas gerais. Por isso a recomendação é estudar os assuntos de forma simplificada, mas com qualidade — o que significa entender bem o que está sendo estudado —, sem pular etapas e valorizando livros fáceis de entender, que ajudam agora.

Depois, quando as premissas gerais estiverem compreendidas, aí sim vem o aprofundamento: o risoto jurídico. A ordem importa. Simplificar primeiro não é estudar menos; é construir a base que permite entender o conteúdo avançado quando ele chegar.

Vídeo: "Como aprender Direito mais RÁPIDO, mesmo que esteja começando do ZERO? (Passo a passo simples)", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$$,
   false, false, 'publicado', 3, 'LOCAL', 'como-aprender-direito-mais-rapido.mp4');

-- #####################################################################
-- B. Noções de Direito Constitucional
-- #####################################################################

-- ---------- B5. Assunto novo: Controle de constitucionalidade ----------
INSERT INTO assunto (materia_id, slug, nome, ordem) VALUES
  ((SELECT id FROM materia WHERE portal_id = 0 AND slug = 'nocoes-de-direito-constitucional'), 'controle-de-constitucionalidade', 'Controle de constitucionalidade', 4);

INSERT INTO aula (assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id) VALUES
  ((SELECT s.id FROM assunto s JOIN materia m ON m.id = s.materia_id AND m.portal_id = s.portal_id
     WHERE s.portal_id = 0 AND m.slug = 'nocoes-de-direito-constitucional' AND s.slug = 'controle-de-constitucionalidade'),
   'controle-de-constitucionalidade-resumo', 'Controle de constitucionalidade: o resumo que faz sentido', 824,
   $$Controle de constitucionalidade é o mecanismo que verifica se as leis e os demais atos normativos são compatíveis com a Constituição. Ele se apoia em dois pressupostos. O primeiro é a supremacia da Constituição: ela está no topo do ordenamento e é o fundamento de validade de todos os atos normativos, de modo que nenhuma lei pode contrariá-la. O segundo é a rigidez constitucional: alterar a Constituição é mais difícil do que alterar uma lei (art. 60 da CF/88), e por isso uma lei não tem o poder de mudar a norma suprema.

Quando uma lei é declarada inconstitucional, a consequência é a nulidade: ela não tem validade. Em regra a declaração produz efeitos retroativos — ex tunc —, apagando o que a lei produziu, como se ela nunca tivesse existido. A exceção é a modulação dos efeitos: para resguardar a segurança jurídica ou o excepcional interesse social, o STF pode, por decisão de no mínimo dois terços dos seus membros (oito ministros), dar à declaração efeitos não retroativos (ex nunc), ou até fixar uma data futura para que ela comece a valer.

A inconstitucionalidade se classifica de vários modos. Quanto à conduta, ela é por ação, quando se edita um ato normativo contrário à Constituição, ou por omissão, quando falta a lei regulamentadora de uma norma constitucional de eficácia limitada — e para essa falta existem duas ações: o mandado de injunção, no controle difuso (o caso concreto de alguém que não consegue exercer um direito), e a ação direta de inconstitucionalidade por omissão, no controle concentrado. Quanto ao vício, ela é material, quando o conteúdo do ato contraria a Constituição (uma lei que autorizasse a tortura), ou formal, quando o ato desobedece às regras do processo legislativo (uma emenda constitucional editada durante o estado de sítio).

Quanto ao momento, o controle é preventivo ou repressivo. O preventivo analisa o projeto, antes de o ato existir, e pode ser feito pelos três Poderes: o Executivo, pelo veto a projeto de lei inconstitucional; o Legislativo, pelo parecer da Comissão de Constituição e Justiça e pela própria votação; e o Judiciário, em mandado de segurança impetrado por parlamentar que participa do processo legislativo e quer barrar a tramitação. O repressivo vem depois da promulgação e, na aula, fica com o Poder Judiciário (a doutrina admite exceções pontuais, mas a regra é essa). Ele se faz de dois modos.

O controle difuso, ou concreto, pode ser exercido por qualquer juiz ou tribunal — até o juiz de primeira instância — dentro de um processo comum: a inconstitucionalidade é reconhecida a partir de um caso concreto, e a decisão produz efeitos apenas entre as partes (inter partes). O controle concentrado, ou abstrato, não tem caso concreto: o ato normativo é analisado em tese, e só dois tribunais podem fazê-lo. Quando o parâmetro é a Constituição Federal, o STF (art. 102, I, a); quando o parâmetro é a constituição do Estado, o Tribunal de Justiça, que julga em abstrato as leis estaduais e municipais que a contrariem (art. 125, § 2º). A ação mais famosa desse controle é a ADI, cujos legitimados estão no art. 103.

Em qualquer dos dois modos, um tribunal só declara a inconstitucionalidade pelo voto da maioria absoluta do plenário ou do órgão especial — é a cláusula de reserva de plenário do art. 97. Uma turma ou câmara não pode fazê-lo, e maioria simples não basta. A regra vale para órgãos colegiados; o juiz singular, no controle difuso, decide sozinho porque não tem colegiado a consultar. Por fim, uma curiosidade que cai em prova: emendas constitucionais também podem ser declaradas inconstitucionais, em duas situações — quando o conteúdo tende a abolir cláusula pétrea ou quando o rito do art. 60 não foi respeitado.

Vídeo: "CONTROLE de CONSTITUCIONALIDADE: resumo fácil de entender | Cíntia Brunelli", canal Me Julga - Cíntia Brunelli (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$$,
   true, true, 'publicado', 1, 'LOCAL', 'controle-de-constitucionalidade-resumo.mp4');

INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = 0 AND a.slug = 'controle-de-constitucionalidade-resumo' AND n.slug = 'cf-88'
   AND d.rotulo IN ('Art. 97', 'Art. 102', 'Art. 103', 'Art. 125', 'Art. 60')
ON CONFLICT DO NOTHING;

-- ---------- Exercícios: um por aula nova e um para cada aula constitucional que sai de 'aprovado' ----------
INSERT INTO exercicio (aula_id)
SELECT id FROM aula WHERE portal_id = 0 AND slug IN (
  'o-que-e-direito',
  'teoria-geral-do-direito-visao-panoramica',
  'primeiro-dia-de-aula-de-direito',
  'sete-dicas-para-quem-esta-comecando',
  'como-aprender-direito-mais-rapido',
  'poder-constituinte',
  'remedios-constitucionais',
  'separacao-dos-poderes',
  'controle-de-constitucionalidade-resumo'
);

-- =====================================================================
-- Questões. Cada bloco insere a questão e suas alternativas juntas.
-- =====================================================================

-- ############ Aula: O que é Direito? Os sentidos da palavra ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'o-que-e-direito' AND a.portal_id = 0),
    'multipla_escolha', 'Na definição estudada na aula, o que distingue a norma jurídica das outras normas de conduta social, como a moral e a etiqueta?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A norma jurídica é sempre escrita, e as demais são orais.', false, 'Errada. Há norma jurídica não escrita (o costume, reconhecido pelo art. 4º da LINDB) e regra de etiqueta escrita em manual. A forma não é o critério.', 1),
 ('A norma jurídica é imposta coercitivamente pelo Estado.', true, 'Correta. É o segundo pedaço da definição: o Estado tem poder de coerção e pode obrigar a pessoa a ajustar sua conduta. A moral e a etiqueta não contam com essa força organizada.', 2),
 ('A norma jurídica trata apenas de proibições, e as demais, de permissões.', false, 'Errada. A norma jurídica também permite e obriga — a aula fala em comportamentos permitidos, limites de liberdade, proibições e obrigações.', 3),
 ('A norma jurídica só regula a relação entre o cidadão e o Estado.', false, 'Errada. Ela regula a vida em sociedade como um todo, inclusive relações entre particulares; as normas de organização do Estado são só uma parte do conjunto.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'o-que-e-direito' AND a.portal_id = 0),
    'multipla_escolha', 'Segundo a aula, a expressão "conjunto de normas de conduta social" abrange:', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Somente as normas que proíbem condutas e preveem punição.', false, 'Errada. Proibir é só uma das funções da norma; ela também define o que é permitido e o que é obrigatório.', 1),
 ('As normas que definem o permitido, o proibido e o obrigatório, e também as que estruturam o Estado e organizam a relação entre as pessoas e os órgãos públicos.', true, 'Correta. A aula destaca as duas funções: traçar a linha entre lícito e ilícito na vida em sociedade e organizar o próprio Estado — como faz o art. 2º da CF/88 ao dividir os três Poderes.', 2),
 ('Apenas as normas escritas pelo Poder Legislativo.', false, 'Errada. A aula lembra que a própria sociedade cria normas, como os costumes; e as normas jurídicas vêm também do Executivo e do Judiciário.', 3),
 ('As regras morais que a sociedade considera importantes.', false, 'Errada. Regra moral é conduta social, mas não é norma jurídica: falta a imposição coercitiva pelo Estado.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'o-que-e-direito' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "como o Direito é imposto pelo Estado, somente o Estado produz normas jurídicas, e o costume não é fonte do Direito".', 'Inspirada em prova · Cebraspe', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A aula faz exatamente essa ressalva: o Estado impõe o Direito, mas não é a única fonte. A sociedade cria normas pelos costumes, e o art. 4º da LINDB manda o juiz decidir por eles quando a lei é omissa.', 1),
 ('Errado', true, 'Certo. Coerção estatal é a marca da norma jurídica, mas a origem da norma pode ser social: o costume é fonte do Direito (art. 4º da LINDB).', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'o-que-e-direito' AND a.portal_id = 0),
    'multipla_escolha', 'De acordo com a definição estudada, qual é a finalidade do Direito e como a segurança jurídica se relaciona com ela?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A finalidade é a justiça; a segurança jurídica é condição para alcançá-la, porque não há justiça sem normas que organizem a sociedade e garantam os direitos.', true, 'Correta. O Direito é instrumento do bem-estar social e seu objetivo final é a justiça — mas ela exige segurança jurídica, isto é, ordem e respeito aos direitos. A CF/88 expressa isso ao proteger o direito adquirido, o ato jurídico perfeito e a coisa julgada (art. 5º, XXXVI).', 1),
 ('A finalidade é a segurança; a justiça é um efeito colateral desejável.', false, 'Errada. A definição inverte a ordem: a segurança é meio ("realização da segurança segundo os critérios de justiça"), e a justiça é o fim.', 2),
 ('A finalidade é punir quem descumpre a lei.', false, 'Errada. A punição é instrumento de coerção, não a finalidade. O Direito também organiza, permite e garante; punir é só uma das formas de fazê-lo valer.', 3),
 ('A finalidade é organizar o Estado, sem relação com a ideia de justiça.', false, 'Errada. Organizar o Estado é uma das funções das normas, mas a definição diz expressamente que o Direito serve à segurança "segundo os critérios de justiça".', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'o-que-e-direito' AND a.portal_id = 0),
    'multipla_escolha', 'A frase do jurista romano Ulpiano, "constante e perpétua vontade de dar a cada um o seu direito", é a definição clássica de:', 'Autoral · OAB', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Segurança jurídica', false, 'Errada. Segurança jurídica é a existência de normas que tragam ordem e previsibilidade; Ulpiano fala de dar a cada um o que é seu, que é outra ideia.', 1),
 ('Coerção', false, 'Errada. Coerção é o poder de impor a norma à força. A frase não fala de força, e sim de atribuir a cada um o que lhe cabe.', 2),
 ('Justiça', true, 'Correta. É a definição de justiça citada na aula: a vontade constante e perpétua de dar a cada um o seu direito (suum cuique tribuere).', 3),
 ('Norma jurídica', false, 'Errada. Norma é a regra de conduta; a frase de Ulpiano descreve o valor que o Direito busca realizar, não a regra em si.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'o-que-e-direito' AND a.portal_id = 0),
    'certo_errado', 'Julgue: na frase "o Direito brasileiro proíbe a tortura", a palavra Direito está empregada em sentido subjetivo.', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. "O Direito brasileiro" é o conjunto de normas — sentido objetivo. Subjetivo seria a faculdade de alguém, como em "tenho direito a férias".', 1),
 ('Errado', true, 'Certo. A frase usa Direito em sentido objetivo (o ordenamento, o conjunto de normas). O sentido subjetivo aparece quando se fala do direito de uma pessoa.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Teoria geral do Direito: uma visão panorâmica ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-direito-visao-panoramica' AND a.portal_id = 0),
    'multipla_escolha', 'Segundo a aula, o que é uma teoria?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Um conjunto de proposições que visa ao conhecimento de determinado objeto.', true, 'Correta. É a definição de abertura da aula: toda teoria existe para conhecer o seu objeto, e a realidade conhecida por ela é o que se chama prática.', 1),
 ('Uma opinião pessoal ainda não confirmada pela prática.', false, 'Errada. A teoria não é palpite: é um conjunto organizado de proposições sobre um objeto. A prática confirma ou infirma a teoria, mas isso não a reduz a opinião.', 2),
 ('O conjunto de normas jurídicas em vigor.', false, 'Errada. Isso é o direito positivo — o objeto que a teoria do Direito descreve, não a teoria em si.', 3),
 ('A parte do estudo que não tem utilidade para o dia a dia do escritório.', false, 'Errada. A aula diz o contrário: sem teoria não há conhecimento do objeto, e conhecer é justamente aplicar a teoria à realidade do escritório.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-direito-visao-panoramica' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "para Pontes de Miranda, citado na aula, teoria e prática são realidades opostas, e o jurista deve escolher entre uma e outra".', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A aula cita Pontes de Miranda justamente para dizer que não existe diferença entre teoria e prática: são dois pontos de vista sobre o mesmo objeto, e o que existe é o conhecimento do objeto.', 1),
 ('Errado', true, 'Certo. A teoria explica a prática e a prática confirma ou infirma a teoria; nenhuma se sustenta sem a outra. Por isso não há escolha a fazer entre elas.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-direito-visao-panoramica' AND a.portal_id = 0),
    'multipla_escolha', 'O exemplo do médico que estudou anos a teoria do câncer de pele, mas não reconhece a mancha no rosto do paciente, serve na aula para mostrar que:', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A teoria é inútil e só a experiência ensina.', false, 'Errada. O médico não conhecia o câncer de pele apesar de ter a prática diante dos olhos; o problema não era excesso de teoria, e sim a falta de ligação entre teoria e realidade.', 1),
 ('Só se conhece algo quando se consegue aplicar a teoria à realidade — o que a aula chama de linguagem da experiência.', true, 'Correta. Ele tinha a teoria e tinha a prática, mas não fazia a associação entre elas; por isso a realidade não aparecia para ele como um câncer de pele. Conhecer é associar teoria e objeto.', 2),
 ('A medicina e o Direito são ciências que não se comparam.', false, 'Errada. A aula usa o exemplo médico exatamente para compará-lo ao estudante de processo civil que sabe a teoria dos recursos e não identifica o recurso cabível.', 3),
 ('O conhecimento científico dispensa a prática.', false, 'Errada. A aula diz que a prática confirma ou infirma a teoria; nenhum tipo de conhecimento do Direito dispensa o objeto que ele descreve.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-direito-visao-panoramica' AND a.portal_id = 0),
    'multipla_escolha', 'Qual é a função da teoria do Direito, conforme fixado na aula?', 'Autoral', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Criar normas jurídicas mais claras para substituir as do legislador.', false, 'Errada. A teoria não cria normas: ela descreve o direito positivo. Criar norma é tarefa do legislador, não do teórico.', 1),
 ('Conhecer o direito positivo por meio de proposições descritivas, reduzindo a complexidade da linguagem jurídica.', true, 'Correta. A teoria do Direito é uma linguagem que olha para a linguagem do direito positivo e reduz suas complexidades — um conjunto de proposições descritivas sobre o conjunto de normas em vigor.', 2),
 ('Julgar os casos concretos no lugar do juiz.', false, 'Errada. Julgar é aplicação do Direito; a teoria fornece o instrumental para conhecer qualquer realidade jurídica, mas não decide casos.', 3),
 ('Ensinar a localizar os artigos de lei aplicáveis a cada situação.', false, 'Errada. Isso descreve o conhecimento técnico, o do manual. A teoria do Direito opera num nível mais depurado, o do conhecimento científico.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-direito-visao-panoramica' AND a.portal_id = 0),
    'multipla_escolha', 'Um profissional conhece toda a legislação, localiza o artigo certo e o aplica ao caso concreto, mas não se pergunta se a norma é constitucional nem se os conceitos usados pelo legislador são coerentes entre si. Na classificação da aula, ele tem conhecimento:', 'Autoral', 'intermediario', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Técnico', true, 'Correta. É o conhecimento do manual: saber operar o Direito, identificar e aplicar dispositivos. As perguntas sobre constitucionalidade, coerência interna e depuração de conceitos pertencem ao conhecimento científico.', 1),
 ('Científico', false, 'Errada. O conhecimento científico é exatamente o que ele não exerce: a linguagem mais depurada que elimina contradições e esclarece os conceitos do legislador.', 2),
 ('Filosófico', false, 'Errada. O conhecimento filosófico é apenas anunciado no trecho da aula, como o terceiro tipo; o perfil descrito na questão é o do operador técnico.', 3),
 ('Nenhum, porque quem não questiona a norma não conhece o Direito.', false, 'Errada. A aula faz questão de dizer que o conhecimento técnico é um conhecimento elaborado, que exige estudo e dedicação. Ele é diferente do científico, não inexistente.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'teoria-geral-do-direito-visao-panoramica' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "teoria geral do Direito é o estudo dos conceitos que se repetem em todas as disciplinas jurídicas, como norma, fato jurídico, relação jurídica, validade, vigência e eficácia".', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É como a aula apresenta o curso: os conceitos que permanecem lineares ao longo de todo o estudo do Direito, qualquer que seja a disciplina.', 1),
 ('Errado', false, 'Errado. A afirmação está correta. Teoria geral não é uma matéria à parte das outras: é o conjunto de conceitos comuns a todas elas — o que torna o seu estudo tão útil.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Primeiro dia de aula de Direito: o que se aprende ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'primeiro-dia-de-aula-de-direito' AND a.portal_id = 0),
    'multipla_escolha', 'Conforme a aula, qual é a diferença entre a Constituição e as leis?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A Constituição trata de direitos, e as leis, de deveres.', false, 'Errada. Tanto a Constituição quanto as leis criam direitos e deveres. A diferença entre elas é de hierarquia, não de assunto.', 1),
 ('A Constituição é a norma mais importante do país, organiza o Estado e garante direitos; nenhuma lei pode contrariá-la.', true, 'Correta. A Constituição está no topo do ordenamento jurídico: organiza o funcionamento do país, confere direitos e garantias ao povo, e toda lei precisa ser compatível com ela.', 2),
 ('A Constituição é feita pelo Judiciário, e as leis, pelo Legislativo.', false, 'Errada. A Constituição foi elaborada por uma Assembleia Constituinte; o Judiciário aplica e interpreta, não escreve a Constituição.', 3),
 ('Não há diferença: Constituição é o nome da primeira lei do país.', false, 'Errada. Há diferença de hierarquia: a Constituição está acima de todas as leis, e é por isso que a lei que a contraria é inconstitucional.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'primeiro-dia-de-aula-de-direito' AND a.portal_id = 0),
    'multipla_escolha', 'O que é ordenamento jurídico?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O conjunto de normas de um país, o seu sistema jurídico, tendo a Constituição no topo.', true, 'Correta. Ordenamento jurídico é o nome do sistema formado por todas as normas em vigor, organizado em hierarquia, com a Constituição como a norma mais alta.', 1),
 ('A ordem em que os processos são julgados no tribunal.', false, 'Errada. Ordem de julgamento é questão de organização do tribunal; ordenamento jurídico é o conjunto de normas do país.', 2),
 ('O documento em que o advogado pede algo ao juiz.', false, 'Errada. Esse documento é a petição. Ordenamento jurídico é o sistema de normas, não uma peça do processo.', 3),
 ('O conjunto de decisões do STF.', false, 'Errada. Decisões do STF integram a jurisprudência; o ordenamento é o conjunto de normas como um todo, com a Constituição no topo.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'primeiro-dia-de-aula-de-direito' AND a.portal_id = 0),
    'multipla_escolha', 'Segundo a aula, o que é uma petição, e o que caracteriza a petição inicial?', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Petição é a decisão do juiz; a inicial é a primeira decisão do processo.', false, 'Errada. Quem decide é o juiz, por sentença ou decisão; petição é o pedido feito pela parte ao juiz, não a resposta dele.', 1),
 ('Petição é o documento escrito pelo qual a parte se comunica com o juiz para pedir algo; a inicial é a que abre a ação, explicando o problema do cliente e pedindo uma providência.', true, 'Correta. Petição vem de pedido. Na petição inicial o advogado expõe o problema e pede que o juiz tome uma providência; ao longo do processo outras petições podem ser juntadas.', 2),
 ('Petição é a audiência em que as partes falam; a inicial é a primeira audiência.', false, 'Errada. Audiência é ato oral, presencial ou virtual. A petição é escrita — é assim que a parte se comunica com o juiz fora da audiência.', 3),
 ('Petição é o recurso contra a sentença; a inicial é o primeiro recurso.', false, 'Errada. Recurso é pedido de revisão de uma decisão já tomada; a petição inicial vem antes de qualquer decisão, porque é ela que inicia o processo.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'primeiro-dia-de-aula-de-direito' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "pleitear em juízo significa recorrer de uma decisão do juiz para um tribunal superior".', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. Pleitear significa pedir. Pleitear em juízo é pedir algo ao Judiciário — dizer ao juiz que um direito foi lesado e pedir uma solução. Recorrer é outra coisa: pedir a revisão de uma decisão.', 1),
 ('Errado', true, 'Certo. A expressão assusta pelo som, mas quer dizer apenas pedir ao Judiciário, normalmente por meio de uma petição.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'primeiro-dia-de-aula-de-direito' AND a.portal_id = 0),
    'multipla_escolha', 'Uma pessoa pediu ao juiz a devolução de R$ 10 mil e o juiz mandou devolver R$ 6 mil. Na linguagem apresentada na aula, o pedido foi julgado:', 'Autoral · OAB', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Procedente', false, 'Errada. Procedente é o pedido concedido por inteiro. Aqui o juiz concedeu apenas parte do valor pedido.', 1),
 ('Parcialmente procedente', true, 'Correta. O pedido foi concedido "mais ou menos", nas palavras da aula: uma parte foi acolhida e outra, negada.', 2),
 ('Improcedente', false, 'Errada. Improcedente é o pedido negado por completo. A pessoa recebeu R$ 6 mil, logo o pedido não foi totalmente rejeitado.', 3),
 ('Inadmissível', false, 'Errada. Inadmissível é o pedido que nem chega a ser examinado no mérito, por faltar um requisito. Aqui o juiz examinou e decidiu o mérito.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'primeiro-dia-de-aula-de-direito' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "antes de julgar o pedido, o juiz ouve também a parte contrária, para ter as duas versões da história".', 'Inspirada em prova · Cebraspe', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É o que a aula descreve — e é o princípio do contraditório, garantido pelo art. 5º, LV, da CF/88: ninguém é julgado sem ter a chance de responder.', 1),
 ('Errado', false, 'Errado. A afirmação está correta. O juiz não decide com base apenas na versão de quem pediu; ouvir a outra parte é exigência constitucional (art. 5º, LV, da CF/88).', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: 7 dicas para quem está começando no Direito ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'sete-dicas-para-quem-esta-comecando' AND a.portal_id = 0),
    'multipla_escolha', 'Por que a aula compara os princípios do Direito a "postes de luz"?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Porque eles orientam o ordenamento jurídico e permanecem mesmo quando as leis mudam.', true, 'Correta. O Direito muda todo dia e as leis sofrem grandes modificações, mas os princípios ficam e iluminam o caminho — por isso conhecê-los facilita entender qualquer matéria e escapar das pegadinhas de prova.', 1),
 ('Porque eles são poucos e fáceis de decorar.', false, 'Errada. A aula não recomenda decorar princípios, e sim entendê-los; a comparação é sobre a função de orientar, não sobre quantidade.', 2),
 ('Porque só aparecem na Constituição.', false, 'Errada. Cada matéria (civil, penal, administrativo) tem os seus princípios; a dica é conhecer os que regem cada disciplina.', 3),
 ('Porque substituem a leitura da lei.', false, 'Errada. Os princípios orientam a interpretação da lei; a aula não diz que dispensam a lei, apenas que são mais estáveis do que ela.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'sete-dicas-para-quem-esta-comecando' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "se o professor de filosofia jurídica tem conhecimento mas não tem didática, a recomendação da aula é deixar a matéria de lado e concentrar-se nas disciplinas de lei".', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A primeira dica é exatamente o oposto: não dá para ficar sem entender filosofia jurídica, porque ela vai fazer falta lá na frente. Se a aula não ajuda, procure vídeos e livros didáticos sobre o tema.', 1),
 ('Errado', true, 'Certo. A falta de didática do professor é um problema real, mas a resposta é buscar outras fontes, não abandonar a disciplina que ensina a raciocinar dentro do Direito.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'sete-dicas-para-quem-esta-comecando' AND a.portal_id = 0),
    'multipla_escolha', 'Segundo a aula, para que serve estudar história do Direito?', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Para decorar datas e nomes que caem em prova.', false, 'Errada. A aula não fala em decorar; fala em perceber influências e aprender com o que já deu certo e errado.', 1),
 ('Para perceber a influência de movimentos e ideias no nosso ordenamento e evitar repetir erros já testados no passado.', true, 'Correta. Leis atuais vêm do Direito romano, de Tomás de Aquino, dos iluministas; e muita ideia que parece nova já foi tentada — saber por que falhou permite pensar soluções melhores.', 2),
 ('Para conhecer apenas o Direito romano, base de todo o ordenamento.', false, 'Errada. Roma é só um dos exemplos citados; a aula também menciona a Idade Média (Tomás de Aquino) e a Revolução Francesa (iluministas).', 3),
 ('Para substituir o estudo das leis atuais, que mudam demais.', false, 'Errada. A história complementa o estudo das leis; ela ajuda a entender por que as normas são como são, não a ignorá-las.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'sete-dicas-para-quem-esta-comecando' AND a.portal_id = 0),
    'multipla_escolha', 'Qual é a orientação da aula para quem entra no curso sem o hábito de estudar e se assusta com a quantidade de conteúdo?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Estudar intensamente nas vésperas das provas, quando a pressão ajuda a concentrar.', false, 'Errada. A aula diz que revisar aos poucos rende muito mais do que deixar tudo para a véspera da prova.', 1),
 ('Estudar um pouco por dia e aumentar gradualmente, porque o hábito se adquire.', true, 'Correta. É a sexta dica: a dificuldade inicial é normal, e o hábito de estudo pode ser adquirido estudando um pouquinho todo dia — ainda que uma horinha — e ampliando a carga com o tempo.', 2),
 ('Desistir das disciplinas iniciais e começar direto pelas leis.', false, 'Errada. Essa é a atitude que a sétima dica critica: quem pula a parte inicial do curso vira robozinho jurídico.', 3),
 ('Estudar somente em grupo, porque sozinho não se aprende Direito.', false, 'Errada. Debater com colegas é a quarta dica, mas ela complementa o estudo individual diário; não o substitui.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'sete-dicas-para-quem-esta-comecando' AND a.portal_id = 0),
    'multipla_escolha', 'A aula usa a expressão "robozinho jurídico" para descrever:', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O estudante que só sabe decorar artigos e não consegue pensar o Direito, por ter pulado a parte inicial do curso.', true, 'Correta. É o alerta da sétima dica: sem pressa para as leis. Quem despreza filosofia, teoria do Estado e introdução aprende a decorar, mas não desenvolve o pensamento crítico que leva mais longe.', 1),
 ('O estudante que usa aplicativos e vídeos para estudar.', false, 'Errada. A aula recomenda vídeos e livros didáticos como apoio. O problema não é a ferramenta, e sim decorar sem pensar.', 2),
 ('O profissional que segue a jurisprudência do STF.', false, 'Errada. Seguir jurisprudência é atividade normal do operador do Direito; a crítica é ao estudo que se limita a decorar.', 3),
 ('O aluno que estuda sozinho e não debate com a turma.', false, 'Errada. A quarta dica trata de debater com colegas, mas o robozinho jurídico é definido pela decoreba sem raciocínio, não pelo isolamento.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'sete-dicas-para-quem-esta-comecando' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "segundo a aula, debater com os colegas o que foi visto em aula — no ônibus ou no grupo de WhatsApp da turma — é uma forma proveitosa de aprender".', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É a quarta dica: o "grupo de estudos do transporte coletivo" e o grupo de WhatsApp, que não serve só para meme e figurinha, ajudam a fixar e a testar argumentos.', 1),
 ('Errado', false, 'Errado. A afirmação reproduz a dica da aula. Debater o conteúdo do dia obriga a organizar o raciocínio e expõe o que ainda não ficou claro.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Como aprender Direito mais rápido, mesmo começando do zero ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'como-aprender-direito-mais-rapido' AND a.portal_id = 0),
    'multipla_escolha', 'Qual é o primeiro passo para aprender Direito mais rápido, segundo a aula?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Escolher desde o início o livro mais completo e aprofundado de cada matéria.', false, 'Errada. Esse é justamente o erro que a aula aponta: o iniciante abre um livro aprofundado, não entende nada e desanima.', 1),
 ('Buscar primeiro o básico: uma ideia geral de cada assunto, de forma simples e resumida.', true, 'Correta. A base vem antes do aprofundamento — é o arroz antes do risoto. Só depois de compreender as premissas gerais vale a pena aprofundar.', 2),
 ('Assistir a séries de advogados para se familiarizar com o ambiente jurídico.', false, 'Errada. A aula abre com o alerta de que o método não é para quem acha que aprende Direito assistindo a série; é para quem vai estudar de verdade.', 3),
 ('Decorar os artigos mais cobrados no Exame da OAB.', false, 'Errada. O método é sobre compreender, não decorar; ele serve para a OAB e para concursos porque constrói a base, não porque memoriza artigos.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'como-aprender-direito-mais-rapido' AND a.portal_id = 0),
    'multipla_escolha', 'O que a metáfora do arroz e do risoto quer dizer sobre o estudo do Direito?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Que o Direito é simples como cozinhar arroz e não exige dedicação.', false, 'Errada. A metáfora não diz que o Direito é fácil; diz que existe uma ordem de aprendizado, do simples para o sofisticado.', 1),
 ('Que os assuntos avançados são inúteis para o iniciante.', false, 'Errada. O risoto é o objetivo final; a aula só recomenda que ele venha depois de dominado o arroz — o aprofundamento é desejável, mas na hora certa.', 2),
 ('Que não se deve pular etapas: primeiro a base (o arroz), depois o aprofundamento (o risoto de camarão).', true, 'Correta. Ninguém prepara risoto de camarão com limão siciliano e gorgonzola sem saber cozinhar arroz; querer conhecimento profundo sem a base vira gororoba.', 3),
 ('Que cada matéria deve ser estudada em uma receita própria, sem relação com as demais.', false, 'Errada. A metáfora fala de ordem (base antes da sofisticação), não de isolar as matérias umas das outras.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'como-aprender-direito-mais-rapido' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "para a aula, estudar de forma simplificada significa estudar com menos qualidade, e por isso deve ser evitado por quem quer ir bem em concursos".', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A aula pede estudo simplificado com qualidade — o que significa entender bem o que está sendo estudado. Simplificar é uma etapa do método, não uma perda de qualidade, e o método vale para concursos e OAB.', 1),
 ('Errado', true, 'Certo. Simplificar primeiro não é estudar menos: é construir a base que permite compreender o conteúdo avançado depois. A aula valoriza livros fáceis de entender por esse motivo.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'como-aprender-direito-mais-rapido' AND a.portal_id = 0),
    'multipla_escolha', 'Qual é, segundo a aula, o erro mais comum do estudante que está começando?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Estudar pouco tempo por dia.', false, 'Errada. A aula não trata da quantidade de horas; o problema apontado é a ordem em que se estuda, não o tempo.', 1),
 ('Querer se aprofundar demais antes de entender as premissas gerais do assunto.', true, 'Correta. O iniciante pega o livro super aprofundado, abre no capítulo dos princípios por trás do assunto e não entende nada — porque tentou o risoto sem nunca ter feito arroz.', 2),
 ('Ler apenas resumos e nunca aprofundar.', false, 'Errada. O aprofundamento vem depois, quando as premissas estão compreendidas; a aula não critica quem começa pelo resumo, e sim quem começa pelo aprofundado.', 3),
 ('Estudar por vídeos em vez de livros.', false, 'Errada. A aula não opõe vídeos e livros; recomenda materiais fáceis de entender, em qualquer formato, para a fase inicial.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'como-aprender-direito-mais-rapido' AND a.portal_id = 0),
    'multipla_escolha', 'A aula avisa, logo no início, que o método NÃO é indicado para:', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Quem já é formado em Direito.', false, 'Errada. A aula não exclui formados; exclui quem não está disposto a estudar. Aliás, ela observa que o mercado de cursos é voltado a formados, e não ao iniciante.', 1),
 ('Quem estuda para concursos públicos.', false, 'Errada. A aula diz expressamente que o método serve para a faculdade, para concursos públicos e para o Exame da OAB.', 2),
 ('Quem vive no faz de conta e acha que aprende Direito assistindo a série de advogado, sem estudar.', true, 'Correta. O método é para quem tem os pés no chão e sabe que vai precisar estudar; sem essa disposição, nenhum passo a passo funciona.', 3),
 ('Quem prefere livros a vídeos.', false, 'Errada. O formato do material não é o critério; a aula só pede que ele seja fácil de entender na fase inicial.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'como-aprender-direito-mais-rapido' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "de acordo com a aula, o aprofundamento nos assuntos jurídicos deve vir depois que as premissas gerais estiverem compreendidas".', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. A ordem é a essência do método: base primeiro, sem pular etapas, e só então o risoto jurídico — o estudo aprofundado.', 1),
 ('Errado', false, 'Errado. A afirmação reproduz a conclusão da aula. Aprofundar antes de entender a base é o erro que ela mais critica.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Poder constituinte: quem escreve a Constituição ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'poder-constituinte' AND a.portal_id = 0),
    'multipla_escolha', 'São características do poder constituinte originário:', 'Autoral · OAB', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Inicial, ilimitado juridicamente e incondicionado.', true, 'Correta. O originário cria a Constituição do zero: é inicial (inaugura a ordem jurídica), ilimitado juridicamente (não obedece à Constituição anterior) e incondicionado (não segue forma pré-estabelecida).', 1),
 ('Derivado, limitado e condicionado.', false, 'Errada. Essas são as marcas do poder constituinte derivado, o de emenda, que nasce dentro da Constituição e por isso tem limites e rito.', 2),
 ('Inicial, mas sujeito aos limites materiais do art. 60, § 4º.', false, 'Errada. As cláusulas pétreas limitam o poder de emenda, não o originário — que pode, inclusive, deixar de repetir uma cláusula pétrea da Constituição anterior.', 3),
 ('Ilimitado, mas obrigado a seguir o rito de dois turnos e três quintos.', false, 'Errada. Esse rito (art. 60, § 2º) é o limite formal do poder derivado. O originário é incondicionado: não há rito imposto a ele.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'poder-constituinte' AND a.portal_id = 0),
    'multipla_escolha', 'O Congresso aprovou uma proposta de emenda durante a vigência de estado de sítio. Segundo a aula, isso viola um limite:', 'Autoral', 'intermediario', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Formal, porque o rito de votação não foi seguido.', false, 'Errada. O limite formal diz respeito ao procedimento (iniciativa, dois turnos, três quintos). O problema aqui é o momento, não o procedimento.', 1),
 ('Circunstancial, porque a Constituição não pode ser emendada na vigência de intervenção federal, estado de defesa ou estado de sítio.', true, 'Correta. É o art. 60, § 1º, da CF/88: em situações de anormalidade institucional a Constituição fica protegida contra alterações. A aula lista esse limite ao lado dos formais e dos materiais.', 2),
 ('Material, porque o estado de sítio é cláusula pétrea.', false, 'Errada. Limite material é o conteúdo protegido pelas cláusulas pétreas (art. 60, § 4º). Estado de sítio não está nesse rol; ele é uma circunstância que impede a emenda.', 3),
 ('Nenhum: a Constituição pode ser emendada a qualquer tempo.', false, 'Errada. O art. 60, § 1º, proíbe expressamente a emenda durante intervenção federal, estado de defesa ou estado de sítio.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'poder-constituinte' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "o poder constituinte derivado é quase constituinte, e por isso a emenda constitucional não pode ser declarada inconstitucional".', 'Inspirada em prova · Cebraspe', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A aula chama isso de confusão comum. O poder de emenda nasce dentro da Constituição e está sujeito aos limites do art. 60; a emenda que os viola é inconstitucional, e o STF pode declará-la assim.', 1),
 ('Errado', true, 'Certo. Emenda é obra do poder derivado, limitado e condicionado; por isso pode ser controlada — por vício formal (rito do art. 60), circunstancial (§ 1º) ou material (cláusulas pétreas do § 4º).', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'poder-constituinte' AND a.portal_id = 0),
    'multipla_escolha', 'Os limites materiais ao poder de emenda correspondem a:', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Ao rito de dois turnos e três quintos em cada Casa.', false, 'Errada. Isso é limite formal (art. 60, § 2º): diz como se emenda, não o que não se pode emendar.', 1),
 ('À proibição de emenda durante intervenção federal, estado de defesa ou de sítio.', false, 'Errada. Isso é limite circunstancial (art. 60, § 1º): diz quando não se pode emendar.', 2),
 ('Às cláusulas pétreas do art. 60, § 4º, que impedem emenda tendente a abolir certos conteúdos.', true, 'Correta. Limite material é o conteúdo intocável: forma federativa, voto direto, secreto, universal e periódico, separação dos Poderes e direitos e garantias individuais.', 3),
 ('À exigência de sanção do Presidente da República.', false, 'Errada. Emenda constitucional não passa por sanção presidencial: é promulgada pelas Mesas da Câmara e do Senado (art. 60, § 3º).', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'poder-constituinte' AND a.portal_id = 0),
    'multipla_escolha', 'Sobre a relação entre o poder constituinte originário e a Constituição anterior, é correto afirmar que o originário:', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Deve respeitar as cláusulas pétreas da Constituição anterior.', false, 'Errada. Cláusula pétrea limita o poder de emenda da própria Constituição que a prevê; não vincula o poder que cria uma Constituição nova.', 1),
 ('Só pode agir se autorizado por emenda da Constituição anterior.', false, 'Errada. O originário é incondicionado e não depende de autorização de ninguém — é ele que funda a nova ordem.', 2),
 ('Não obedece à Constituição anterior; é ele que rompe com ela.', true, 'Correta. É a definição da aula: o originário cria uma Constituição nova, do zero, e por isso não está preso à ordem que substitui.', 3),
 ('Apenas atualiza a Constituição anterior, sem rompê-la.', false, 'Errada. Atualizar é tarefa do poder derivado (reforma). O originário substitui a ordem constitucional, não a atualiza.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'poder-constituinte' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "o poder de emenda é criado pela própria Constituição, que também define seus limites".', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. O poder constituinte derivado nasce dentro da Constituição — no art. 60 —, que fixa quem pode propor, o rito, as circunstâncias proibidas e as cláusulas pétreas.', 1),
 ('Errado', false, 'Errado. A afirmação está correta. É justamente por ser criado e limitado pela Constituição que o poder de emenda se submete a controle de constitucionalidade.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Remédios constitucionais sem decoreba ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'remedios-constitucionais' AND a.portal_id = 0),
    'multipla_escolha', 'Um cidadão pediu a um órgão público acesso às informações que constam sobre ele em um banco de dados oficial e teve o pedido negado. Qual é o remédio constitucional adequado?', 'Autoral · OAB', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Habeas corpus', false, 'Errada. Habeas corpus protege a liberdade de locomoção (art. 5º, LXVIII). Ninguém está preso ou ameaçado de prisão aqui.', 1),
 ('Habeas data', true, 'Correta. O habeas data assegura o conhecimento e a correção de informações relativas à pessoa do impetrante em bancos de dados públicos ou de caráter público (art. 5º, LXXII). O que foi violado foi o acesso a dados próprios — logo, esse é o remédio.', 2),
 ('Mandado de segurança', false, 'Errada. O mandado de segurança é residual: cabe para direito líquido e certo não amparado por habeas corpus ou habeas data (art. 5º, LXIX). Como existe remédio específico para dados pessoais, ele não é o adequado.', 3),
 ('Ação popular', false, 'Errada. Ação popular serve para anular ato lesivo ao patrimônio público (art. 5º, LXXIII), não para obter informações pessoais.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'remedios-constitucionais' AND a.portal_id = 0),
    'multipla_escolha', 'Uma pessoa está presa sem ordem escrita de autoridade competente. O remédio para restabelecer sua liberdade é:', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Habeas corpus', true, 'Correta. Foi violada a liberdade de locomoção, e o habeas corpus existe para quem sofre ou se acha ameaçado de sofrer violência ou coação nessa liberdade por ilegalidade ou abuso de poder (art. 5º, LXVIII).', 1),
 ('Mandado de injunção', false, 'Errada. Mandado de injunção ataca a falta de norma regulamentadora que inviabiliza um direito (art. 5º, LXXI). Não há lacuna de lei aqui — há prisão ilegal.', 2),
 ('Habeas data', false, 'Errada. Habeas data trata de acesso e correção de informações pessoais em bancos de dados (art. 5º, LXXII), não de liberdade física.', 3),
 ('Ação popular', false, 'Errada. Ação popular protege o patrimônio público e a moralidade administrativa (art. 5º, LXXIII); não é instrumento de defesa da liberdade individual.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'remedios-constitucionais' AND a.portal_id = 0),
    'multipla_escolha', 'A Constituição prevê um direito, mas o Congresso nunca editou a lei necessária para que ele possa ser exercido. O remédio pensado para essa situação é:', 'Autoral', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Mandado de segurança', false, 'Errada. O mandado de segurança pressupõe direito líquido e certo violado por ato de autoridade; aqui o problema é a ausência de norma, não um ato ilegal.', 1),
 ('Mandado de injunção', true, 'Correta. O mandado de injunção é concedido sempre que a falta de norma regulamentadora torne inviável o exercício de direitos e liberdades constitucionais (art. 5º, LXXI). O que foi violado foi o direito de exercer algo que a Constituição já garantiu.', 2),
 ('Habeas data', false, 'Errada. Habeas data cuida de informações pessoais em bancos de dados (art. 5º, LXXII). Nada a ver com omissão legislativa.', 3),
 ('Ação popular', false, 'Errada. Ação popular anula ato lesivo ao patrimônio público (art. 5º, LXXIII); a omissão do legislador não é o alvo dela.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'remedios-constitucionais' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "o mandado de segurança protege qualquer direito líquido e certo, inclusive a liberdade de locomoção e o acesso a dados pessoais".', 'Inspirada em prova · Cebraspe', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O mandado de segurança é residual: o art. 5º, LXIX, diz que ele protege direito líquido e certo "não amparado por habeas corpus ou habeas data". Liberdade de locomoção é caso de habeas corpus; dados pessoais, de habeas data.', 1),
 ('Errado', true, 'Certo. A aula resume assim: mandado de segurança é para direito líquido e certo que não seja liberdade de locomoção nem dado pessoal — esses têm remédio próprio.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'remedios-constitucionais' AND a.portal_id = 0),
    'multipla_escolha', 'A ação popular tem por finalidade:', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Garantir o acesso do cidadão a informações sobre si em bancos públicos.', false, 'Errada. Isso é o habeas data (art. 5º, LXXII). A ação popular não trata de dados pessoais.', 1),
 ('Anular ato lesivo ao patrimônio público, à moralidade administrativa, ao meio ambiente ou ao patrimônio histórico e cultural.', true, 'Correta. É o art. 5º, LXXIII: qualquer cidadão pode propô-la para anular ato lesivo a esses bens. O que se protege é o interesse coletivo, não um direito individual do autor.', 2),
 ('Proteger a liberdade de locomoção contra abuso de poder.', false, 'Errada. Isso é o habeas corpus (art. 5º, LXVIII).', 3),
 ('Suprir a falta de lei regulamentadora de um direito constitucional.', false, 'Errada. Isso é o mandado de injunção (art. 5º, LXXI). A ação popular ataca um ato praticado, não uma omissão de legislar.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'remedios-constitucionais' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "o truque sugerido na aula para escolher o remédio constitucional é perguntar primeiro qual direito foi violado, e só depois procurar o nome do remédio".', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. Cada remédio protege um bem específico — locomoção, dados pessoais, direito líquido e certo residual, direito sem norma regulamentadora, patrimônio público. Identificado o que foi violado, o nome do remédio vem sozinho.', 1),
 ('Errado', false, 'Errado. A afirmação reproduz o método da aula. Decorar nomes sem saber o que cada um protege é o caminho mais curto para errar a correspondência na prova.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Separação de poderes: freios e contrapesos ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'separacao-dos-poderes' AND a.portal_id = 0),
    'multipla_escolha', 'O art. 2º da CF/88 diz que os Poderes são "independentes e harmônicos entre si". Segundo a aula, isso significa que:', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Nenhum Poder manda no outro, mas todos se controlam mutuamente.', true, 'Correta. Independentes porque não há hierarquia entre eles; harmônicos porque se fiscalizam reciprocamente — é o sistema de freios e contrapesos.', 1),
 ('Cada Poder atua isolado, sem interferir nos demais.', false, 'Errada. Isolamento total contraria a harmonia: o veto, a derrubada do veto e o controle de constitucionalidade são interferências previstas pela própria Constituição.', 2),
 ('O Legislativo é superior, porque faz as leis que os outros cumprem.', false, 'Errada. Não há hierarquia entre os Poderes. O Legislativo faz a lei, mas o Executivo pode vetá-la e o Judiciário pode declará-la inconstitucional.', 3),
 ('O Judiciário é superior, porque dá a palavra final.', false, 'Errada. O Judiciário controla, mas também é controlado: o Senado aprova ministros do STF, e o Legislativo define o orçamento. Independência não é supremacia.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'separacao-dos-poderes' AND a.portal_id = 0),
    'multipla_escolha', 'Qual das situações abaixo é exemplo de freio e contrapeso do Executivo sobre o Legislativo?', 'Autoral · OAB', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O Senado julga o Presidente por crime de responsabilidade.', false, 'Errada. Esse é um controle do Legislativo sobre o Executivo, não o contrário.', 1),
 ('O Presidente veta um projeto de lei aprovado pelo Congresso.', true, 'Correta. O veto é a ferramenta clássica do Executivo para frear o Legislativo; e o Congresso, por sua vez, pode derrubar o veto — contrapeso do contrapeso.', 2),
 ('O STF declara inconstitucional uma lei.', false, 'Errada. Esse é o controle do Judiciário sobre o Legislativo (e sobre o Executivo, quando o ato é dele).', 3),
 ('O Congresso derruba o veto presidencial.', false, 'Errada. A derrubada do veto é o Legislativo controlando o Executivo. A questão pede o sentido inverso.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'separacao-dos-poderes' AND a.portal_id = 0),
    'multipla_escolha', 'Quando o Senado julga o Presidente da República por crime de responsabilidade, ele exerce:', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Função típica legislativa.', false, 'Errada. A função típica do Legislativo é legislar e fiscalizar. Julgar é exceção prevista na Constituição (art. 52, I).', 1),
 ('Função atípica de julgar.', true, 'Correta. Julgar é típico do Judiciário; quando o Senado julga o impeachment, exerce função atípica — o exemplo que a aula usa para o Legislativo.', 2),
 ('Função típica do Judiciário, por delegação do STF.', false, 'Errada. Não há delegação: a competência do Senado vem diretamente da Constituição, e o STF não participa do julgamento (seu presidente apenas preside a sessão).', 3),
 ('Função administrativa.', false, 'Errada. Administrar é organizar a própria estrutura (concursos, orçamento). Julgar o Presidente é atividade jurisdicional, ainda que exercida por órgão político.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'separacao-dos-poderes' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "a edição de medida provisória pelo Presidente da República é exemplo de função típica do Poder Executivo".', 'Inspirada em prova · Cebraspe', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. Medida provisória tem força de lei (art. 62): ao editá-la, o Executivo legisla — função típica do Legislativo. Por isso a aula a cita como função atípica do Executivo.', 1),
 ('Errado', true, 'Certo. A função típica do Executivo é administrar. Legislar por medida provisória é função atípica, admitida pela Constituição em casos de relevância e urgência.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'separacao-dos-poderes' AND a.portal_id = 0),
    'multipla_escolha', 'Uma proposta de emenda constitucional pretende transferir ao Presidente da República o poder de julgar, em última instância, todos os processos criminais. Segundo a aula, essa emenda seria:', 'Autoral', 'intermediario', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Válida, porque emenda constitucional pode alterar qualquer parte da Constituição.', false, 'Errada. Emenda tem limites materiais: o art. 60, § 4º, veda proposta tendente a abolir, entre outros, a separação dos Poderes.', 1),
 ('Válida, desde que aprovada por três quintos em dois turnos.', false, 'Errada. O rito (art. 60, § 2º) resolve o limite formal, mas não o material: nem com unanimidade se pode abolir a separação dos Poderes.', 2),
 ('Inconstitucional, por tender a abolir a separação dos Poderes, que é cláusula pétrea.', true, 'Correta. Concentrar no Executivo a função de julgar esvazia o Judiciário e fere o art. 60, § 4º, III. A separação dos Poderes está protegida contra emenda.', 3),
 ('Inconstitucional apenas se o STF discordar do mérito.', false, 'Errada. A inconstitucionalidade não depende de opinião sobre o mérito: decorre do limite material expresso no art. 60, § 4º, III.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'separacao-dos-poderes' AND a.portal_id = 0),
    'multipla_escolha', 'Um tribunal realiza concurso público para contratar seus próprios servidores. Segundo a aula, trata-se de:', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Função típica do Judiciário.', false, 'Errada. A função típica do Judiciário é julgar. Organizar concurso e gerir orçamento é administrar.', 1),
 ('Função atípica administrativa do Judiciário.', true, 'Correta. É o exemplo da aula: o Judiciário administra ao cuidar de seus concursos e de seu orçamento — função típica do Executivo, exercida de forma atípica.', 2),
 ('Usurpação de competência do Executivo.', false, 'Errada. A Constituição garante autonomia administrativa aos tribunais (art. 99); administrar a própria estrutura é função atípica legítima, não invasão.', 3),
 ('Função legislativa, porque o edital tem força de lei.', false, 'Errada. Edital de concurso é ato administrativo, não lei. Ele vincula os candidatos e a administração, mas não inova o ordenamento.', 4)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Controle de constitucionalidade: o resumo que faz sentido ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'controle-de-constitucionalidade-resumo' AND a.portal_id = 0),
    'multipla_escolha', 'Segundo a aula, quais são os dois pressupostos do controle de constitucionalidade?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Supremacia da Constituição e rigidez constitucional.', true, 'Correta. Supremacia: a Constituição é o fundamento de validade de todo ato normativo, e nenhuma lei pode contrariá-la. Rigidez: alterá-la é mais difícil do que alterar uma lei (art. 60), logo a lei não tem o poder de mudá-la.', 1),
 ('Separação dos Poderes e federalismo.', false, 'Errada. São princípios estruturais importantes (e cláusulas pétreas), mas não são os pressupostos lógicos do controle apontados na aula.', 2),
 ('Supremacia da Constituição e reserva de plenário.', false, 'Errada. A reserva de plenário (art. 97) é uma regra de procedimento do controle nos tribunais, não um pressuposto dele.', 3),
 ('Rigidez constitucional e modulação dos efeitos.', false, 'Errada. Modulação é exceção aos efeitos da declaração de inconstitucionalidade, não pressuposto do controle.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'controle-de-constitucionalidade-resumo' AND a.portal_id = 0),
    'multipla_escolha', 'Em regra, a declaração de inconstitucionalidade produz efeitos retroativos (ex tunc). Sobre a exceção — a modulação dos efeitos —, a aula ensina que:', 'Autoral · OAB', 'intermediario', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Qualquer juiz pode modular os efeitos, por maioria simples.', false, 'Errada. A aula atribui a modulação ao STF, e por quórum qualificado — não a qualquer juiz nem por maioria simples.', 1),
 ('O STF, por no mínimo dois terços dos seus membros, pode dar efeitos não retroativos (ex nunc) ou fixar data futura, para resguardar a segurança jurídica ou o excepcional interesse social.', true, 'Correta. São oito ministros. A regra está no art. 27 da Lei 9.868/99: a nulidade continua sendo a regra, mas o STF pode restringir os efeitos quando apagar tudo o que a lei produziu causaria mais insegurança do que mantê-lo.', 2),
 ('A modulação transforma a lei inconstitucional em constitucional.', false, 'Errada. A lei continua inconstitucional e nula; a modulação apenas define a partir de quando a declaração produz efeitos.', 3),
 ('A modulação é obrigatória em toda declaração de inconstitucionalidade.', false, 'Errada. É exceção, condicionada à segurança jurídica ou ao interesse social e ao quórum de dois terços. A regra é o efeito ex tunc.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'controle-de-constitucionalidade-resumo' AND a.portal_id = 0),
    'multipla_escolha', 'Uma lei ordinária autoriza o uso de tortura em interrogatórios. Outra norma é uma emenda constitucional promulgada durante estado de sítio. Na classificação quanto ao vício, elas são, respectivamente:', 'Autoral', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Formalmente e materialmente inconstitucionais.', false, 'Errada. A ordem está invertida: a lei da tortura tem problema de conteúdo (material); a emenda durante o sítio, de procedimento (formal).', 1),
 ('Materialmente e formalmente inconstitucionais.', true, 'Correta. Material: o conteúdo contraria a Constituição, que proíbe a tortura (art. 5º, III). Formal: o ato desobedeceu às regras do processo legislativo — o art. 60, § 1º, veda emenda na vigência de estado de sítio.', 2),
 ('Ambas apenas materialmente inconstitucionais.', false, 'Errada. A emenda no estado de sítio pode até ter conteúdo impecável; o vício dela é de momento e procedimento, isto é, formal.', 3),
 ('Inconstitucionais por omissão.', false, 'Errada. Omissão é ausência de norma regulamentadora. Aqui as duas normas existem e foram editadas — a inconstitucionalidade é por ação.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'controle-de-constitucionalidade-resumo' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "no controle difuso, a decisão que reconhece a inconstitucionalidade vale para todos (erga omnes), porque a lei é nula".', 'Inspirada em prova · Cebraspe', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. No controle difuso, ou concreto, a inconstitucionalidade é reconhecida dentro de um processo e a decisão produz efeitos apenas entre as partes (inter partes). Efeito para todos é característica do controle concentrado.', 1),
 ('Errado', true, 'Certo. Difuso: qualquer juiz, caso concreto, efeito inter partes. Concentrado: STF ou TJ, em tese, sem caso concreto. A aula insiste nessa diferença porque é a mais cobrada.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'controle-de-constitucionalidade-resumo' AND a.portal_id = 0),
    'multipla_escolha', 'Uma câmara de cinco desembargadores de um Tribunal de Justiça, por três votos a dois, declarou inconstitucional uma lei municipal em um recurso. Segundo a aula, a decisão:', 'Autoral', 'intermediario', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('É válida, porque no controle difuso qualquer órgão judicial pode declarar a inconstitucionalidade.', false, 'Errada. Qualquer juiz ou tribunal pode exercer o controle difuso, mas dentro de um tribunal a declaração está sujeita à reserva de plenário — a câmara não pode fazê-la sozinha.', 1),
 ('Viola a cláusula de reserva de plenário do art. 97: em tribunal, só o plenário ou o órgão especial, por maioria absoluta, declara a inconstitucionalidade.', true, 'Correta. Turma ou câmara não declara inconstitucionalidade, e maioria simples não basta. A regra vale no controle difuso e no concentrado; só o juiz singular, que não tem colegiado, decide sozinho.', 2),
 ('É válida, porque lei municipal só pode ser controlada pelo TJ.', false, 'Errada. O problema não é a competência do TJ, e sim o órgão interno que decidiu (câmara) e o quórum (maioria simples), contrariando o art. 97.', 3),
 ('Só seria válida se proferida pelo STF.', false, 'Errada. O TJ pode declarar a inconstitucionalidade de lei municipal, tanto no difuso quanto no concentrado (tendo por parâmetro a constituição estadual, art. 125, § 2º); basta respeitar a reserva de plenário.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'controle-de-constitucionalidade-resumo' AND a.portal_id = 0),
    'certo_errado', 'Julgue: "emendas constitucionais não podem ser declaradas inconstitucionais, porque passam a integrar a própria Constituição".', 'Autoral · OAB', 'intermediario', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A aula fecha com essa curiosidade: emenda não tem a mesma hierarquia das normas originárias e pode ser declarada inconstitucional em duas situações — conteúdo tendente a abolir cláusula pétrea (art. 60, § 4º) ou desrespeito ao rito do art. 60.', 1),
 ('Errado', true, 'Certo. Emenda é obra do poder constituinte derivado, limitado pela Constituição; por isso o STF pode controlá-la, tanto pelo conteúdo quanto pelo procedimento.', 2)
) AS v(texto, correta, comentario, ordem);

-- ---------- As três aulas constitucionais saem de 'aprovado' e ganham vídeo ----------
UPDATE aula SET status = 'publicado', video_provedor = 'LOCAL', video_id = 'poder-constituinte.mp4'
 WHERE slug = 'poder-constituinte' AND portal_id = 0;
UPDATE aula SET status = 'publicado', video_provedor = 'LOCAL', video_id = 'remedios-constitucionais.mp4'
 WHERE slug = 'remedios-constitucionais' AND portal_id = 0;
UPDATE aula SET status = 'publicado', video_provedor = 'LOCAL', video_id = 'separacao-dos-poderes.mp4'
 WHERE slug = 'separacao-dos-poderes' AND portal_id = 0;
