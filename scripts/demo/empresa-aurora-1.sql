-- =====================================================================
-- Conteúdo de demonstração — portal de EMPRESA "Grupo Aurora Varejo"
-- (máscara: aurora). Na tela: trilha = materia, módulo = assunto.
--
-- NÃO é migração. O portal é criado pela interface ANTES de este arquivo
-- rodar; tudo aqui o referencia por (SELECT id FROM portal WHERE mascara
-- = 'aurora'). Nenhum ID numérico fixo.
--
-- Uso:
--   docker exec -i aprimore-db-1 psql -U aprimore -d aprimoreosaber \
--     -v ON_ERROR_STOP=1 < scripts/demo/empresa-aurora-1.sql
--
-- Conteúdo:
--   Área "Integração"
--     Trilha 1  Integração de novos colaboradores  (2 aulas + avaliação final)
--   Área "Conformidade"
--     Trilha 2  LGPD no atendimento ao cliente     (1 aula + avaliação final)
--     Trilha 3  Governança corporativa e compliance (1 aula + avaliação final)
--
-- Regras do portal de empresa: na_vitrine_plataforma = false (CHECK);
-- cada trilha tem UMA avaliação final (UNIQUE materia_id); questões de
-- avaliação levam avaliacao_id e exercicio_id NULL. Sem aula_dispositivo
-- (a LGPD não está no acervo do vade-mécum).
-- =====================================================================

-- ---------- Áreas ----------
INSERT INTO area (portal_id, slug, nome, ordem)
SELECT p.id, v.slug, v.nome, v.ordem
FROM portal p, (VALUES
  ('integracao',   'Integração',   1),
  ('conformidade', 'Conformidade', 2)
) AS v(slug, nome, ordem)
WHERE p.mascara = 'aurora';

-- ---------- Trilhas (materia) ----------
INSERT INTO materia (portal_id, area_id, slug, nome, ementa, onda, status, professor, ordem, na_vitrine_plataforma)
SELECT p.id, ar.id, 'integracao-de-novos-colaboradores', 'Integração de novos colaboradores',
  'Trilha de boas-vindas ao Grupo Aurora Varejo: como se comportar e se comunicar na loja, no estoque e no escritório, e por que uma comunicação interna ágil e transparente faz diferença no resultado do time.',
  1, 'publicado', 'Equipe de Treinamento e Desenvolvimento', 1, false
FROM portal p JOIN area ar ON ar.portal_id = p.id AND ar.slug = 'integracao'
WHERE p.mascara = 'aurora';

INSERT INTO materia (portal_id, area_id, slug, nome, ementa, onda, status, professor, ordem, na_vitrine_plataforma)
SELECT p.id, ar.id, 'lgpd-no-atendimento-ao-cliente', 'LGPD no atendimento ao cliente',
  'O essencial da Lei Geral de Proteção de Dados (Lei 13.709/2018) traduzido para o balcão: o que é dado pessoal, quando pedir consentimento, quem é o titular, o que muda no cadastro de fidelidade, no CPF na nota e nas câmeras da loja.',
  1, 'publicado', 'Equipe de Treinamento e Desenvolvimento', 2, false
FROM portal p JOIN area ar ON ar.portal_id = p.id AND ar.slug = 'conformidade'
WHERE p.mascara = 'aurora';

INSERT INTO materia (portal_id, area_id, slug, nome, ementa, onda, status, professor, ordem, na_vitrine_plataforma)
SELECT p.id, ar.id, 'governanca-e-compliance', 'Governança corporativa e compliance',
  'Noções de governança corporativa e compliance para quem trabalha no varejo: de onde vem a governança, o que é a visão moderna com todos os públicos da empresa, e por que regras internas, código de conduta e documentação organizada protegem o negócio.',
  1, 'publicado', 'Equipe de Treinamento e Desenvolvimento', 3, false
FROM portal p JOIN area ar ON ar.portal_id = p.id AND ar.slug = 'conformidade'
WHERE p.mascara = 'aurora';

-- ---------- Módulos (assunto) ----------
INSERT INTO assunto (portal_id, materia_id, slug, nome, ordem)
SELECT p.id, m.id, v.slug, v.nome, 1
FROM portal p
JOIN (VALUES
  ('integracao-de-novos-colaboradores', 'comunicacao-no-trabalho',          'Comunicação no trabalho'),
  ('lgpd-no-atendimento-ao-cliente',    'a-lei-geral-de-protecao-de-dados', 'A Lei Geral de Proteção de Dados'),
  ('governanca-e-compliance',           'governanca-corporativa',           'Governança corporativa')
) AS v(materia_slug, slug, nome) ON true
JOIN materia m ON m.portal_id = p.id AND m.slug = v.materia_slug
WHERE p.mascara = 'aurora';

-- =====================================================================
-- Trilha 1 — Integração de novos colaboradores
-- =====================================================================
INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
SELECT p.id, s.id, 'postura-profissional-e-comunicacao', 'Postura profissional e comunicação no trabalho', 283,
$r$Passamos mais tempo no trabalho do que em casa, e trabalhar bem depende de bons relacionamentos — que só existem com boa comunicação. Esta aula trata de um pedaço dela que quase ninguém ensina: o respeito ao ambiente. Cada local de trabalho tem um jeito próprio de funcionar, e comunicar bem começa por perceber qual é esse jeito.

O vídeo compara três cenários. Um escritório de contabilidade ou de advocacia pede seriedade — não necessariamente cara fechada, o clima pode até ser leve, mas a natureza do trabalho exige compostura. Uma agência de publicidade costuma ser solta, descolada, com a parede pintada de azul. Um canteiro de obras é outro mundo: gente pegando pesado, sol, capacete, tom de voz alto. Nenhum é melhor que o outro. O ponto é que quem trabalha em cada um precisa sacar como o ambiente funciona e se comportar de acordo.

Quando alguém destoa, chama atenção demais e tira o foco. A pessoa pode até ser bem-intencionada — expansiva, brincalhona, gente boa —, mas se o ambiente pede contenção e ela fala alto e circula sem parar, cria problema para si, para os colegas e às vezes para o cliente. O contrário também vale: alguém muito quieto num time descontraído também está fora de sintonia. Quem quer crescer na carreira precisa de discrição quando o ambiente pede discrição, e de abertura quando o ambiente pede abertura.

No Grupo Aurora isso aparece todo dia, porque uma mesma loja tem vários ambientes. O salão de vendas pede simpatia, voz calma e atenção total ao cliente, que não quer ouvir conversa paralela no caixa. O estoque e a doca de recebimento pedem objetividade e comunicação clara, porque erro ali vira prejuízo. O escritório da gerência pede sobriedade nas reuniões. E o grupo de mensagens da equipe não é a mesma coisa que o balcão: brincadeira que cabe ali pode não caber na frente do cliente.

Regra prática para a sua primeira semana: observe antes de agir. Veja como os colegas falam com o cliente, como se dirigem ao gerente, qual é o tom nas reuniões — e combine com o ambiente. Isso não é deixar de ser você; é ler o lugar onde você está.

