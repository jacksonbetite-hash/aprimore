-- =====================================================================
-- Conteúdo de demonstração — portal do professor "Prof. Otávio Lins"
-- (máscara: otaviolins), curso "Direito Penal descomplicado".
--
-- NÃO é migração. O portal é criado pela interface ANTES de este arquivo
-- rodar; tudo aqui o referencia por (SELECT id FROM portal WHERE mascara
-- = 'otaviolins'). Nenhum ID numérico fixo.
--
-- Uso:
--   docker exec -i aprimoreosaber-db-1 psql -U aprimore -d aprimoreosaber \
--     -v ON_ERROR_STOP=1 < scripts/demo/professor-otaviolins-penal.sql
--
-- Vídeos (provedor LOCAL): otaviolins-penal-parte-1.mp4 e
-- otaviolins-penal-parte-2.mp4 — trechos 0:00-6:00 e 6:00-12:00 de
-- "Direito Penal - aula 1", canal Saber Direito (CC BY).
-- =====================================================================

-- ---------- Área ----------
INSERT INTO area (portal_id, slug, nome, ordem)
SELECT p.id, 'penal', 'Direito Penal', 1
FROM portal p WHERE p.mascara = 'otaviolins';

-- ---------- Matéria ----------
-- `destaque` e `nivel` são de db/043: este é o curso que abre a página de
-- cursos no banner grande, e o nível é o que alimenta o filtro
-- "Todos os níveis". O curso de Administrativo (criado pelo painel, no
-- roteiro) fica com o outro nível — com um só, o filtro não teria o que
-- filtrar e a tela não provaria nada.
INSERT INTO materia (portal_id, area_id, slug, nome, ementa, onda, status, professor, ordem,
                     na_vitrine_plataforma, destaque, nivel)
SELECT p.id, ar.id, 'direito-penal-descomplicado', 'Direito Penal descomplicado',
  'Um mapa do Direito Penal para quem está começando: o princípio da legalidade, as leis que redesenharam o combate ao crime organizado e o que muda na prática quando o Congresso cria um crime novo. Aulas curtas, com exemplos, para a faculdade e para o concurso.',
  1, 'publicado', 'Prof. Otávio Lins', 1, true, true, 'Graduação'
FROM portal p
JOIN area ar ON ar.portal_id = p.id AND ar.slug = 'penal'
WHERE p.mascara = 'otaviolins';

-- ---------- Assunto ----------
INSERT INTO assunto (portal_id, materia_id, slug, nome, ordem)
SELECT p.id, m.id, 'introducao-ao-direito-penal', 'Introdução ao Direito Penal', 1
FROM portal p
JOIN materia m ON m.portal_id = p.id AND m.slug = 'direito-penal-descomplicado'
WHERE p.mascara = 'otaviolins';

-- ---------- Aulas ----------
INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
SELECT p.id, s.id, 'direito-penal-por-onde-comecar-parte-1', 'Direito Penal: por onde começar (parte 1)', 360,
$r$Toda lei penal nova começa pelo mesmo lugar: o art. 1º do Código Penal. Não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal — é o princípio da legalidade, repetido no art. 5º, XXXIX, da CF/88. E o inciso XL completa: a lei penal não retroage, salvo para beneficiar o réu. Guarde essa dupla, porque ela é a chave para entender tudo o que vem a seguir: cada lei que endurece o tratamento de um crime só alcança fatos praticados depois de ela entrar em vigor.

A aula abre com um panorama das leis que redesenharam o combate ao crime organizado em 2012 e 2013 — o pano de fundo do curso, que é a criminalidade organizada e a Lei 12.850/2013 (ela revogou a antiga Lei 9.034/1995). A primeira é a Lei 12.683/2012, que reformou a Lei de Lavagem de Capitais (Lei 9.613/1998). Duas mudanças importam: a lei ampliou a colaboração (delação) premiada e acabou com o rol taxativo de crimes antecedentes.