Vídeo: "Uma dica para carreira profissional - Comunicação no Trabalho-Postura profissional", canal Fabrício Andrade - Educavoz (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$r$,
  false, false, 'publicado', 1, 'LOCAL', 'aurora-integracao-1.mp4'
FROM portal p
JOIN materia m ON m.portal_id = p.id AND m.slug = 'integracao-de-novos-colaboradores'
JOIN assunto s ON s.materia_id = m.id AND s.slug = 'comunicacao-no-trabalho'
WHERE p.mascara = 'aurora';

INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
SELECT p.id, s.id, 'beneficios-de-uma-boa-comunicacao', 'Os benefícios de uma boa comunicação', 215,
$r$Comunicação corporativa é o que alinha o discurso da empresa com o dos colaboradores — o chamado endomarketing, ou comunicação interna. Quando funciona, ela difunde visão, missão e valores (o rumo da organização), amplia e harmoniza o diálogo entre capital e trabalho, equaliza interesses, integra equipes, valoriza o conhecimento produzido dentro de casa, posiciona a empresa junto aos clientes, motiva as pessoas para uma ação mais produtiva, constrói reputação e agrega valor ao produto e ao negócio.

O vídeo organiza os facilitadores de uma comunicação de resultado em sete pilares. 1) Agilidade: quanto tempo a informação leva para chegar a quem precisa dela? 2) Interatividade: o colaborador usa redes sociais e aplicativos o dia todo e quer interagir, não só receber comunicado. 3) Mobilidade: as pessoas estão no celular e no tablet boa parte do tempo. 4) Capilaridade: usar a tecnologia para alcançar o maior número de lugares e de pessoas, com qualidade.

5) Engajamento: uma comunicação engajada atrai mais receptores e facilita o entendimento. 6) Monitoramento de resultados: comunicação sem medição é palpite. 7) Transparência: mais do que tecnologia de ponta e mensagem bem produzida, é preciso ser sincero — comunicação que esconde perde a confiança que pretendia construir. Os sete só funcionam quando trabalhados em conjunto.

Trazendo para o Grupo Aurora: uma campanha promocional que chega ao vendedor depois que o cliente já perguntou por ela é falha de agilidade. Uma mudança na política de trocas comunicada só por cartaz no refeitório é falha de capilaridade e de mobilidade. Um aplicativo interno em que ninguém responde às dúvidas da loja é falha de interatividade. E um comunicado que maquia um resultado ruim é falha de transparência — a equipe descobre, e o dano é maior que o resultado.

O vídeo termina anunciando a diferença entre comunicação verbal e não verbal, tema da aula seguinte da série original. Aqui, fique com a ideia principal: boa comunicação interna não é enfeite do RH — é ferramenta de resultado.

Vídeo: "Benefícios de uma BOA ComunicAção | 1ª Aula | by Alexander Baer", canal Alexander Baer (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor.$r$,
  false, false, 'publicado', 2, 'LOCAL', 'aurora-integracao-2.mp4'
FROM portal p
JOIN materia m ON m.portal_id = p.id AND m.slug = 'integracao-de-novos-colaboradores'
JOIN assunto s ON s.materia_id = m.id AND s.slug = 'comunicacao-no-trabalho'
WHERE p.mascara = 'aurora';

-- =====================================================================
-- Trilha 2 — LGPD no atendimento ao cliente
-- =====================================================================
INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
SELECT p.id, s.id, 'lgpd-a-lei-em-resumo', 'LGPD: a Lei 13.709/2018 em resumo', 720,
$r$A Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018) é a lei que diz como qualquer empresa — inclusive uma loja — pode coletar, guardar e usar informações de pessoas. Ela está dividida em dez capítulos: disposições preliminares, tratamento de dados, direitos do titular, tratamento pelo Poder Público, transferência internacional, agentes de tratamento, segurança e boas práticas, fiscalização, a Autoridade Nacional de Proteção de Dados (ANPD) e disposições finais. Desde a Emenda Constitucional 115/2022, a proteção de dados pessoais é direito fundamental (art. 5º, LXXIX, da CF/88) e compete privativamente à União legislar sobre o tema (art. 22, XXX).

O objetivo da lei é proteger a liberdade, a privacidade e o livre desenvolvimento da personalidade da pessoa natural — a pessoa física. Isso significa que o CNPJ do fornecedor não é dado pessoal protegido, mas o CPF, o nome, o telefone e o rosto do cliente são. Cuidado com a confusão clássica: a proteção vale para pessoas físicas, mas os deveres e as sanções da lei se aplicam a qualquer um que trate dados, pessoa física ou jurídica, pública ou privada. A LGPD é norma nacional, alcança dado em papel ou em sistema e qualquer operação feita com ele — coletar, armazenar, consultar, compartilhar, apagar.

A lei se aplica a todo tratamento feito no Brasil, ou voltado a oferecer bens e serviços a pessoas no Brasil, ou sobre dados aqui coletados (art. 3º). Não se aplica ao uso particular e sem fim econômico (a agenda do seu celular), aos fins jornalísticos, artísticos e acadêmicos, nem à segurança pública, defesa nacional e investigação criminal, que terão lei própria (art. 4º) — o Enunciado 678 da Jornada de Direito Civil do CJF lembra que, mesmo aí, valem o devido processo legal e os princípios gerais de proteção. Os fundamentos (art. 2º) vão do respeito à privacidade e da autodeterminação informativa até a livre iniciativa, a defesa do consumidor e a dignidade. Os princípios (art. 6º) são o teste de toda operação: finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação e responsabilização e prestação de contas.

Vocabulário que você vai usar no caixa. Dado pessoal é qualquer informação sobre pessoa identificada ou identificável. Dado sensível é o que revela origem racial ou étnica, religião, opinião política, filiação a sindicato, saúde, vida sexual, dado genético ou biométrico — a biometria facial de um sistema de reconhecimento na loja entra aqui e exige cuidado redobrado. Dado de criança e adolescente é tratado sempre no melhor interesse deles. Dado anonimizado, que não permite mais identificar a pessoa por meios razoáveis, não é dado pessoal. Banco de dados é o conjunto estruturado, físico ou eletrônico — a planilha de aniversariantes do programa de fidelidade é um.

Os agentes de tratamento são o controlador, que decide o que fazer com os dados (o Grupo Aurora, quando cadastra o cliente), e o operador, que trata em nome do controlador (a empresa que roda o software de fidelidade ou o sistema de câmeras). Os dois mantêm registro das operações, especialmente quando a base é o legítimo interesse. O encarregado é a pessoa indicada para ser o canal entre a empresa, os titulares e a ANPD; seu contato tem de ser público, de preferência no site. Ele recebe reclamações, atende a autoridade e orienta funcionários e contratados — se um cliente pedir para apagar o cadastro, é para ele que a demanda vai.

O titular é a pessoa a quem os dados se referem: o cliente, o colaborador, o candidato à vaga. Consentimento é a manifestação livre, informada e inequívoca para uma finalidade determinada, revogável a qualquer tempo, e a prova de que ele existiu é ônus do controlador — por isso o aceite do programa de fidelidade precisa ficar registrado. Consentimento não é a única base legal: emitir a nota fiscal com CPF é cumprimento de obrigação legal, entregar a compra em casa é execução de contrato, e a câmera do salão pode se apoiar no legítimo interesse de segurança, com aviso visível. Dado que o próprio titular tornou público dispensa consentimento. O que nunca vale é pedir o telefone para a nota e usá-lo para propaganda sem avisar: viola o princípio da finalidade.