Esse segundo ponto é o que mais cai. Antes de 2012, só havia lavagem se o dinheiro viesse de uma lista fechada de crimes (tráfico, crimes praticados por organização criminosa etc.). Hoje o art. 1º da Lei 9.613/1998 fala em bens provenientes de qualquer infração penal — e infração penal abrange crime e contravenção. Resultado: até o lucro do jogo do bicho, que é contravenção, pode ser objeto de lavagem. Como isso é mudança para pior, vale só para lavagens praticadas depois da lei (art. 1º do CP; art. 5º, XL, da CF/88).

A segunda é a Lei 12.720/2012, que criou no Código Penal o crime de constituição de milícia privada (art. 288-A) e uma causa de aumento no homicídio praticado por milícia privada, sob pretexto de prestar serviço de segurança, ou por grupo de extermínio (art. 121, § 6º: pena aumentada de um terço até a metade). Atenção à diferença: a milícia é uma espécie de associação armada, mas não precisa ter estrutura ordenada e divisão de tarefas — requisitos que fazem parte do conceito de organização criminosa.

A terceira é a Lei 12.694/2012, que trouxe o juízo colegiado em primeiro grau para crimes praticados por organizações criminosas. Antes, o juiz de primeira instância sempre julgava sozinho. Com a lei, se ele demonstrar, em decisão fundamentada, que há risco à sua integridade física, pode convocar mais dois juízes criminais por sorteio eletrônico e formar um colegiado de três — o que dilui a pressão sobre uma única pessoa. O Pacote Anticrime (Lei 13.964/2019) foi além e autorizou os tribunais a criar varas criminais colegiadas permanentes para esses crimes (art. 1º-A da Lei 12.694/2012).

Na parte 2 o professor fecha o panorama com a Lei 12.830/2013 (a investigação conduzida pelo delegado de polícia) e entra, enfim, na Lei das Organizações Criminosas.