O titular tem direitos: confirmação de que há tratamento, acesso, correção, oposição, eliminação, informação sobre com quem os dados são compartilhados e revisão de decisões tomadas só por tratamento automatizado — como a análise de crédito do cartão da loja feita inteiramente por algoritmo. Ele pode reclamar à ANPD, que fiscaliza e aplica sanções que vão da advertência à multa de até 2% do faturamento, limitada a R$ 50 milhões por infração (art. 52). Na prática do varejo: colete só o necessário, diga para que está coletando, guarde com segurança e responda rápido quando o cliente perguntar.

Vídeo: "LEI GERAL DE PROTEÇÃO DE DADOS - LGPD - LEI 13.709/2018- AULA COMPLETA E RESUMIDA", canal LEIS BRASILEIRAS EM ÁUDIO (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 0:00 a 12:00.$r$,
  false, false, 'publicado', 1, 'LOCAL', 'aurora-lgpd-1.mp4'
FROM portal p
JOIN materia m ON m.portal_id = p.id AND m.slug = 'lgpd-no-atendimento-ao-cliente'
JOIN assunto s ON s.materia_id = m.id AND s.slug = 'a-lei-geral-de-protecao-de-dados'
WHERE p.mascara = 'aurora';

-- =====================================================================
-- Trilha 3 — Governança corporativa e compliance
-- =====================================================================
INSERT INTO aula (portal_id, assunto_id, slug, titulo, duracao_segundos, resumo, amostra_gratuita, no_trial, status, ordem, video_provedor, video_id)
SELECT p.id, s.id, 'governanca-corporativa-nocoes', 'Governança corporativa: noções essenciais', 720,
$r$Governança corporativa costuma ser vista como assunto de grande empresa de capital aberto, mas o vídeo mostra que o tema é de todo mundo — inclusive de uma rede de lojas e de um colaborador que está entrando agora. Governança vem de governação: é o conjunto de regras e práticas que organiza a relação entre todos os atores ligados a uma empresa, entidade ou governo.

A origem é curiosa: nas grandes navegações, reis e comerciantes financiavam expedições com risco real de os navios nunca voltarem, e esse risco exigiu regras formalizadas entre as partes. Dali nasce a ideia de responsabilidade limitada, hoje aplicável tanto às sociedades limitadas quanto às sociedades anônimas. No mundo moderno, a visão clássica de governança é a da Lei das S.A. (Lei 6.404/1976): um conjunto de regras para a relação entre os acionistas e os administradores que comandam a companhia.

A visão moderna é mais ampla. Governança já não é só a relação entre donos e gestores; é a responsabilidade corporativa da empresa no contexto em que está inserida. Pense numa empresa numa cidade pequena do interior: quantas famílias dependem dos empregos e dos contratos que ela gera? Por isso a governança moderna considera colaboradores, fornecedores, concorrentes, a sociedade civil e, no mundo globalizado, até o planeta — o que hoje se resume na sigla ESG (ambiental, social e governança).

Dois desdobramentos dessa visão. O primeiro é a função social da empresa, reconhecida pela ordem jurídica brasileira (a CF/88 fala em função social da propriedade no art. 170; a Lei das S.A. cobra dos controladores e administradores o respeito a ela nos arts. 116 e 154): a empresa é ator relevante na sociedade e, se fecha as portas, o impacto é coletivo. O segundo é a sustentabilidade, inclusive ambiental: a companhia precisa de políticas internas que evitem que sua atividade gere danos ao meio ambiente.

E onde entra o Direito? Muitos autores dizem que governança é tema de administração, finanças e contabilidade, não jurídico. Mas todas as práticas desses campos, quando chegam a uma empresa de qualquer porte, viram regras: normas internas, códigos de conduta, códigos de ética. São instrumentos jurídicos, que obrigam cada ator na sua competência. É por isso que o código de conduta do Grupo Aurora, o canal de denúncias e o programa de integridade previsto na Lei Anticorrupção (Lei 12.846/2013) fazem parte do treinamento de quem entra.

Pode haver governança em pequenas e médias empresas e em startups? Sim — o Instituto Brasileiro de Governança Corporativa (IBGC) defende exatamente levar às menores as práticas das grandes. O primeiro passo é o que o professor chama de governança legal: manter a documentação jurídica organizada e acessível a sócios e gestores a qualquer tempo — certidões negativas em dia, contrato social atualizado, contratos com fornecedores formalizados, documentos dos sócios guardados. Isso evita o corre-corre quando aparece um empréstimo, uma cisão, a sucessão de um sócio, um investidor ou a venda da empresa, situações em que a desorganização costuma custar oportunidades de negócio.

Vídeo: "Saber Direito Aula - Direito empresarial e governança corporativa - aula 1(21/12/15)", canal Saber Direito (YouTube), licença Creative Commons Atribuição (CC BY). Reproduzido com os créditos ao autor. Trecho de 0:00 a 12:00.$r$,
  false, false, 'publicado', 1, 'LOCAL', 'aurora-governanca-1.mp4'
FROM portal p
JOIN materia m ON m.portal_id = p.id AND m.slug = 'governanca-e-compliance'
JOIN assunto s ON s.materia_id = m.id AND s.slug = 'governanca-corporativa'
WHERE p.mascara = 'aurora';

-- ---------- Exercícios (uma linha por aula) ----------
INSERT INTO exercicio (aula_id)
SELECT id FROM aula
 WHERE portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')
   AND slug IN ('postura-profissional-e-comunicacao', 'beneficios-de-uma-boa-comunicacao',
                'lgpd-a-lei-em-resumo', 'governanca-corporativa-nocoes');

-- ---------- Avaliações finais (uma por trilha) ----------
INSERT INTO avaliacao (portal_id, materia_id, titulo, descricao, nota_minima, max_tentativas, embaralhar, status)
SELECT p.id, m.id, v.titulo, v.descricao, 70, 3, true, 'publicado'
FROM portal p
JOIN (VALUES
  ('integracao-de-novos-colaboradores', 'Avaliação — Integração',
   'Prova final da trilha de integração. Cobre as duas aulas de comunicação no trabalho: postura no ambiente e os sete pilares da comunicação interna. Nota mínima 70, até três tentativas.'),
  ('lgpd-no-atendimento-ao-cliente', 'Avaliação — LGPD',
   'Prova final da trilha de LGPD. Cobre conceitos da Lei 13.709/2018 aplicados ao atendimento: dado pessoal e sensível, titular, controlador e operador, consentimento e bases legais, encarregado e ANPD. Nota mínima 70, até três tentativas.'),
  ('governanca-e-compliance', 'Avaliação — Governança',
   'Prova final da trilha de governança e compliance. Cobre origem e conceito de governança, visão moderna e função social da empresa, governança como regras jurídicas e governança legal nas pequenas e médias empresas. Nota mínima 70, até três tentativas.')
) AS v(materia_slug, titulo, descricao) ON true
JOIN materia m ON m.portal_id = p.id AND m.slug = v.materia_slug
WHERE p.mascara = 'aurora';

-- ############ Aula: Postura profissional e comunicação no trabalho ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'postura-profissional-e-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Qual é a ideia central da aula sobre postura profissional?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Todo ambiente de trabalho deve ser sério e silencioso.', false, 'Errada. O vídeo mostra ambientes bem diferentes — escritório, agência de publicidade, canteiro de obras — e diz que nenhum é melhor que o outro.', 1),
 ('Cada ambiente de trabalho tem um jeito próprio de funcionar, e quem trabalha nele precisa perceber isso e se comportar de acordo.', true, 'Correta. É o "respeito ao ambiente": entender como as coisas acontecem ali, como se fala com o colega e com o cliente, e combinar com esse jeito.', 2),
 ('Pessoas expansivas não deveriam trabalhar em escritórios.', false, 'Errada. A aula não exclui ninguém; pede que a pessoa se contenha durante o expediente quando o ambiente pede compostura.', 3),
 ('A comunicação no trabalho depende apenas de falar corretamente.', false, 'Errada. Falar bem ajuda, mas a aula trata de postura: tom, comportamento e leitura do ambiente.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'postura-profissional-e-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Uma pessoa gente boa, brincalhona e expansiva trabalha num escritório que pede compostura e não se contém durante o expediente. Segundo a aula, o que acontece?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Nada, porque a intenção dela é boa.', false, 'Errada. A aula reconhece que a pessoa pode não ser mal-intencionada, mas a boa intenção não evita o problema.', 1),
 ('Ela chama atenção demais, tira o foco dos colegas e cria problemas para si, para a equipe e às vezes para o cliente.', true, 'Correta. Quem destoa do ambiente distrai e atrapalha — e, para quem quer crescer na carreira, isso pesa.', 2),
 ('Ela é automaticamente promovida por ser comunicativa.', false, 'Errada. O vídeo diz o oposto: quem quer crescer precisa de discrição quando o ambiente pede discrição.', 3),
 ('O ambiente se adapta a ela com o tempo.', false, 'Errada. É a pessoa que precisa se adaptar ao ambiente, não o contrário.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'postura-profissional-e-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'certo_errado', 'Julgue: "Se o ambiente de trabalho é descontraído, uma pessoa muito quieta e fechada nunca destoa dele".', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A aula diz que o contrário também é real: num ambiente descolado, a pessoa muito quieta também está fora de sintonia.', 1),
 ('Errado', true, 'Certo. Destoar não é só falar alto demais; é não combinar com o ambiente, em qualquer direção.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'postura-profissional-e-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Quando o vídeo diz que um escritório de contabilidade ou de advocacia é um ambiente "sério", o que ele quer dizer?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Que a natureza do trabalho exige compostura, mesmo que o clima seja leve.', true, 'Correta. Sério não é sinônimo de pesado: o ambiente pode ser leve e descontraído, mas o tipo de trabalho pede seriedade na conduta.', 1),
 ('Que ninguém pode conversar durante o expediente.', false, 'Errada. O vídeo não proíbe conversa; fala de tom, volume e compostura compatíveis com o trabalho.', 2),
 ('Que o escritório é melhor que uma agência de publicidade.', false, 'Errada. A aula compara ambientes sem hierarquizar: cada um tem o seu jeito.', 3),
 ('Que os funcionários devem usar terno todos os dias.', false, 'Errada. O vídeo não trata de vestimenta; trata de comportamento e comunicação adequados ao ambiente.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'postura-profissional-e-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Aplicando a aula a uma loja do Grupo Aurora, qual atitude combina com o salão de vendas?', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Continuar a conversa com o colega enquanto passa a compra do cliente no caixa.', false, 'Errada. Conversa paralela no caixa é exatamente o comportamento que destoa do ambiente e incomoda o cliente.', 1),
 ('Usar no balcão as mesmas brincadeiras do grupo de mensagens da equipe.', false, 'Errada. O resumo alerta: brincadeira que cabe no grupo pode não caber na frente do cliente. Cada ambiente pede um tom.', 2),
 ('Atenção total ao cliente, voz calma e simpatia.', true, 'Correta. O salão pede foco no cliente e tom acolhedor; o estoque pede objetividade; o escritório pede sobriedade.', 3),
 ('Falar alto para ser ouvido por toda a loja.', false, 'Errada. Volume alto pode caber num canteiro de obras, não no salão de vendas.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'postura-profissional-e-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'certo_errado', 'Julgue: "Segundo a aula, bons relacionamentos no trabalho só existem com boa comunicação".', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É a premissa de abertura do vídeo: trabalhar bem e satisfeito depende de bons relacionamentos, e eles só existem com boa comunicação.', 1),
 ('Errado', false, 'Errado. A afirmação reproduz a ideia inicial da aula. Passamos muitas horas no trabalho, e a qualidade dessas horas depende de como nos comunicamos.', 2)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Os benefícios de uma boa comunicação ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'beneficios-de-uma-boa-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'O que o vídeo chama de endomarketing?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A propaganda da empresa dirigida ao consumidor final.', false, 'Errada. Isso é marketing externo. O prefixo "endo" indica o que acontece dentro da organização.', 1),
 ('A comunicação interna que alinha o discurso da organização com o dos seus colaboradores.', true, 'Correta. Endomarketing é a comunicação corporativa voltada para dentro: difunde visão, missão e valores e alinha empresa e equipe.', 2),
 ('O monitoramento das redes sociais dos funcionários.', false, 'Errada. Monitorar resultados é um dos pilares, mas endomarketing não é vigiar as redes pessoais de ninguém.', 3),
 ('A venda de produtos da empresa aos próprios funcionários.', false, 'Errada. Endomarketing não é venda interna; é comunicação e engajamento.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'beneficios-de-uma-boa-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', '"Quanto tempo a informação leva para chegar ao seu destinatário?" Essa pergunta define qual dos sete pilares?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Agilidade.', true, 'Correta. O primeiro pilar é a rapidez com que a informação chega a quem precisa dela.', 1),
 ('Capilaridade.', false, 'Errada. Capilaridade é alcançar o maior número de lugares e pessoas, com qualidade — é sobre alcance, não sobre tempo.', 2),
 ('Engajamento.', false, 'Errada. Engajamento é a capacidade de atrair receptores e facilitar o entendimento.', 3),
 ('Transparência.', false, 'Errada. Transparência é sinceridade na comunicação, não velocidade.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'beneficios-de-uma-boa-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Sobre o pilar da transparência, o vídeo afirma que, mais do que tecnologia de ponta e mensagem bem produzida, é preciso:', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Investir em mais canais digitais.', false, 'Errada. Canais são meio; a transparência é sobre o conteúdo ser verdadeiro.', 1),
 ('Ser sincero na comunicação empresarial.', true, 'Correta. Sinceridade é o coração do sétimo pilar: comunicação que esconde ou maquia perde a confiança que pretendia construir.', 2),
 ('Repetir a mensagem várias vezes.', false, 'Errada. Repetição pode ajudar no alcance, mas não substitui a verdade da mensagem.', 3),
 ('Terceirizar a comunicação para uma agência.', false, 'Errada. Quem faz a comunicação não muda a exigência de que ela seja sincera.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'beneficios-de-uma-boa-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'certo_errado', 'Julgue: "Os sete pilares da comunicação funcionam de forma independente: basta a empresa dominar um deles para obter resultado".', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O vídeo é explícito: os pilares, "se trabalhados em conjunto", são os facilitadores da comunicação de resultado. Um sozinho não basta.', 1),
 ('Errado', true, 'Certo. Uma mensagem ágil mas sem transparência, ou engajada mas sem capilaridade, não entrega o resultado que a comunicação deve ter.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'beneficios-de-uma-boa-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'O Grupo Aurora mudou a política de trocas e comunicou a novidade apenas por um cartaz no refeitório da loja matriz. Quais pilares falharam?', 'Autoral', 'intermediario', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Capilaridade e mobilidade.', true, 'Correta. Um cartaz num único refeitório não alcança as outras lojas (capilaridade) nem chega ao celular de quem está no salão (mobilidade).', 1),
 ('Transparência e monitoramento.', false, 'Errada. A informação é verdadeira e nada indica falta de medição; o problema é que ela não chega às pessoas.', 2),
 ('Interatividade e engajamento apenas.', false, 'Errada. Até podem sofrer, mas o defeito primário é de alcance e de meio — a mensagem não chega a quem precisa.', 3),
 ('Nenhum: cartaz é canal oficial suficiente.', false, 'Errada. Para uma rede de lojas, um cartaz num local não é canal suficiente; é o caso clássico de falha de capilaridade.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'beneficios-de-uma-boa-comunicacao' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Qual das opções NÃO está entre os benefícios da boa comunicação interna listados no vídeo?', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Difundir visão, missão e valores da organização.', false, 'Está na lista: é o primeiro benefício citado — comunicar o rumo da organização.', 1),
 ('Integrar equipes e motivar os colaboradores para uma ação mais produtiva.', false, 'Está na lista: integração de equipes e motivação são benefícios expressos no vídeo.', 2),
 ('Reduzir o quadro de funcionários da empresa.', true, 'Correta — esta NÃO está na lista. O vídeo fala em harmonizar o diálogo entre capital e trabalho e valorizar as pessoas, não em cortar equipe.', 3),
 ('Construir a reputação da empresa e agregar valor ao produto e ao negócio.', false, 'Está na lista: reputação e valor agregado fecham a relação de benefícios.', 4)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: LGPD: a Lei 13.709/2018 em resumo ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'lgpd-a-lei-em-resumo' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'A proteção conferida pela LGPD se destina a quem, e a quem se aplicam os seus deveres?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Protege pessoas físicas e jurídicas; os deveres valem só para empresas.', false, 'Errada. Dados de pessoa jurídica (o CNPJ do fornecedor, por exemplo) não são dados pessoais; e os deveres alcançam também pessoas físicas que tratem dados.', 1),
 ('Protege a pessoa natural (física); os deveres e sanções valem para qualquer pessoa, física ou jurídica, pública ou privada, que trate dados.', true, 'Correta. É a confusão clássica que a aula desfaz: a proteção é da pessoa natural, mas quem trata dados — loja, banco, prefeitura, profissional autônomo — responde pela lei.', 2),
 ('Protege só pessoas jurídicas de direito privado.', false, 'Errada. A LGPD existe para proteger a liberdade, a privacidade e a personalidade da pessoa natural (art. 1º).', 3),
 ('Protege apenas dados digitais de pessoas físicas.', false, 'Errada. A lei alcança dado em meio físico ou digital — uma ficha de papel no caixa também é dado pessoal.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'lgpd-a-lei-em-resumo' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'A loja quer instalar reconhecimento facial para identificar clientes do programa de fidelidade na entrada. Como a LGPD classifica o dado biométrico facial?', 'Autoral', 'intermediario', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Dado anonimizado, porque não tem nome associado.', false, 'Errada. O rosto identifica a pessoa — é o oposto de anonimizado. Anonimizado é o dado que não permite mais identificar o titular por meios razoáveis.', 1),
 ('Dado pessoal comum, como o telefone.', false, 'Errada. Telefone é dado pessoal comum; a biometria está na lista dos dados sensíveis, que pedem cuidado redobrado.', 2),
 ('Dado pessoal sensível, sujeito a cuidado redobrado.', true, 'Correta. Dado biométrico vinculado a pessoa natural é dado sensível (art. 5º, II), ao lado de saúde, origem racial, religião e opinião política.', 3),
 ('Dado público, porque o rosto é visível a todos.', false, 'Errada. Ver o rosto não é o mesmo que processar biometria para identificar alguém automaticamente; e dado sensível não vira comum por ser visível.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'lgpd-a-lei-em-resumo' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'O Grupo Aurora decide criar um programa de fidelidade e contrata uma empresa de software para rodar o cadastro. Quem é controlador e quem é operador?', 'Autoral', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('O Grupo Aurora é controlador (decide sobre o tratamento) e a empresa de software é operadora (trata em nome do controlador).', true, 'Correta. Controlador é quem toma as decisões sobre o tratamento; operador é quem o realiza em nome do controlador (art. 5º, VI e VII). Os dois mantêm registro das operações.', 1),
 ('A empresa de software é controladora, porque os dados ficam no servidor dela.', false, 'Errada. Guardar os dados não define o papel; o que define é quem decide o que fazer com eles — a loja.', 2),
 ('O cliente é o controlador, porque os dados são dele.', false, 'Errada. O cliente é o titular, não o controlador. O titular é a pessoa a quem os dados se referem.', 3),
 ('Os dois são operadores; controlador é a ANPD.', false, 'Errada. A ANPD é a autoridade que fiscaliza; não é agente de tratamento do cadastro da loja.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'lgpd-a-lei-em-resumo' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'certo_errado', 'Julgue: "Dados anonimizados são considerados dados pessoais para os fins da LGPD".', 'Inspirada em prova · Cebraspe', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. A aula repete duas vezes, com ênfase: dados anonimizados NÃO são considerados dados pessoais (art. 12), porque não permitem identificar o titular por meios técnicos razoáveis.', 1),
 ('Errado', true, 'Certo. Relatórios de vendas por faixa etária, sem nenhuma chave que leve a uma pessoa, são dados anonimizados e ficam fora do regime de dado pessoal.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'lgpd-a-lei-em-resumo' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Um cliente processa a loja dizendo que nunca autorizou receber ofertas por mensagem. Num processo, de quem é o ônus de provar que o consentimento foi dado?', 'Autoral', 'intermediario', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Do titular, que precisa provar que não consentiu.', false, 'Errada. Seria provar um fato negativo; a lei inverte o ônus para quem tratou os dados.', 1),
 ('Do controlador, que deve demonstrar que obteve o consentimento.', true, 'Correta. O art. 8º, § 2º, da LGPD atribui ao controlador o ônus da prova do consentimento — por isso o aceite do programa de fidelidade precisa ficar registrado.', 2),
 ('Da ANPD, que fiscaliza os tratamentos.', false, 'Errada. A ANPD fiscaliza e sanciona; não produz prova em favor da loja num processo.', 3),
 ('Da empresa que envia as mensagens, mesmo sendo operadora.', false, 'Errada. Quem responde pela existência do consentimento é o controlador, que decidiu tratar os dados para aquela finalidade.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'lgpd-a-lei-em-resumo' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Qual é o papel do encarregado de proteção de dados?', 'Autoral', 'introdutorio', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Ser o canal de comunicação entre o controlador, os titulares e a ANPD, com contato divulgado publicamente.', true, 'Correta. O encarregado (art. 41) recebe reclamações dos titulares, atende comunicações da ANPD e orienta funcionários e contratados. Seu contato deve ser público, de preferência no site.', 1),
 ('Decidir sozinho quais dados a empresa vai coletar.', false, 'Errada. Quem decide sobre o tratamento é o controlador; o encarregado orienta e faz a ponte.', 2),
 ('Aplicar multas aos funcionários que vazarem dados.', false, 'Errada. Sanções da LGPD são aplicadas pela ANPD à empresa; o encarregado não tem poder sancionador.', 3),
 ('Manter em sigilo a sua identidade para não receber reclamações.', false, 'Errada. É o oposto: a identidade e o contato do encarregado devem ser divulgados de forma clara e objetiva.', 4)
) AS v(texto, correta, comentario, ordem);

-- ############ Aula: Governança corporativa: noções essenciais ############
WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'governanca-corporativa-nocoes' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Segundo o vídeo, onde a governança corporativa tem os seus primórdios?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Nas grandes navegações, quando o risco das expedições exigiu regras formalizadas entre as partes — origem da responsabilidade limitada.', true, 'Correta. Reis e comerciantes financiavam viagens com risco real de não retorno, e isso pediu regras escritas; dali vem a ideia de responsabilidade limitada, hoje presente nas limitadas e nas S.A.', 1),
 ('Nas bolsas de valores do século XX.', false, 'Errada. As bolsas e as S.A. de capital aberto são a visão moderna e clássica da governança, não a origem histórica citada.', 2),
 ('Na criação do Instituto Brasileiro de Governança Corporativa.', false, 'Errada. O IBGC é citado como quem defende levar a governança às pequenas empresas, não como origem do tema.', 3),
 ('Na Lei Anticorrupção de 2013.', false, 'Errada. A Lei 12.846/2013 é um marco de compliance no Brasil, muito posterior à origem da governança.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'governanca-corporativa-nocoes' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'O que distingue o conceito moderno de governança corporativa da visão clássica?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A visão moderna se limita à relação entre acionistas e administradores.', false, 'Errada. Essa é a visão clássica, ligada à gestão das grandes companhias.', 1),
 ('A visão moderna inclui a responsabilidade da empresa perante colaboradores, fornecedores, concorrentes, a sociedade e o meio ambiente.', true, 'Correta. Governança moderna é responsabilidade corporativa no contexto em que a empresa está inserida — todos os públicos, e não só os donos.', 2),
 ('A visão moderna dispensa qualquer regra jurídica.', false, 'Errada. O vídeo mostra que as práticas de governança se materializam em normas internas e códigos de conduta — instrumentos jurídicos.', 3),
 ('A visão moderna se aplica apenas a empresas globais.', false, 'Errada. O exemplo do vídeo é a empresa de uma cidade pequena do interior, de que dependem muitas famílias.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'governanca-corporativa-nocoes' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'certo_errado', 'Julgue: "A governança corporativa é tema exclusivo das sociedades anônimas de capital aberto, sem aplicação a pequenas e médias empresas".', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. Por muitos anos foi assim, mas o vídeo — e o IBGC — defendem que os princípios e as práticas de governança podem e devem ir para as pequenas e médias empresas e até para startups.', 1),
 ('Errado', true, 'Certo. A governança começa pela chamada governança legal — organizar a documentação jurídica —, algo ao alcance de qualquer empresa, inclusive a nascente.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'governanca-corporativa-nocoes' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'O que o professor chama de "governança legal"?', 'Autoral', 'introdutorio', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A contratação de um escritório de advocacia para representar a empresa em juízo.', false, 'Errada. Governança legal não é litígio; é organização preventiva de documentos.', 1),
 ('A organização da documentação jurídica da empresa, acessível a sócios e gestores a qualquer tempo.', true, 'Correta. Certidões negativas, contrato social atualizado, contratos com fornecedores formalizados, documentos dos sócios — tudo pronto para um empréstimo, uma cisão, uma sucessão, um investidor ou uma venda.', 2),
 ('O cumprimento das leis trabalhistas apenas.', false, 'Errada. Cumprir a legislação trabalhista faz parte do compliance, mas a expressão do vídeo é mais específica: a documentação jurídica organizada.', 3),
 ('A publicação de balanços na bolsa de valores.', false, 'Errada. Isso é obrigação de companhia aberta; a governança legal vale para empresas de qualquer porte.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'governanca-corporativa-nocoes' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Muitos autores dizem que governança não é tema do Direito. Como o vídeo responde a essa objeção?', 'Autoral', 'intermediario', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Concorda: governança é assunto só de administradores e contadores.', false, 'Errada. O professor reconhece a objeção, mas a rebate.', 1),
 ('As práticas de administração, finanças e contabilidade chegam à empresa na forma de regras — normas internas, códigos de conduta e de ética —, que são instrumentos jurídicos.', true, 'Correta. Para valer dentro da empresa, a boa prática vira norma; e norma que obriga cada ator na sua competência é Direito.', 2),
 ('Governança é Direito porque só existe em lei federal.', false, 'Errada. Boa parte da governança está em regras internas da empresa, não em lei — e é justamente por isso que o vídeo precisa explicar por que ainda assim é matéria jurídica.', 3),
 ('O Direito só entra quando há processo judicial.', false, 'Errada. A dimensão jurídica da governança é preventiva: códigos e normas internas atuam antes de qualquer litígio.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (exercicio_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT e.id FROM exercicio e JOIN aula a ON a.id = e.aula_id WHERE a.slug = 'governanca-corporativa-nocoes' AND a.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Por que a função social da empresa importa para a governança moderna, segundo o vídeo?', 'Autoral', 'intermediario', 6)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Porque a empresa é ator relevante na sociedade: gera empregos e contratos, e o seu fechamento tem impacto coletivo.', true, 'Correta. A função social (CF/88, art. 170; Lei das S.A., arts. 116 e 154) leva a governança a buscar perenidade e geração de valor para a sociedade, não só para os acionistas do momento.', 1),
 ('Porque obriga a empresa a distribuir lucros aos moradores da cidade.', false, 'Errada. Função social não é distribuição de lucro a terceiros; é o dever de considerar os impactos da atividade sobre todos os públicos.', 2),
 ('Porque proíbe a empresa de ter fins lucrativos.', false, 'Errada. A empresa continua buscando lucro; a função social convive com a livre iniciativa (art. 170 da CF/88).', 3),
 ('Porque transfere a gestão da empresa ao Poder Público.', false, 'Errada. A função social não estatiza a gestão; ela orienta as escolhas dos controladores e administradores.', 4)
) AS v(texto, correta, comentario, ordem);

-- =====================================================================
-- Avaliações finais — questões com avaliacao_id (exercicio_id NULL)
-- =====================================================================

-- ############ Avaliação — Integração ############
WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'integracao-de-novos-colaboradores' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Um novo vendedor, muito extrovertido, começa a trabalhar no salão de uma loja do Grupo Aurora. Qual é a orientação da trilha para a primeira semana?', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Impor o próprio estilo desde o primeiro dia, para marcar presença.', false, 'Errada. Quem destoa do ambiente tira o foco e cria problemas para si, para os colegas e para o cliente.', 1),
 ('Observar como os colegas falam com o cliente e com a gerência, e combinar com o ambiente antes de agir.', true, 'Correta. É a regra prática da aula de postura: ler o ambiente e se comportar de acordo, sem deixar de ser você.', 2),
 ('Ficar em silêncio absoluto até ser promovido.', false, 'Errada. O extremo oposto também destoa: num time descontraído, a pessoa fechada demais também está fora de sintonia.', 3),
 ('Tratar o salão de vendas como o grupo de mensagens da equipe.', false, 'Errada. Cada ambiente tem o seu tom; a brincadeira do grupo pode não caber na frente do cliente.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'integracao-de-novos-colaboradores' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Uma comunicação interna eficiente, segundo a trilha, serve para:', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Difundir visão, missão e valores, integrar equipes, motivar as pessoas e construir a reputação da empresa.', true, 'Correta. São os benefícios do endomarketing listados na aula: alinhar o discurso da organização com o dos colaboradores e agregar valor ao negócio.', 1),
 ('Substituir as reuniões presenciais por mensagens automáticas.', false, 'Errada. A aula fala em interatividade — o colaborador quer interagir, não só receber comunicado.', 2),
 ('Controlar o que os funcionários publicam nas redes sociais pessoais.', false, 'Errada. Monitorar resultados da comunicação é um pilar; vigiar redes pessoais não é.', 3),
 ('Reduzir os custos com treinamento.', false, 'Errada. Esse benefício não aparece na aula; a comunicação interna é apresentada como ferramenta de resultado, não de corte.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'integracao-de-novos-colaboradores' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'certo_errado', 'Julgue: "Um comunicado interno bem produzido e distribuído por aplicativo dispensa a sinceridade sobre os resultados da empresa".', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. O pilar da transparência diz o contrário: mais do que tecnologia de ponta e mensagem bem produzida, é preciso ser sincero.', 1),
 ('Errado', true, 'Certo. Comunicado que maquia resultado ruim é falha de transparência: a equipe descobre, e o dano é maior que o resultado que se tentou esconder.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'integracao-de-novos-colaboradores' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Relacione o pilar à situação: "a campanha promocional chega ao vendedor depois que o cliente já perguntou por ela".', 'Autoral', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Falha de agilidade.', true, 'Correta. Agilidade é o tempo que a informação leva para chegar ao destinatário; aqui ela chegou tarde demais.', 1),
 ('Falha de engajamento.', false, 'Errada. Engajamento é atrair receptores e facilitar o entendimento; o problema do exemplo é o atraso.', 2),
 ('Falha de transparência.', false, 'Errada. A informação era verdadeira; ela apenas não chegou a tempo.', 3),
 ('Falha de monitoramento.', false, 'Errada. Monitorar resultados até ajudaria a perceber o atraso, mas o pilar que falhou foi a rapidez.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'integracao-de-novos-colaboradores' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Qual das opções resume corretamente as duas aulas da trilha?', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Comunicar bem é adaptar a postura ao ambiente e, na empresa, fazer a informação chegar rápido, a todos e com sinceridade.', true, 'Correta. A primeira aula trata do respeito ao ambiente; a segunda, dos sete pilares da comunicação interna — agilidade, interatividade, mobilidade, capilaridade, engajamento, monitoramento e transparência.', 1),
 ('Comunicar bem é falar o máximo possível para ser notado.', false, 'Errada. A primeira aula mostra que falar demais num ambiente que pede contenção é justamente o problema.', 2),
 ('Comunicar bem é usar apenas canais formais, como cartazes e memorandos.', false, 'Errada. Mobilidade e interatividade pedem canais que cheguem ao celular e permitam resposta.', 3),
 ('Comunicar bem depende só da tecnologia escolhida.', false, 'Errada. A tecnologia serve à capilaridade e à mobilidade, mas sem transparência e engajamento não há resultado.', 4)
) AS v(texto, correta, comentario, ordem);

-- ############ Avaliação — LGPD ############
WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'lgpd-no-atendimento-ao-cliente' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'No caixa, a operadora pede o CPF para a nota fiscal e, sem avisar, cadastra o número para enviar promoções. Qual princípio da LGPD foi violado?', 'Autoral', 'intermediario', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Finalidade: o dado foi coletado para um propósito (a nota) e usado para outro (propaganda) sem informar o titular.', true, 'Correta. O art. 6º, I, exige tratamento para propósitos legítimos, específicos e informados ao titular; usar o CPF da nota para marketing desvia da finalidade.', 1),
 ('Nenhum, porque o CPF já é um dado público.', false, 'Errada. O CPF é dado pessoal; e mesmo dado público só pode ser usado dentro da finalidade que justificou a sua disponibilização.', 2),
 ('Segurança, porque o CPF foi digitado no sistema.', false, 'Errada. Digitar o CPF para a nota é obrigação legal; o problema é o uso posterior para outro fim.', 3),
 ('Livre acesso, porque o cliente não viu a tela do caixa.', false, 'Errada. Livre acesso é o direito de consultar facilmente os próprios dados; o vício do exemplo é o desvio de finalidade.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'lgpd-no-atendimento-ao-cliente' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Segundo a LGPD, o que é consentimento?', 'Autoral', 'introdutorio', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Qualquer silêncio do cliente diante do cadastro.', false, 'Errada. Silêncio não é manifestação inequívoca; consentimento exige ato claro do titular.', 1),
 ('Manifestação livre, informada e inequívoca do titular para uma finalidade determinada, revogável a qualquer tempo.', true, 'Correta. É a definição do art. 5º, XII; e o art. 8º, § 5º, garante a revogação a qualquer momento.', 2),
 ('Autorização dada uma única vez, válida para qualquer uso futuro dos dados.', false, 'Errada. Consentimento é para finalidade determinada; uso novo exige nova base ou novo consentimento.', 3),
 ('Documento assinado apenas por pessoas jurídicas.', false, 'Errada. Quem consente é o titular, sempre pessoa natural.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'lgpd-no-atendimento-ao-cliente' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'certo_errado', 'Julgue: "Para emitir a nota fiscal com o CPF do cliente, a loja precisa obter o consentimento dele, porque essa é a única base legal admitida pela LGPD".', 'Inspirada em prova · Cebraspe', 'intermediario', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', false, 'Errado. Consentimento não é a única base legal. Emitir nota fiscal é cumprimento de obrigação legal (art. 7º, II); entregar a compra é execução de contrato; a câmera de segurança pode se apoiar no legítimo interesse.', 1),
 ('Errado', true, 'Certo. A LGPD prevê várias bases legais no art. 7º; o consentimento é apenas uma delas, e não é a adequada para o que a lei já obriga a fazer.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'lgpd-no-atendimento-ao-cliente' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Um cliente teve o cartão da loja negado por uma análise de crédito feita inteiramente por algoritmo e quer contestar. Que direito a LGPD lhe garante?', 'Autoral', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Nenhum: decisões de crédito não são alcançadas pela LGPD.', false, 'Errada. O exemplo de crédito é exatamente o que a aula usa para explicar o direito de revisão.', 1),
 ('O direito de solicitar a revisão de decisão tomada unicamente com base em tratamento automatizado que afete os seus interesses.', true, 'Correta. Art. 20 da LGPD: decisões automatizadas que definam perfil pessoal, profissional, de consumo ou de crédito podem ser revistas a pedido do titular.', 2),
 ('O direito de exigir a aprovação automática do cartão.', false, 'Errada. A lei garante revisão da decisão, não o resultado favorável.', 3),
 ('O direito de multar a loja diretamente.', false, 'Errada. Sanções são aplicadas pela ANPD; o titular pode reclamar a ela ou ir ao Judiciário.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'lgpd-no-atendimento-ao-cliente' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Qual das listas reúne apenas dados pessoais sensíveis?', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Nome, endereço e telefone.', false, 'Errada. São dados pessoais comuns: identificam a pessoa, mas não estão no rol do art. 5º, II.', 1),
 ('Origem racial ou étnica, convicção religiosa, dado de saúde e dado biométrico.', true, 'Correta. Todos constam do rol de dados sensíveis (art. 5º, II), ao lado de opinião política, filiação sindical, vida sexual e dado genético.', 2),
 ('CPF, e-mail e histórico de compras.', false, 'Errada. São dados pessoais comuns; o histórico de compras pode até revelar algo sensível, mas em si não está no rol.', 3),
 ('Relatórios de vendas por faixa etária, sem identificação.', false, 'Errada. Isso é dado anonimizado, que nem sequer é considerado dado pessoal.', 4)
) AS v(texto, correta, comentario, ordem);

-- ############ Avaliação — Governança ############
WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'governanca-e-compliance' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Governança, segundo a trilha, quer dizer:', 'Autoral', 'introdutorio', 1)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Governação: o conjunto de regras e práticas que organiza a relação entre todos os atores ligados a uma empresa, entidade ou governo.', true, 'Correta. É a definição ampla do vídeo — governança é gestão da relação entre os atores, e não apenas controle dos acionistas sobre os executivos.', 1),
 ('O conjunto de leis tributárias aplicáveis à empresa.', false, 'Errada. Tributos são um dos temas do compliance, mas governança é conceito mais amplo, de organização das relações.', 2),
 ('A gestão exclusiva das sociedades anônimas de capital aberto.', false, 'Errada. Essa é a visão antiga; a moderna alcança empresas de qualquer porte.', 3),
 ('O departamento de recursos humanos da empresa.', false, 'Errada. O RH pode participar da governança, mas não a define.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'governanca-e-compliance' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Uma loja do Grupo Aurora é a maior empregadora de uma cidade pequena. À luz da visão moderna de governança, o que isso implica?', 'Autoral', 'intermediario', 2)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Nada: a empresa só responde perante os acionistas.', false, 'Errada. Essa é a visão clássica; a moderna considera todos os públicos afetados pela empresa.', 1),
 ('A empresa tem responsabilidade perante colaboradores, fornecedores e a comunidade, porque o seu fechamento teria impacto coletivo — é a função social da empresa.', true, 'Correta. O exemplo é o do próprio vídeo: quantas famílias dependem da empresa? A governança moderna e a função social (CF/88, art. 170; Lei das S.A., arts. 116 e 154) levam a decisões de longo prazo.', 2),
 ('A empresa deve ser administrada pela prefeitura.', false, 'Errada. Função social não transfere a gestão ao Poder Público; ela orienta as escolhas dos controladores e administradores.', 3),
 ('A empresa fica dispensada de regras de governança por ser pequena.', false, 'Errada. O vídeo defende justamente levar a governança às pequenas e médias empresas.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'governanca-e-compliance' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'certo_errado', 'Julgue: "Códigos de conduta e códigos de ética são instrumentos jurídicos, porque traduzem em regras obrigatórias as práticas de governança".', 'Autoral', 'introdutorio', 3)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Certo', true, 'Certo. É a resposta do vídeo à objeção de que governança não seria tema do Direito: as práticas viram normas internas, e normas que obrigam cada ator na sua competência são instrumentos jurídicos.', 1),
 ('Errado', false, 'Errado. A afirmação corresponde ao que a aula ensina. O código de conduta do Grupo Aurora obriga quem o assina — e por isso faz parte do treinamento de integração.', 2)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'governanca-e-compliance' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Um sócio de uma média empresa falece e a família precisa apresentar ao banco e ao cartório o contrato social atualizado e as certidões negativas — mas nada está organizado. Que conceito da trilha esse caso ilustra?', 'Autoral', 'intermediario', 4)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('A falta de governança legal: documentação jurídica desorganizada gera corre-corre e perda de oportunidades.', true, 'Correta. Sucessão de sócio é um dos cenários citados no vídeo — junto com empréstimo, cisão, investidor e venda — em que a desorganização documental custa caro.', 1),
 ('A responsabilidade limitada dos sócios.', false, 'Errada. Responsabilidade limitada é a origem histórica citada na aula; não trata da organização de documentos.', 2),
 ('A função social da empresa.', false, 'Errada. Função social diz respeito ao impacto da empresa na coletividade, não à guarda de documentos.', 3),
 ('O direito penal simbólico.', false, 'Errada. Esse conceito não pertence a esta trilha; é uma crítica de política criminal, sem relação com governança.', 4)
) AS v(texto, correta, comentario, ordem);

WITH q AS (
  INSERT INTO questao (avaliacao_id, tipo, enunciado, origem, dificuldade, ordem)
  VALUES ((SELECT av.id FROM avaliacao av JOIN materia m ON m.id = av.materia_id WHERE m.slug = 'governanca-e-compliance' AND m.portal_id = (SELECT id FROM portal WHERE mascara = 'aurora')),
    'multipla_escolha', 'Qual das medidas abaixo é um exemplo de governança na dimensão de sustentabilidade, conforme a aula?', 'Autoral', 'introdutorio', 5)
  RETURNING id)
INSERT INTO alternativa (questao_id, texto, correta, comentario, ordem)
SELECT q.id, v.* FROM q, (VALUES
 ('Adotar políticas internas que evitem que a atividade da empresa gere danos ao meio ambiente.', true, 'Correta. O vídeo diz que, no mundo globalizado, a empresa precisa de política e prática de governança voltadas a preservar o meio ambiente — o "A" da sigla ESG.', 1),
 ('Aumentar o dividendo dos acionistas a cada trimestre.', false, 'Errada. Isso é interesse legítimo dos acionistas, mas não é a dimensão de sustentabilidade da governança.', 2),
 ('Manter em sigilo os contratos com fornecedores.', false, 'Errada. Sigilo indevido contraria a transparência; e contratos com fornecedores devem estar formalizados e organizados.', 3),
 ('Concentrar todas as decisões no sócio majoritário.', false, 'Errada. Concentração de poder sem regras é o oposto da governança, que organiza a relação entre todos os atores.', 4)
) AS v(texto, correta, comentario, ordem);