Vídeo: "Direito Penal - aula 1", canal Saber Direito (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 0:00 a 6:00.$r$,
  true, true, 'publicado', 1, 'LOCAL', 'otaviolins-penal-parte-1.mp4'
FROM portal p
JOIN materia m ON m.portal_id = p.id AND m.slug = 'direito-penal-descomplicado'
JOIN assunto s ON s.materia_id = m.id AND s.slug = 'introducao-ao-direito-penal'
WHERE p.mascara = 'otaviolins';

INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
SELECT p.id, s.id, 'direito-penal-por-onde-comecar-parte-2', 'Direito Penal: por onde começar (parte 2)', 360,
$r$A aula retoma o panorama legislativo com a Lei 12.830/2013, que cuida da investigação criminal conduzida pelo delegado de polícia. Ela reconhece que as funções de polícia judiciária e a apuração de infrações penais são de natureza jurídica, essenciais e exclusivas de Estado (art. 2º). Em outras palavras: o delegado não é só um agente administrativo — é operador do Direito, como o juiz, o promotor e o advogado.

O ponto mais cobrado é o indiciamento, ato privativo do delegado de polícia, feito por decisão fundamentada, mediante análise técnico-jurídica do fato (art. 2º, § 6º). Daí a pergunta clássica: o juiz pode mandar o delegado indiciar alguém? Não. O STF decidiu, no HC 115.015/SP (2ª Turma, rel. Min. Teori Zavascki, 2013), que o juiz que determina o indiciamento invade função da polícia e fere o sistema acusatório — quem acusa é o Ministério Público, não o juiz. Hoje esse sistema está escrito no art. 3º-A do CPP, incluído pelo Pacote Anticrime (Lei 13.964/2019).

Com o terreno preparado, começa o estudo da Lei 12.850/2013, a Lei das Organizações Criminosas, que revogou a Lei 9.034/1995 e passou a definir o que é uma organização criminosa (art. 1º, § 1º): associação de quatro ou mais pessoas, estruturalmente ordenada e com divisão de tarefas, ainda que informal, para obter vantagem de qualquer natureza mediante a prática de infrações penais com pena máxima superior a quatro anos ou de caráter transnacional. Guarde os quatro elementos: número mínimo, estrutura, finalidade e gravidade.

Antes de mergulhar no conceito, o professor faz uma crítica: o Congresso virou uma fábrica de leis penais, como se cada lei nova resolvesse o problema por si. É o chamado direito penal simbólico — o Estado usa a pena para dizer à sociedade que está agindo, aumenta penas, lota presídios e deixa de lado as políticas públicas de educação, saúde e trabalho. Quem está preso um dia sai, e o problema volta para a rua. A crítica não é contra punir; é contra fingir que só a punição resolve.

E crime organizado existe no Brasil ou é coisa de filme? Basta abrir o jornal: o professor cita o Primeiro Comando da Capital (PCC), a chamada máfia do ISS em São Paulo (esquema de fiscais do imposto sobre serviços) e o mensalão, esquema de compra de apoio político revelado em 2005, que ele aponta como exemplo de organização criminosa. A resposta, portanto, é sim — e é por isso que a lei precisou de um conceito jurídico preciso, para separar a organização criminosa de figuras vizinhas como a associação criminosa (art. 288 do CP) e a milícia privada (art. 288-A).

Vídeo: "Direito Penal - aula 1", canal Saber Direito (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 6:00 a 12:00.$r$,
  false, true, 'publicado', 2, 'LOCAL', 'otaviolins-penal-parte-2.mp4'
FROM portal p
JOIN materia m ON m.portal_id = p.id AND m.slug = 'direito-penal-descomplicado'
JOIN assunto s ON s.materia_id = m.id AND s.slug = 'introducao-ao-direito-penal'
WHERE p.mascara = 'otaviolins';

-- ---------- Vade-mécum (forma segura: não falha se o artigo não existir) ----------
INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')
   AND a.slug = 'direito-penal-por-onde-comecar-parte-1'
   AND ((n.slug = 'cp' AND d.rotulo IN ('Art. 1º', 'Art. 121', 'Art. 288-A'))
     OR (n.slug = 'cf-88' AND d.rotulo = 'Art. 5º')
     OR (n.slug = 'lavagem' AND d.rotulo = 'Art. 1º'))
ON CONFLICT DO NOTHING;

INSERT INTO aula_dispositivo (aula_id, dispositivo_id)
SELECT a.id, d.id FROM aula a, dispositivo d JOIN norma n ON n.id = d.norma_id
 WHERE a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')
   AND a.slug = 'direito-penal-por-onde-comecar-parte-2'
   AND ((n.slug = 'cp' AND d.rotulo IN ('Art. 1º', 'Art. 288', 'Art. 288-A'))
     OR (n.slug = 'cf-88' AND d.rotulo = 'Art. 5º')
     OR (n.slug = 'organizacao-criminosa' AND d.rotulo IN ('Art. 1º', 'Art. 2º')))
ON CONFLICT DO NOTHING;

-- ---------- Exercícios (uma linha por aula) ----------
INSERT INTO exercicio (aula_id)
SELECT id FROM aula
 WHERE portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')
   AND slug IN ('direito-penal-por-onde-comecar-parte-1', 'direito-penal-por-onde-comecar-parte-2');

-- ############ Aula: Direito Penal: por onde começar (parte 1) ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-1' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Depois da Lei 12.683/2012, quais infrações podem ser antecedentes do crime de lavagem de capitais (Lei 9.613/1998)?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Apenas os crimes listados em um rol taxativo, como tráfico e crimes de organização criminosa.', false, 'Errada. Esse era o sistema ANTERIOR a 2012: uma lista fechada de crimes antecedentes. A Lei 12.683/2012 acabou com a lista.', 1),
 ('Qualquer infração penal, o que inclui crimes e contravenções.', true, 'Correta. O art. 1º da Lei 9.613/1998 passou a falar em bens provenientes de "infração penal", gênero que abrange crime e contravenção — por isso o dinheiro do jogo do bicho pode ser lavado.', 2),
 ('Somente crimes com pena máxima superior a quatro anos.', false, 'Errada. Esse patamar de pena é requisito do conceito de organização criminosa (Lei 12.850/2013), não da lavagem. A lavagem não tem filtro de pena no antecedente.', 3),
 ('Somente crimes contra a administração pública.', false, 'Errada. Corrupção pode ser antecedente, mas não é a única hipótese: tráfico, contrabando, contravenções e qualquer outra infração penal também podem ser.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-1' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Segundo a aula, o que diferencia a milícia privada (art. 288-A do CP) de uma organização criminosa?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A milícia não exige estrutura ordenada com divisão de tarefas, requisito próprio da organização criminosa.', true, 'Correta. O conceito de organização criminosa (art. 1º, § 1º, da Lei 12.850/2013) pede associação "estruturalmente ordenada e caracterizada pela divisão de tarefas". O art. 288-A do CP não exige isso da milícia.', 1),
 ('A milícia privada não é crime; é apenas uma agravante genérica.', false, 'Errada. A Lei 12.720/2012 criou o crime autônomo de constituição de milícia privada, no art. 288-A do Código Penal, com pena de reclusão.', 2),
 ('A organização criminosa só existe no âmbito internacional.', false, 'Errada. A transnacionalidade é uma das alternativas do conceito (ou crimes com pena máxima superior a quatro anos), não um requisito obrigatório.', 3),
 ('Não há diferença: os dois nomes designam a mesma figura.', false, 'Errada. São figuras distintas, previstas em leis diferentes (Código Penal e Lei 12.850/2013), com requisitos e penas próprios.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-1' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'certo_errado', 'Julgue: "Pela Lei 12.694/2012, qualquer juiz de primeiro grau pode formar colegiado em qualquer processo criminal, sem necessidade de fundamentar a decisão".', 'Inspirada em prova · Cebraspe', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O colegiado da Lei 12.694/2012 só cabe em processos sobre crimes praticados por organizações criminosas, e depende de decisão fundamentada em que o juiz indique o risco à sua integridade física (art. 1º, § 1º).', 1),
 ('Errado', true, 'Certo. A afirmação erra duas vezes: o colegiado é restrito aos crimes de organização criminosa e exige decisão fundamentada apontando o risco ao juiz. Os outros dois juízes vêm por sorteio eletrônico.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-1' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Em 2010, um bicheiro ocultou em imóveis o lucro do jogo do bicho. Ele pode ser condenado por lavagem de capitais com base na ampliação trazida pela Lei 12.683/2012?', 'Autoral · OAB', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Sim, porque a lei nova alcança todos os fatos ainda não julgados.', false, 'Errada. Lei penal mais gravosa não retroage. Alcançar fatos anteriores só é possível quando a lei nova beneficia o réu (art. 5º, XL, da CF/88).', 1),
 ('Sim, porque contravenção sempre foi antecedente da lavagem.', false, 'Errada. Antes de 2012 o rol de antecedentes era fechado e não incluía contravenções — foi justamente isso que a Lei 12.683/2012 mudou.', 2),
 ('Não, porque a inclusão das contravenções como antecedente é lei posterior mais gravosa e não retroage.', true, 'Correta. Em 2010 o jogo do bicho não era antecedente de lavagem; a Lei 12.683/2012 ampliou a punição e, por isso, só vale para fatos posteriores (art. 1º do CP; art. 5º, XXXIX e XL, da CF/88).', 3),
 ('Não, porque jogo do bicho não é infração penal.', false, 'Errada. Jogo do bicho é contravenção penal (art. 58 da Lei das Contravenções), e contravenção é espécie de infração penal. O motivo da resposta negativa é a irretroatividade, não a atipicidade.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-1' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'A Lei 12.720/2012 acrescentou ao homicídio uma causa de aumento de pena. Em que situação ela se aplica?', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Quando o homicídio é praticado por milícia privada, sob pretexto de prestar serviço de segurança, ou por grupo de extermínio.', true, 'Correta. É o art. 121, § 6º, do CP: a pena é aumentada de um terço até a metade nessas duas hipóteses.', 1),
 ('Quando o homicídio é praticado com emprego de veneno ou fogo.', false, 'Errada. Veneno, fogo e outros meios cruéis qualificam o homicídio (art. 121, § 2º, III), figura anterior e distinta da causa de aumento criada em 2012.', 2),
 ('Quando o homicídio é praticado contra policial em serviço.', false, 'Errada. Homicídio contra integrante das forças de segurança é qualificadora (art. 121, § 2º, VII), incluída pela Lei 13.142/2015, não a causa de aumento de 2012.', 3),
 ('Quando o homicídio é praticado por organização criminosa.', false, 'Errada. A causa de aumento fala em milícia privada e grupo de extermínio. Organização criminosa tem crime próprio na Lei 12.850/2013, mas não aparece no art. 121, § 6º.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-1' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'certo_errado', 'Julgue: "Para o art. 1º do Código Penal, não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal — regra que a CF/88 repete no art. 5º, XXXIX".', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É o princípio da legalidade (reserva legal e anterioridade), porta de entrada de todo o Direito Penal, presente no art. 1º do CP e no art. 5º, XXXIX, da CF/88.', 1),
 ('Errado', false, 'Errado. A afirmação reproduz com fidelidade o art. 1º do CP e o art. 5º, XXXIX, da CF/88. Não confunda com o inciso XL, que trata da irretroatividade da lei penal mais gravosa.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Direito Penal: por onde começar (parte 2) ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'De acordo com a Lei 12.830/2013, o indiciamento é ato privativo de quem?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Do juiz criminal competente.', false, 'Errada. O juiz não indicia — e, segundo o STF (HC 115.015/SP), nem pode mandar indiciar, sob pena de violar o sistema acusatório.', 1),
 ('Do membro do Ministério Público.', false, 'Errada. O promotor acusa (oferece a denúncia); indiciar é ato da fase investigativa, reservado ao delegado de polícia.', 2),
 ('Do delegado de polícia, por ato fundamentado.', true, 'Correta. Art. 2º, § 6º, da Lei 12.830/2013: o indiciamento, privativo do delegado de polícia, dá-se por ato fundamentado, mediante análise técnico-jurídica do fato.', 3),
 ('De qualquer agente policial que participe da investigação.', false, 'Errada. Investigadores e escrivães participam do inquérito, mas o indiciamento é privativo do delegado, que é quem preside a investigação.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'certo_errado', 'Julgue: "No HC 115.015/SP, o STF admitiu que o juiz determine ao delegado o indiciamento do investigado sempre que houver indícios suficientes de autoria".', 'Inspirada em prova · Cebraspe', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. Foi o contrário: a 2ª Turma do STF, relator Min. Teori Zavascki, decidiu que o juiz NÃO pode determinar o indiciamento, porque a medida é privativa do delegado e a ordem judicial feriria o sistema acusatório.', 1),
 ('Errado', true, 'Certo. A afirmação inverte o julgado. O STF entendeu que o indiciamento é ato próprio da autoridade policial e que o juiz, ao ordená-lo, sairia da posição de julgador — hoje o sistema acusatório está expresso no art. 3º-A do CPP.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Pelo art. 1º, § 1º, da Lei 12.850/2013, organização criminosa é a associação de:', 'Autoral · OAB', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Três ou mais pessoas, para praticar crimes com pena máxima igual ou superior a quatro anos.', false, 'Errada. Esse era o conceito da Lei 12.694/2012, hoje superado. A Lei 12.850/2013 elevou o mínimo para quatro pessoas e exige pena máxima SUPERIOR a quatro anos.', 1),
 ('Quatro ou mais pessoas, estruturalmente ordenada e com divisão de tarefas, para obter vantagem mediante infrações penais com pena máxima superior a quatro anos ou de caráter transnacional.', true, 'Correta. São os quatro elementos que a aula pede para guardar: número mínimo (4), estrutura (ordenada, com divisão de tarefas, ainda que informal), finalidade (vantagem de qualquer natureza) e gravidade (pena máxima superior a 4 anos ou transnacionalidade).', 2),
 ('Duas ou mais pessoas, armadas, para praticar crimes contra a vida.', false, 'Errada. Descreve algo próximo da associação criminosa armada (art. 288 do CP) ou da milícia (art. 288-A), não a organização criminosa da Lei 12.850/2013.', 3),
 ('Qualquer número de pessoas, desde que o crime seja transnacional.', false, 'Errada. A transnacionalidade dispensa o patamar de pena, mas não o número mínimo de quatro pessoas nem a estrutura ordenada.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'O que o professor chama de "direito penal simbólico"?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O uso de símbolos e brasões nos tribunais criminais.', false, 'Errada. A expressão nada tem a ver com símbolos físicos; é uma crítica de política criminal.', 1),
 ('A criação de leis penais e o aumento de penas para dar à sociedade a impressão de que o problema está resolvido, em detrimento das políticas públicas.', true, 'Correta. É a crítica da aula: o Estado "fabrica" leis penais e lota presídios como se isso bastasse, esquecendo educação, saúde e trabalho — e o preso um dia volta ao convívio social.', 2),
 ('A parte do Direito Penal que estuda os crimes contra a honra.', false, 'Errada. Crimes contra a honra (calúnia, difamação, injúria) são um capítulo do Código Penal, não um conceito de política criminal.', 3),
 ('A aplicação de penas alternativas em vez de prisão.', false, 'Errada. Penas restritivas de direitos são o oposto do que a crítica descreve: o direito penal simbólico aposta no endurecimento e no encarceramento.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Segundo o art. 2º da Lei 12.830/2013, as funções de polícia judiciária e a apuração de infrações penais exercidas pelo delegado de polícia são de natureza:', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Meramente administrativa, sem relevância jurídica.', false, 'Errada. Era exatamente essa visão que a lei quis superar: o delegado não é só um administrador; ele faz análise técnico-jurídica dos fatos.', 1),
 ('Jurídica, essenciais e exclusivas de Estado.', true, 'Correta. É a redação do art. 2º da Lei 12.830/2013 — por isso a aula diz que o delegado é operador do Direito, como juiz, promotor e advogado.', 2),
 ('Jurisdicional, equiparada à do juiz de primeiro grau.', false, 'Errada. O delegado investiga; não julga. Jurisdição é função do Poder Judiciário, e a Lei 12.830/2013 não equiparou delegado a magistrado.', 3),
 ('Acusatória, compartilhada com o Ministério Público.', false, 'Errada. Quem acusa é o Ministério Público (art. 129, I, da CF/88). O delegado preside a investigação, que é fase anterior à acusação.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'direito-penal-por-onde-comecar-parte-2' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'otaviolins')),
    'multipla_escolha', 'Por que a ordem judicial para que o delegado indicie alguém viola o sistema acusatório?', 'Autoral', 'intermediario', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Porque no sistema acusatório as funções de investigar/acusar e de julgar ficam separadas, e o juiz que manda indiciar assume papel que não é seu.', true, 'Correta. A separação entre quem acusa (Ministério Público), quem investiga (polícia) e quem julga (juiz) é a essência do sistema acusatório — hoje expresso no art. 3º-A do CPP. O juiz que ordena o indiciamento sai da posição de imparcialidade.', 1),
 ('Porque o indiciamento só pode ser feito pelo Ministério Público.', false, 'Errada. O indiciamento é privativo do delegado de polícia (art. 2º, § 6º, da Lei 12.830/2013), não do promotor.', 2),
 ('Porque o sistema acusatório proíbe qualquer indiciamento antes da sentença.', false, 'Errada. O indiciamento é ato normal da investigação, anterior à denúncia; o que não cabe é o juiz determiná-lo.', 3),
 ('Porque a ordem judicial deveria partir de um tribunal, e não de juiz de primeiro grau.', false, 'Errada. O problema não é a hierarquia do órgão judicial, e sim o fato de o Judiciário, em qualquer grau, assumir função investigativa.', 4)
) AS v(texto, correta, comentario, ordem);
