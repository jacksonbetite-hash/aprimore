# Aprimore o Saber — Documento de Discovery

**Versão:** 1.0 · **Data:** 29/08/2026 · **Estágio:** ideia / do zero
**Construção:** sistema próprio · **Autoria:** multi-professor (responsável + convidados)

---

## 1. Sumário executivo

O **Aprimore o Saber** é uma plataforma de ensino jurídico com duas camadas: um site aberto que atrai por conteúdo (dicas, explicações e vade-mécum de consulta livre) e uma área paga com aulas em vídeo, materiais e exercícios, segmentada por área e assunto do Direito.

O que sustenta o produto:

1. **Segmentação fina do conteúdo** — Área → Matéria → Assunto → Aula → Exercício. Isso é o que permite vender por matéria e não só o catálogo inteiro.
2. **Licença como entidade de primeira classe** — o acesso não é "assinante sim/não", é a resolução de um conjunto de licenças com escopo e vigência.
3. **Vade-mécum integrado à aula** — o diferencial defensável. Não um PDF anexo, mas um painel lateral que abre o artigo citado na aula, com busca, favoritos e anotações.
4. **Exercício ao final de toda aula** — a aula sem exercício não é publicável. É regra de produto, não item opcional.

**Recomendação central de escopo:** o gargalo deste negócio não é software, é produção de conteúdo. O aluno escolhe livremente a matéria que deseja entre as publicadas. O catálogo tem **mapa definitivo de 7 áreas** e **catálogo de partida definido: 11 matérias** (§4), todas ainda a produzir, com **lançamento em ondas** — abre com as primeiras 3 a 5 prontas e libera as demais em ondas quinzenais/mensais. Quem preferir orientação em vez de escolha ganha, na Fase 2, um **plano de ensino sugerido**: um questionário rápido de perfil e nivelamento constrói a sugestão de estudo (§5.8).

**Decisões já validadas com o responsável:** licença vendida no nível Matéria (não por assunto) · trial de 7 dias sem cartão, limitado a ~20% do conteúdo · **a plataforma atenderá também menores de idade**, o que torna os requisitos do ECA Digital parte do escopo do sistema (§12.2) · **licença promocional** por matéria e período, gratuita ou com desconto, concedida por código, pelo admin ou por evento (§6.1.1) · **conta sem login por mais de 1 ano é bloqueada**, de forma reversível, com avisos prévios (§6.5) · **escolha livre de matéria pelo aluno**, com lançamento de 3 a 5 matérias e catálogo crescente · **plano de ensino sugerido por diagnóstico** de perfil e nivelamento, na Fase 2 (§5.8) · **site e sistema adaptados a mobile** — aluno mobile-first, admin e professor responsivos (§9) · **bloqueio de download dos vídeos com marca d'água dinâmica** — proteção em camadas (§10) · **mural de vagas e estágios** gratuito e em autosserviço, com aprovação prévia, gestão pelo anunciante e vigência máxima de 3 meses (§5.7.1) · **portal do professor (white-label)**: nova modalidade em que o professor opera site, acervo, base de alunos e faturamento próprios sobre a nossa infraestrutura, pagando licença mensal fixa mais percentual sobre as vendas (§5.10).

---

## 2. Visão e proposta de valor

> Entender Direito sem precisar decorar. Aula curta, linguagem de gente, a lei ao lado e um exercício no final para provar que você aprendeu.

**Para quem:** estudantes de Direito, bacharéis em preparação e curiosos que querem conhecer seus direitos.
**O que resolve:** o conteúdo jurídico gratuito é disperso e o pago é caro e enciclopédico. Falta o meio-termo: barato, direto, por assunto, e com prática imediata.
**Como se diferencia:** vende por matéria (não obriga o pacote), abre parte do conteúdo de graça, integra a lei ao estudo e usa linguagem acessível.

### O que NÃO é

- Não é curso preparatório oficial nem instituição de ensino credenciada pelo MEC — é **curso livre**, e isso precisa estar explícito no site.
- Não é consultoria jurídica nem responde caso concreto de usuário.
- Não substitui doutrina; complementa.

---

## 3. Personas

| Persona | Perfil | Dor | O que a converte |
|---|---|---|---|
| **Ana, 21 — graduanda** | 3º semestre, estuda pelo celular no ônibus, orçamento apertado | Não entende a matéria pela aula da faculdade, prova na semana que vem | Aula curta do assunto exato + exercício que simula a prova. Preço de uma matéria avulsa. |
| **Rafael, 27 — bacharel** | Trabalha, estuda à noite, foco em OAB/concurso | Precisa de revisão dirigida e volume de questões | Passe completo, simulados, estatística de acertos por assunto |
| **Carla, 34 — leiga** | Quer entender benefício do INSS / direito do consumidor | Linguagem jurídica é barreira | Conteúdo aberto + matéria avulsa por período curto |
| **Prof. convidado** | Especialista que quer alcance sem montar plataforma | Não quer cuidar de tecnologia, pagamento e suporte | Painel de autoria simples, relatório de audiência e repasse claro |
| **Você (admin)** | Responsável pelo produto, conteúdo e operação | Tempo escasso (5–15h/semana) | Operação que roda sozinha: cobrança, liberação, suspensão e relatórios automáticos |

**Nota sobre público:** o perfil de estudante de Direito no Brasil tem maioria feminina. Isso deve orientar tom e identidade visual (acolhedor, sem estética "cursinho masculino de concurso"), mas o produto não deve ser segmentado por gênero.

---

## 4. Taxonomia do conteúdo

A hierarquia é a espinha dorsal do sistema — dela dependem navegação, busca, licenciamento e relatórios.

```
Área          → Matéria/Disciplina  → Assunto/Tema              → Aula        → Exercício
Direito Público → Direito Constitucional → Controle de Constitucionalidade → Aula 03: ADI e ADC → 8 questões
```

### Mapa definitivo do catálogo (7 áreas)

Estrutura completa de áreas e matérias, mantida por decisão do responsável — é o mapa para onde o catálogo cresce:

- **Fundamentos** — Introdução ao Estudo do Direito, Hermenêutica, Filosofia e Sociologia Jurídica, Direitos Humanos
- **Direito Público** — Constitucional, Administrativo, Tributário, Previdenciário, Ambiental, Eleitoral, Financeiro
- **Direito Privado** — Civil (Parte Geral, Obrigações, Contratos, Coisas, Família, Sucessões), Empresarial, Consumidor
- **Penal** — Direito Penal (Geral e Especial), Processo Penal, Execução Penal
- **Trabalho** — Direito do Trabalho, Processo do Trabalho
- **Processo** — Processo Civil
- **Profissional** — Ética Profissional e Estatuto da OAB

### Catálogo de partida (as 11 matérias, encaixadas no mapa)

Definido pelo responsável. Todo o conteúdo **ainda será produzido**, e o lançamento é **em ondas**: abre com as primeiras 3 a 5 matérias prontas e libera as demais em ondas quinzenais/mensais — notícia recorrente sem segurar o lançamento. Cada matéria é segmentada por aulas, e **o vídeo da aula ministrada é o elemento principal de exibição** (§5.3). Carreiras Jurídicas, Breve História do Direito e Criminologia não constavam do mapa e **somam-se a ele** nas áreas indicadas.

| # | Matéria | Área | Ementa resumida |
|---|---|---|---|
| 1 | **Introdução ao Direito** | Fundamentos (≙ Introdução ao Estudo do Direito) | Norma, Constituição, Justiça, Moral e Ética, Conflito, Técnica Jurídica, Escolas do Direito, Fontes do Direito |
| 2 | **Carreiras Jurídicas** | Fundamentos *(soma ao mapa)* | Juiz, promotor, defensor público, procurador, advogado, analista, técnico, oficial de justiça e carreiras policiais |
| 3 | **Breve História do Direito** | Fundamentos *(soma ao mapa)* | Direito nos povos primitivos, Grécia Antiga, Roma Antiga, Idade Média, Idade Moderna e Idade Contemporânea |
| 4 | **Filosofia do Direito** | Fundamentos (≙ Filosofia e Sociologia Jurídica) | Por que as coisas são como são (ou como deveriam ser); contato transformador com os pensamentos de filósofos |
| 5 | **Teoria Geral do Direito Civil** | Direito Privado (≙ Civil — Parte Geral) | Personalidade e capacidade civil, direitos da personalidade, pessoas jurídicas de direito público e privado, vocabulário da área |
| 6 | **Teoria Geral do Processo** | Processo (porta de entrada de Processo Civil) | Formas de resolução de conflitos, princípios processuais, petição inicial, início do processo, atos dos magistrados (despachos, decisões, sentenças) |
| 7 | **Noções de Direito Constitucional** | Direito Público (nível introdutório de Constitucional) | Poderes Executivo, Legislativo e Judiciário, direitos políticos, direitos fundamentais |
| 8 | **Noções de Direito Administrativo** | Direito Público (nível introdutório de Administrativo) | Poderes e responsabilidades da Administração Pública — atenção especial para quem mira concurso público |
| 9 | **Noções de Direito Penal** | Penal (nível introdutório de Direito Penal) | Principais princípios, aplicação da lei penal, teoria geral do crime e sanções |
| 10 | **Criminologia** | Penal *(soma ao mapa)* | A ciência que estuda o crime e o infrator, para captar informações e reduzir delitos na sociedade |
| 11 | **Direito do Consumidor** | Direito Privado (≙ Consumidor) | Consumidor e fornecedor, produtos e serviços, vício e defeito, responsabilidade civil do fornecedor |

**Leitura editorial do catálogo:** as 11 de partida são a porta de entrada — "Noções de", teoria geral, história, carreiras — perfeitas para o posicionamento descontraído e para os públicos Ana (graduanda de início de curso) e Carla (leiga). As demais matérias do mapa (Tributário, Previdenciário, Trabalho, Ética/OAB, os módulos avançados de Civil etc.) entram nas ondas seguintes, guiadas pela lista de espera/votação. As "Noções de" também funcionam como degrau natural: quem conclui a introdutória recebe oferta da matéria completa quando ela for publicada.

**Áreas para navegação:** as 7 do mapa — Fundamentos · Direito Público · Direito Privado · Penal · Trabalho · Processo · Profissional. No lançamento, áreas ainda sem matéria publicada (Trabalho, Profissional) aparecem com "em breve" e lista de espera.

**Tags transversais** (ortogonais à hierarquia, usadas em filtros e trilhas):
`objetivo` (faculdade · OAB · concurso · cidadão) · `fase` (1º ao 10º semestre) · `dificuldade` (introdutório · intermediário · avançado) · `formato` (aula · revisão · caso prático · resumo)

**Regra de modelagem:** a licença é vendida no nível **Matéria**. Assunto e Aula herdam. Isso evita o inferno de precificar assunto avulso.

---

## 5. Escopo funcional por módulo

### 5.1 Site público (aberto, sem cadastro)
- Home com proposta de valor e prova social
- Catálogo navegável por área e matéria (ementa visível, aulas listadas com cadeado)
- Blog/artigos com dicas — motor de SEO e topo de funil
- **Vade-mécum de consulta livre** (aberto, é isca de tráfego orgânico)
- Glossário "juridiquês → português"
- Página de planos e licenças, com explicação de como adquirir
- Páginas legais: Termos, Privacidade, Reembolso e Cancelamento, Sobre, Contato

### 5.2 Área do aluno
- Painel com "continue de onde parou", progresso por matéria, próximos passos
- Player de aula: vídeo, transcrição, capítulos, materiais para download, artigos citados
- **Painel lateral do vade-mécum** dentro da aula
- Exercício ao final da aula, com correção imediata e comentário por alternativa
- Caderno de erros (questões erradas para refazer)
- Anotações pessoais e favoritos (em aulas e em artigos de lei)
- Minha conta: licenças ativas, faturas, meio de pagamento, cancelamento em 2 cliques

### 5.3 Aula — anatomia obrigatória
Toda aula publicada tem, sem exceção:

1. **Vídeo da aula ministrada — o elemento principal de exibição** (8–15 min é o alvo). O player abre a página da aula; tudo o mais (resumo, materiais, lei, exercício) orbita em torno dele.
2. Resumo em texto (3–8 parágrafos) — serve para SEO e para quem não quer vídeo
3. Dispositivos legais vinculados (chave para o vade-mécum)
4. Material de apoio (PDF opcional)
5. **Exercício** com no mínimo 5 questões e comentário em todas as alternativas

### 5.4 Vade-mécum
- Acervo: CF/88, CC, CP, CPC, CPP, CLT, CTN, CDC, Leis 8.212/91 e 8.213/91, Estatuto da OAB (8.906/94), ECA
- Busca por número de artigo (`art. 5º CF`) e por texto integral, com atalho global (tecla `/`)
- Navegação pelo índice hierárquico (livro / título / capítulo / seção / artigo)
- Favoritar artigo, anotar, marcar
- Deep link bidirecional: da aula para o artigo e do artigo para as aulas que o explicam
- Carimbo visível "texto conferido em DD/MM/AAAA" e rotina de atualização

**Fonte de dados:** LexML (Senado — dados abertos em JSON, licença aberta com atribuição) e Planalto para textos consolidados. Textos de lei e decisões judiciais **não são protegidos por direito autoral** (Lei 9.610/98, art. 8º, IV), então a reprodução é livre — a obrigação é de exatidão e atualização, não de licença.

### 5.5 Exercícios
- **v1:** múltipla escolha (formato OAB, 4 alternativas) e certo/errado (formato Cebraspe)
- **v2:** caso prático discursivo com espelho de correção; simulado cronometrado por matéria
- **v3:** revisão espaçada (o sistema devolve a questão errada em 3, 7 e 21 dias)
- Metadados por questão: gabarito, comentário por alternativa, dispositivos legais, dificuldade, tags, origem (autoral / inspirada em prova)
- Estatística por aluno: acerto por assunto, evolução, tempo médio

### 5.6 Professores: cadastro, autoria e remuneração

> **Implantado em 10/09/2026** como "professor sem página própria" (`docs/plano-perfis-e-acessos.md`, etapa 5; db/046): cadastro em autosserviço em `/para-professores/catalogo`, autoria no painel `/professor` em modo catálogo, publicação com revisão da plataforma, comissão-padrão de **40%** gravada na venda e apuração mensal pelo ciclo do §5.6.1 com o professor como dono. Aceita CPF ou CNPJ; o repasse é por Pix (o gateway exige subconta, que só o portal tem).

**Cadastro do professor** (pelo admin; autocadastro com aprovação em fase posterior):
- Dados pessoais e fiscais: nome, CPF/CNPJ, dados bancários/Pix, endereço, e-mail
- Perfil público: foto, mini-currículo, titulação, matérias que ministra (exibido nas páginas das matérias)
- **Contrato digital**: modelo de remuneração, percentual/valores, prazo, cessão/licença de uso do conteúdo, exclusividade — armazenado e versionado; **sem contrato ativo, o professor não publica**
- Status: `convidado → cadastrado → ativo → suspenso → desligado`

**Responsabilidade pelo conteúdo:** o professor é o responsável técnico pelas aulas que ministra — nome exibido na aula, e o contrato registra a responsabilidade pelo conteúdo apresentado. O desligamento de um professor não remove o conteúdo já cedido (conforme contrato).

**Modelos de remuneração (definidos pelo responsável — os dois suportados, escolhidos por contrato):**

| Modelo | Como funciona | Quando paga |
|---|---|---|
| **Por conteúdo gerado (cachê)** | Valor fixo por aula/módulo entregue e aprovado, definido no contrato | Na aprovação/publicação do conteúdo, no ciclo mensal |
| **Por comissão de vendas** | Percentual (definido no contrato) sobre a receita líquida das licenças da(s) matéria(s) do professor | Fechamento mensal (§5.6.1) |

Um contrato pode combinar os dois (ex.: cachê menor + comissão menor). Passe completo: a receita é rateada entre as matérias consumidas pelo aluno no período (critério de rateio: minutos assistidos por matéria — auditável e à prova de discussão).

**Autoria e fluxo editorial:**
- Perfis: **Autor** (cria e edita rascunho) · **Revisor** (aprova) · **Publicador/Admin** (publica, define preço e visibilidade)
- Estados do conteúdo: `rascunho → em_revisão → aprovado → publicado → arquivado`, com versionamento e histórico
- Relatório do professor: aulas publicadas, minutos assistidos, alunos alcançados, valor a receber
- Upload de vídeo pelo próprio autor, com transcodificação e revisão antes de publicar

### 5.6.1 Fechamento de contas do professor (comissão)

Modelo definido: **apuração mensal automática**.

```
Ciclo (dia 1 a último dia do mês):
1. APURAÇÃO   — sistema consolida as vendas líquidas do mês por professor:
                receita bruta das licenças da matéria
                (−) taxas de gateway   (−) impostos   (−) reembolsos/estornos do período
                (×) percentual do contrato  = comissão do mês
                (+) cachês de conteúdo aprovado no mês
2. CONFERÊNCIA — extrato detalhado venda a venda liberado ao professor
                 (D+3 úteis); prazo de contestação de 5 dias
3. FATURAMENTO — professor emite NF no valor apurado
4. PAGAMENTO   — transferência/Pix até o dia 15; valor mínimo de saque
                 R$ 100 (saldo menor acumula para o mês seguinte)
```

- **Estornos e reembolsos** (inclusive os 7 dias do CDC): deduzidos da apuração do mês em que ocorrem — por isso a apuração mensal foi escolhida em vez do split imediato na venda.
- **Extrato permanente** no painel do professor: cada venda, cada dedução, cada fechamento — transparência é o que mantém professor parceiro.
- Estados da apuração: `aberta → em_conferencia → contestada → aprovada → paga`.
- Toda apuração e pagamento auditados (quem aprovou, quando, comprovante).

### 5.7 Publicidade e patrocínio

Requisito definido pelo responsável: o site vende espaço publicitário para **faculdades, cursos, empresas e patrocinadores**.

**Modelo de venda (decisão):** venda direta gerida no admin — página "Anuncie aqui" com mídia kit (audiência, perfis, posições, tabela de preços) e formulário de contato; a negociação é feita por você, e o admin cadastra anunciante, campanha e peças. Sem autosserviço na v1.

**Posições (decisão): somente áreas gratuitas** — site público, blog, vade-mécum aberto e contas free/trial. **Assinante pago estuda sem anúncio** — isso vira benefício explícito do plano pago na página de vendas.

**Formatos previstos:**
- Banner display nas páginas públicas (topo, lateral, entre seções do blog)
- Conteúdo patrocinado no blog (artigo identificado como "oferecido por")
- Patrocínio de seção (ex.: "Vade-mécum oferecido por [Faculdade X]" por período)
- Destaque no diretório de Carreiras Jurídicas (faculdades e cursos parceiros)

**Regras e salvaguardas:**
- Toda peça identificada como publicidade (CDC, art. 36 — publicidade deve ser identificável como tal)
- **ECA Digital:** anúncios servidos por posição/contexto, **nunca por comportamento** — sem remarketing nem segmentação comportamental, o que também resolve a restrição para menores (§12.2). Anunciante não recebe dado pessoal de aluno.
- Curadoria editorial: recusa de anúncios incompatíveis (conteúdo enganoso, "aprovação garantida" etc.) prevista em contrato
- Métricas para o anunciante: impressões e cliques por peça, relatório mensal automático

**Gestão no admin:** cadastro de anunciante (razão social, CNPJ, contato, contrato), campanhas (peças, posições, período, valor), calendário de ocupação de posições, faturamento do anunciante e relatório de entrega.

### 5.7.1 Mural de vagas de emprego e estágio — Fase 2

Requisito definido pelo responsável: o site tem uma seção de **vagas de emprego e estágio** que escritórios de advocacia (e empresas com vagas jurídicas em geral — departamentos jurídicos, órgãos, faculdades) publicam de forma **gratuita e em autosserviço**.

**Fluxo:**

```
Anunciante cria conta (CNPJ obrigatório) → cadastra a vaga →
fila de moderação (aprovação prévia do admin) → publicada →
gestão pelo próprio anunciante → expira em até 3 meses
```

**Portal do anunciante (requisito do responsável):** para anunciar, o escritório **se cadastra na plataforma** e ganha uma **sessão própria de gestão**, separada da área do aluno:

- **Cadastro do escritório:** razão social, CNPJ (validado), responsável, contato, endereço, logo — editável a qualquer momento pelo próprio anunciante.
- **Gestão de vagas:** criar, editar, pausar, encerrar e repostar vagas; visão do status de cada uma (`em moderação`, `publicada`, `pausada`, `expirada`, `reprovada` com motivo) e da data de expiração.
- **Métricas por vaga:** visualizações e cliques em "como se candidatar".
- Login próprio com perfil `anunciante` (mesmo sistema de autenticação, papel distinto — um usuário pode acumular papéis, ex.: advogado que é aluno e anunciante).
- É o mesmo cadastro de anunciante da frente publicitária (§5.7): quem anuncia vaga hoje é lead natural de banner e patrocínio amanhã.

**Regras definidas:**
- **Publicação gratuita e em autosserviço** — o anunciante cria, edita, pausa e encerra a própria vaga; a gestão da vaga é **responsabilidade do anunciante** (disclaimer visível: a plataforma não intermedeia a contratação nem garante a vaga).
- **Aprovação prévia:** toda vaga passa pela fila de moderação antes de publicar — proteção contra golpes e vagas falsas, essencial com menores na plataforma. Reprovação com motivo notificado.
- **Vigência máxima de 3 meses:** contada da publicação, com expiração automática. Avisos ao anunciante em D-15 e D-3; renovar exige repostar (novo ciclo de moderação), o que impede vaga fantasma perpétua.
- Campos da vaga: cargo, tipo (emprego/estágio), regime, local ou remoto, requisitos, faixa salarial (opcional), como se candidatar (link ou e-mail externo — a candidatura acontece fora da plataforma na v1).
- **Denúncia de vaga** pelo aluno, com fila de revisão no admin.
- Filtros para o aluno: tipo, cidade/UF, área do Direito, data; conexão com a matéria **Carreiras Jurídicas** (vagas exibidas junto ao conteúdo da carreira correspondente).
- **Monetização futura (não é requisito):** destaque pago opcional (topo da lista, selo, divulgação no blog) — reaproveita o cadastro de anunciante da frente publicitária.

**LGPD:** a candidatura ocorre fora da plataforma (link/e-mail do anunciante), então não armazenamos currículos na v1 — decisão que elimina uma classe inteira de obrigações de proteção de dados. Se no futuro houver candidatura interna, tratar como novo requisito com retenção própria.

### 5.8 Plano de ensino sugerido (diagnóstico) — Fase 2

O aluno tem dois caminhos de entrada, sempre:

1. **Escolha livre** — navega no catálogo e escolhe a matéria que quiser. É o caminho padrão, disponível desde o MVP.
2. **Plano de ensino sugerido** — para quem prefere orientação: um **conjunto de questões de resposta rápida** define o perfil e o nível de entendimento do aluno, e o sistema constrói uma sugestão de estudo personalizada.

**O diagnóstico (5–10 minutos):**
- *Perfil:* objetivo (faculdade, OAB, concurso, conhecimento pessoal), fase/semestre, tempo disponível por semana, preferência de formato.
- *Nivelamento:* questões rápidas dos assuntos-chave das matérias relacionadas ao objetivo, sorteadas do banco de questões existente, para medir o nível de entendimento por assunto.

**O plano sugerido entrega (as quatro dimensões definidas):**
1. **Ordem de estudo dentro da matéria** — sequência de assuntos e aulas, pulando ou marcando como revisão o que o nivelamento indicar como dominado.
2. **Trilha entre matérias** — roteiro que cruza matérias conforme o objetivo (ex.: "para seu objetivo, comece por Constitucional, depois Administrativo").
3. **Ritmo e cronograma** — distribuição semanal com base no tempo declarado (ex.: "3 aulas + 15 questões por semana; conclusão estimada em 8 semanas"), com recalibração se o aluno atrasar ou adiantar.
4. **Sugestão de licença** — com o plano montado, o sistema indica o que compensa: matéria avulsa, combo ou passe completo. O plano vira ferramenta de conversão.

**Regras:**
- O diagnóstico é gratuito e aberto a qualquer cadastrado — é isca de topo de funil e alimenta a sugestão de licença.
- O plano é **sugestão, não trilho obrigatório**: o aluno edita, reordena e abandona quando quiser.
- Refazer o nivelamento é permitido (ex.: a cada 3 meses) e recalibra o plano.
- O progresso real (aulas concluídas, acertos em exercícios) realimenta o plano continuamente.
- Entra na **Fase 2**: precisa de mais matérias publicadas e banco de questões volumoso para calibrar bem. No MVP, um recorte leve (quiz de perfil sem nivelamento, apenas para ordenar o catálogo exibido) pode ser avaliado no planejamento da Fase 1.

### 5.9 Administração

Reforço do responsável: a área administrativa concentra **controle de valores das licenças, cadastros e financeiro**.

**Valores e comercial**
- **Tabela de valores das licenças:** preço por matéria × período e do passe completo, com vigência (preço novo vale a partir de data X, sem afetar licenças vigentes), histórico de alterações e simulação de impacto
- Planos, cupons e campanhas promocionais (criar campanha, gerar códigos, conceder manualmente, gatilhos automáticos, acompanhar resgates)

**Cadastros**
- Alunos: busca, perfil, licenças, progresso, atendimento
- **Professores:** cadastro completo, contrato e modelo de remuneração (§5.6)
- Anunciantes e campanhas publicitárias (§5.7)
- Gestão de licenças (conceder cortesia, estender, suspender) e de contas inativas (painel por estado, reativação manual)

**Financeiro**
- Recebimentos, inadimplência, reembolsos, conciliação com gateway
- **Fechamento de contas dos professores** (§5.6.1): fila de apurações do mês, aprovação, registro de NF e comprovante de pagamento
- Faturamento de anunciantes
- Visão consolidada: receita por fonte (licenças, publicidade), custos, repasses

**Transversal**
- Painel de métricas (§13)
- Auditoria: quem alterou o quê e quando — obrigatória em preço, contrato, apuração e concessão de licença

---

### 5.10 Portal do Professor — modelo white-label (novo serviço)

Segunda modalidade comercial, ao lado do professor convidado do §5.6. Ali o professor entrega conteúdo e recebe comissão; **aqui ele opera o próprio negócio dentro da nossa infraestrutura** — site com endereço próprio, acervo próprio, base de alunos própria e faturamento próprio. Nós fornecemos a plataforma e cobramos por isso.

O nome interno é **portal do professor**; cada portal é um *tenant* — uma fatia isolada do sistema, identificada pelo endereço de acesso.

**A promessa ao cliente:** "seu site de aulas no ar em um dia, sem contratar desenvolvedor, sem cuidar de servidor, sem montar checkout — você grava, publica e recebe."

#### Decisões tomadas

| Tema | Decisão |
|---|---|
| **Endereço (a "máscara")** | Subdomínio do nosso domínio, nome escolhido pelo cliente: `jackson.aprimoreosaber.com.br`. Certificado curinga único, DNS sob nosso controle. **Domínio próprio do professor** (`site.dominiodele.com.br`, via CNAME) fica como **upgrade pago da Fase 2** — a resolução de tenant já será por cabeçalho `Host`, então não há retrabalho |
| **Fluxo do dinheiro** | **Split automático no gateway**, com subconta do professor. Ele recebe a parte dele na liquidação; nós retemos o percentual |
| **Cobrança do professor** | **Licença mensal fixa + percentual fixo sobre as vendas.** Duas linhas na mesma fatura mensal |
| **Acréscimo por indicação** | Aluno que chega ao portal por anúncio nosso: **+5 pontos percentuais** sobre aquela venda, **só na primeira compra** dele naquele portal (§5.10.1) |
| **Acervo** | **Escolha do professor, matéria a matéria**: fica só no portal dele, ou aparece também na nossa vitrine |
| **Base de alunos** | **Separada por portal.** O aluno do professor não existe no nosso catálogo, e vice-versa. **Revisto em 10/09/2026** (`docs/plano-perfis-e-acessos.md`, db/045): a **credencial** passou a ser uma por e-mail — a mesma senha entra na plataforma, no portal do professor e no da empresa —, mas o **perfil** (licenças, progresso, setor) continua um por portal, com o mesmo isolamento por chave composta. Quem quer acessos separados usa outro e-mail |
| **Publicação de conteúdo** | **Direta, com moderação reativa.** Autonomia é a promessa do produto; não há revisor no caminho |
| **Vídeo** | Cota de armazenamento e banda por plano, **excedente cobrado** |
| **Quando** | **Em paralelo à Fase 1** — há professor interessado. Ver a ressalva de capacidade no §16 |
| **Entrada do professor** | **Autosserviço completo** (03/09/2026): ele se cadastra, escolhe o plano, paga a primeira mensalidade e o portal nasce sozinho. Sem fila de aprovação — coerente com a publicação direta já decidida |
| **Divulgação pública** | Página `/para-professores` e seção em `/planos`, com **valor fechado** do plano ativo, lido de `portal_plano` |

#### Anatomia do portal (estrutura única, sem editor livre)

Uma página só, em seções fixas, com conteúdo preenchido pelo professor:

1. **Abertura** — título, chamada, foto ou vídeo de apresentação, e o espaço para descrever o propósito do trabalho
2. **Acervo** — vídeos organizados por **área → assunto**, com cadeado no que exige licença
3. **Oferta** — o que ele vende e por quanto
4. **Prova e contato** — sobre o professor, depoimentos, contato
5. **Rodapé legal** — termos, privacidade, reembolso, identificação do responsável

O professor controla texto, imagens, cores dentro de uma paleta permitida e a ordem do acervo. **Não** controla HTML, CSS nem estrutura — é o que mantém o provisionamento automático e o suporte viável.

#### A regra que sustenta o modelo: origem da venda

Como o mesmo conteúdo pode ser vendido em dois lugares, **a origem da venda decide tudo** — base do aluno, licença e dinheiro:

| Onde a venda aconteceu | Aluno vai para | Dinheiro |
|---|---|---|
| **Portal do professor**, tráfego dele | Base do portal | Split no gateway: professor recebe direto, nós retemos o **percentual base** |
| **Portal do professor**, aluno trazido por anúncio nosso | Base do portal | Split com **percentual base + 5 pontos percentuais** (§5.10.1) |
| **Nossa vitrine** (matéria que ele optou por compartilhar) | **Nossa base** | Venda nossa; o professor recebe **comissão** pela regra do §5.6.1 |

Em termos de modelo de dados, isso é uma coluna: `pedido.portal_id` — o portal quando a venda nasce lá, **`0` quando nasce na nossa vitrine**. Essa coluna é o eixo do módulo inteiro.

**Por que `0` e não `NULL`** (decidido ao escrever `db/018_portal.sql`): a plataforma é o portal 0, uma linha reservada, e a coluna é `NOT NULL` em toda parte. Com `NULL`, cada consulta precisaria de `IS NOT DISTINCT FROM` e um esquecimento viraria vazamento silencioso — que é o risco 14, classificado como crítico. Com sentinela, `WHERE portal_id = $1` está sempre certo e, se o parâmetro vier nulo por bug, a consulta devolve zero linhas: falha fechada, que é como uma falha de isolamento precisa falhar.

#### 5.10.1 Acréscimo por indicação: +5 pontos percentuais

Quando o aluno chega ao portal **por anúncio ou vitrine no nosso catálogo** e compra lá, o percentual sobre aquela venda sobe em **5 pontos percentuais** — se o contrato prevê 10%, aquela venda paga 15%. Não é 5% relativo: são 5 pontos somados.

**Incide uma única vez: na primeira compra daquele aluno naquele portal.** Renovações e compras seguintes voltam ao percentual base. A lógica é honesta dos dois lados — nós entregamos o aluno, e por isso cobramos a mais na conversão; a relação daí em diante é do professor, e por isso não cobramos para sempre.

**Como a origem é provada** — este é o ponto que evita disputa (§15.12):

1. Todo anúncio ou card de vitrine do portal aponta para um **link rastreado**, com identificador assinado por nós.
2. O vínculo é gravado **no clique**, não no checkout: chegou pelo link, nasce um registro de indicação com o portal, o carimbo de tempo e o prazo de validade.
3. O primeiro pedido pago daquele aluno naquele portal **consome** o vínculo — e o consumo fica registrado no pedido, com data do clique e origem. Consumido, não incide de novo.
4. O professor **não tem como remover ou editar** o marcador, e o extrato dele mostra, venda a venda, quais tiveram o acréscimo e por quê. Transparência aqui é o que sustenta a cobrança.

**Validade do clique — premissa a confirmar:** adotei **90 dias** entre o clique e a compra. Sem prazo, um clique de dois anos atrás cobraria a mais numa venda que o professor conquistou sozinho; com prazo curto demais, perdemos a conversão lenta, que é a regra em educação. O número fica como parâmetro do contrato do portal, ao lado de `dias_retencao`.

**Boa notícia técnica:** como o split do Asaas é definido **por cobrança** (`percentualValue` na criação), o acréscimo é aplicado no ato — o pedido nasce já com 15% em vez de 10%. Não há apuração mensal nem cobrança posterior para isso.

**No modelo de dados:** `indicacao` (portal, token, criada_em, expira_em, consumida_em, pedido_id) e, em `pedido`, o percentual efetivamente aplicado — guardar o número usado, e não recalculá-lo depois, é o que permite auditar uma venda de dois anos atrás sem depender do contrato vigente hoje.

**Consequência assumida:** o sistema passa a ter duas bases de aluno e dois motores financeiros. É deliberado, e o preço disso é que toda consulta de catálogo, licença e pedido precisa ser escopada por portal.

#### Ciclo financeiro do professor

```
VENDA no portal → gateway divide na liquidação
                   ├─ parte do professor → subconta dele (retida por D+N)
                   └─ nosso percentual   → nossa conta

FECHAMENTO MENSAL → fatura ao professor:
                   ├─ licença mensal do plano
                   ├─ excedente de armazenamento/banda
                   └─ ajustes: reembolsos e chargebacks do período
```

**Retenção como parâmetro, não como regra fixa.** O reembolso de 7 dias do CDC (§6.6, art. 49) e o chargeback chegam depois de o split já ter liberado o dinheiro. Por isso `dias_retencao` e `percentual_reserva` são **campos do contrato do portal**, não constantes de código.

**Verificado na documentação dos gateways (setembro/2026):**

- **Asaas.** O split é calculado sobre o `netValue` (valor já líquido de taxas) e aceita percentual, valor fixo ou os dois. No estorno, *"o split também será estornado — todas as contas que receberam o saldo da cobrança terão a transferência estornada"*. **O ponto crítico:** se a subconta já não tiver saldo, *"a conta principal é garantidora em caso de saldo negativo na subconta, causado por débito da antecipação, chargeback, estorno"*, e o titular da conta raiz assume **responsabilidade solidária** pelas obrigações das subcontas. Ou seja: sem retenção, o reembolso do aluno sai do nosso caixa.
- **A trava existe e se chama Conta Escrow** (Asaas). Os valores transacionados pela subconta ficam retidos por prazo definido por nós, liberados só depois. O prazo é configurado **por subconta**, no campo `daysToExpire`, e a liberação acontece automaticamente ao fim do período, **manualmente via API**, ou ao desabilitar o recurso. Só entram no fluxo as cobranças recebidas **após a habilitação**, e o recurso **tem cobrança recorrente por subconta habilitada** — custo a embutir no preço do plano.
- **Pagar.me** resolve por outro caminho: o split marca, por recebedor, quem é `liable` (responsável pelo chargeback), quem paga as taxas e quem fica com o resto do rateio — dá para tornar o professor o responsável pelo estorno. A retenção, porém, é indireta (`transfer_settings.transfer_enabled = false` suspende a transferência automática) e a documentação pública não descreve o caminho de liberação manual.

**Decisão técnica derivada:** **Asaas com Conta Escrow**, porque `daysToExpire` mapeia um-para-um no nosso `dias_retencao` — o desenho parametrizado do contrato do portal vira configuração de subconta, sem código de conciliação próprio. `percentual_reserva` permanece como colchão adicional aplicado por nós na apuração, para o chargeback que chega depois do fim da escrow.

**Duas consequências de cadastro, ambas com efeito imediato:**

1. **Este modelo exige CNPJ.** A documentação do Asaas é explícita: *"Contas de pessoa física (CPF) não podem criar subcontas"*, por exigência regulatória do Banco Central. Isso encerra a decisão 2 do §16 — se o portal do professor existe, a operação precisa ser pessoa jurídica.
2. **Período de avaliação regulatória.** Contas novas que criam subcontas por API começam limitadas: **60 dias, no máximo 10 subcontas e R$ 2.000 por subconta**, até a homologação. O piloto com um professor cabe folgadamente, mas **o teto de R$ 2.000 por subconta pode travar o primeiro mês de vendas dele** — pedir homologação antes de abrir o portal, não depois.

#### Inadimplência do professor

Regra decidida: **o portal sai do ar, mas o aluno com licença vigente continua assistindo até o fim da vigência.**

```
D+0  vencimento          → aviso
D+5  segundo aviso       → banner no painel do professor
D+10 SUSPENSÃO PARCIAL   → portal fora do ar para visitantes
                           novas vendas bloqueadas
                           painel do professor em modo leitura
                           ►  ALUNO COM LICENÇA VIGENTE CONTINUA ACESSANDO
D+60 encerramento        → conforme contrato; conteúdo preservado pelo prazo de saída
```

A exceção do aluno não é gentileza: o contrato dele é com quem lhe cobrou, e derrubar o acesso de quem pagou por dívida de terceiro é exposição direta a Procon e a ação individual.

#### Responsabilidade, LGPD e conteúdo

- **Publicação direta** significa conteúdo de terceiro hospedado no nosso domínio. Mitigação: contrato com declaração de titularidade e responsabilidade exclusiva do professor, canal de denúncia visível, remoção rápida após notificação, e identificação do responsável no rodapé de cada portal.
- **Base separada torna o professor controlador** dos dados dos alunos dele; nós somos **operadores**. Isso exige, além do contrato comercial, um **contrato de tratamento de dados (DPA)** definindo finalidade, subcontratação, incidentes e devolução/eliminação ao fim.
- **ECA Digital (§12.2) continua sendo nossa obrigação** — a infraestrutura, o vídeo e o checkout são nossos. As exigências relativas a menores valem no portal do professor exatamente como valem no site principal.
- **Direito de recusa e desligamento** por conteúdo ilícito, plágio, prática enganosa ou dano à marca — cláusula expressa, com efeito imediato.

#### Impacto no modelo de dados (§11)

| Bloco | Mudança |
|---|---|
| **Novo** | `portal` (professor, máscara/subdomínio, plano, status, personalização) · `portal_plano` (licença mensal, percentual, cotas) · `portal_contrato` (percentual, acréscimo por indicação, validade do clique, `dias_retencao`, `percentual_reserva`, vigência) · `portal_consumo` (armazenamento e banda por mês) · `portal_fatura` · `indicacao` (§5.10.1) |
| **Ganha escopo de portal** | `area`, `materia`, `assunto`, `aula`, `licenca`, `pedido`, `assinatura`, `usuario`, `preco` — todos passam a carregar `portal_id` `NOT NULL` (`0` = plataforma), com chave estrangeira composta `(pai_id, portal_id)` impedindo pendurar conteúdo de um portal em outro |
| **Muda restrição** | `materia.slug` deixa de ser único global e passa a ser **único por portal** — hoje é `UNIQUE` em `db/001_schema.sql` e dois professores com "Direito Penal" colidiriam |
| **Ganha campo** | `licenca` registra a origem (portal ou plataforma); o motor do §6.3 passa a resolver acesso **dentro do escopo do portal** — o passe CATALOGO da plataforma não alcança acervo de portal |

#### Impacto na arquitetura (§10)

- **Resolução de tenant por `Host`** no middleware, antes de qualquer consulta. Um erro aqui vaza conteúdo de um portal para outro — é o ponto que exige teste automatizado tão rigoroso quanto o motor de licença (§15.8).
- **nginx passa a escutar :443** com certificado curinga — hoje o `nginx/aprimoreosaber.conf` só atende :80. A entrega de vídeo por `X-Accel-Redirect` não muda: a assinatura de `lib/video.ts` apenas ganha o portal dentro do escopo.
- **Vídeo de portal deve nascer em CDN externa** (Bunny/Cloudflare, já suportados por `lib/video.ts`): o custo passa a ser variável e diretamente repassável, e o acervo de terceiros não consome disco e banda da nossa VPS.
- **Medição por portal** (GB armazenados, GB trafegados) vira requisito de faturamento, não item de observabilidade.
- **Reserva de máscara**: lista de nomes proibidos (rotas do sistema — `admin`, `api`, `www`, `blog`, `planos` —, marcas de terceiros e termos ofensivos), aprovação da máscara no cadastro, e política de liberação após encerramento.

#### 5.10.2 Plano de construção (revisado em 03/09/2026)

A retaguarda do portal já existe: cadastro de professor, criação do portal com máscara, edição, status, planos, contrato com aceite registrado por IP e tabela de preços do portal (`app/admin/portais/`, `lib/admin-portais.ts`). O que falta é o que transforma isso num **produto que se vende sozinho** — e é o que este plano cobre.

**Duas decisões desta rodada mudam a ordem do trabalho:**

1. **Autosserviço acopla a divulgação ao financeiro.** Se o professor se cadastra e paga sozinho, o portal precisa nascer de um pagamento confirmado, e a subconta com split precisa existir antes da primeira venda dele. Sem isso, a receita das vendas do professor cai na nossa conta e viramos devedores no dia seguinte. A página pública, portanto, **não pode ser entregue isolada**.
2. **Compartilhar curso com a nossa vitrine exige mexer na trava de isolamento.** Verificado no banco: um aluno da plataforma comprando curso de portal é recusado por `licenca_materia_mesmo_portal`. É a mesma trava que impede vazamento entre portais (§15.14) — ela e a vitrine compartilhada não convivem sem uma regra explícita.

##### A regra que destrava a vitrine compartilhada

Hoje `portal_id` responde a duas perguntas ao mesmo tempo, e elas se separam:

| Coluna | Significa | Vale para |
|---|---|---|
| `portal_id` | **De quem é o aluno** — qual base, qual login, qual site | licença, pedido, assinatura |
| `materia_portal_id` (nova) | **De quem é o curso** — quem produziu e quem recebe por ele | licença, pedido, assinatura |

- A chave estrangeira composta `(materia_id, materia_portal_id) → materia(id, portal_id)` continua garantindo que o curso existe naquele portal.
- Um `CHECK` permite as duas divergirem **somente quando `portal_id = 0`**: a plataforma pode vender curso de professor; o portal de um professor **nunca** vende curso de outro.
- A conferência de `na_vitrine_plataforma` fica na aplicação, não no banco, de propósito: o professor pode tirar o curso da vitrine amanhã, e isso **não pode invalidar** a licença de quem já comprou.

##### Sequência

| # | Etapa | Entrega | Por que nesta posição |
|---|---|---|---|
| **1** | **Cobrança e provisionamento do professor** — ✅ **entregue em 03/09/2026** | `lib/portal-assinatura.ts`: contratação em transação única (conta + portal RASCUNHO + contrato aceito com IP + 1ª fatura) · webhook idempotente ativa o portal ao confirmar (`PF-` roteado em `/api/webhook`) · CNPJ validado (inclusive o formato alfanumérico de 2026) · teto regulatório vira lista de espera · RASCUNHO não resolve publicamente. 9 testes de integração + 7 de CNPJ; provado por HTTP: portal nasce invisível, paga, ativa e o endereço passa a ser dele | É a espinha do autosserviço. Sem ela, a página pública promete o que o sistema não entrega |
| **2** | **Subconta, split e trava de venda** — ✅ **entregue em 03/09/2026** | `db/024_subconta.sql` + `lib/portal-subconta.ts`: portal ativado abre a subconta automaticamente (EM_ANALISE) · aprovação/recusa chegam por webhook, idempotentes · a aprovação liga a Conta Escrow com o `dias_retencao` do contrato na mesma passada · `abrirPedido` recusa venda de portal sem subconta APROVADA + escrow, e grava `percentual_aplicado` do contrato no pedido, passando o split (carteira do professor + nosso percentual) ao provedor · em desenvolvimento, `scripts/aprovar-subconta.mjs` faz o papel do gateway. 6 testes de integração; provado por HTTP: contratou → pagou → ATIVO + EM_ANALISE → aprovada → escrow 30 dias | Impede o cenário em que o professor vende e o dinheiro cai na nossa conta |
| **3** | **Divulgação e funil** — ✅ **entregue em 03/09/2026** | `/para-professores`: proposta, como funciona, preço lido do plano ativo (`portal_plano`, nunca número no código) e formulário de contratação que chama `assinarPortal` — quem contrata sai logado, direto para a tela de pagamento (`/para-professores/pagamento/[ref]`, que vira "seu portal está no ar" ao confirmar e informa a análise da subconta) · seção em `/planos`, chamada na home, link no rodapé e faixa no catálogo, todos **só no site principal** (dentro do portal de um professor, anunciar "monte o seu" seria concorrência na casa dele) · e2e de funil no navegador (`testes-e2e/portal-professor.mjs`, 16 checagens): do anúncio na home ao portal no ar, com CNPJ errado barrado e isolamento conferido | Só agora a promessa pública é verdadeira ponta a ponta |
| **4** | **Alunos e financeiro do portal** — ✅ **entregue em 03/09/2026** | **Indicação (§5.10.1)**: `/ir/<mascara>` cria a indicação no clique com a validade do contrato e redireciona ao portal; o proxy guarda o token em cookie do portal; cadastro/login vinculam; `abrirPedido` aplica base + acréscimo e grava no pedido; o pagamento consome — uma vez só (`lib/portal-indicacao.ts`). **Consumo**: banda contada na rota de vídeo por faixa servida, armazenamento medido no disco (`lib/portal-financeiro.ts`). **Fatura**: fechamento por competência = licença + excedente (GB inteiro acima da cota, gravado no detalhe) + ajustes com motivo obrigatório, cobrada pelo mesmo webhook `PF-`. **Régua**: vencida → EM_ATRASO; vencida há 10 dias → portal SUSPENSO (visitante vê aviso; aluno com licença continua; compra barrada); pagamento reativa. **Admin**: `/admin/portais/[id]/alunos` (base do professor, aviso LGPD, cortesia) e `/financeiro` (consumo × cota, faturas, fechar competência, extrato venda a venda com ★ de indicação). `scripts/fechar-mes.mjs` é o cron do dia 1. Correções de passagem: cortesia gravava `portal_id` errado; o CHECK de consumo da indicação brigava com o `SET NULL` do pedido (`db/025`). 17 testes de unidade + 12 de integração + e2e | Depende de haver venda para relatar |
| **5** | **Vitrine compartilhada** — ✅ **entregue em 03/09/2026** | `db/026`: `materia_portal_id` em licença, pedido e assinatura, com FK composta (o curso existe naquele portal) e `CHECK` (as duas colunas só divergem quando o comprador é da plataforma) — a trava do §15.14 continua declarativa, e o teste adversarial confirma: portal de professor não vende curso de outro nem pela aplicação, nem pelo banco · a página do curso e a da aula viraram componentes parametrizados por **de quem é o curso**; a vitrine mora em `/parceiros/<mascara>/materia|aula/<slug>` na plataforma, com crédito ao parceiro e compra pelo NOSSO preço e checkout · `comissao_professor_pp` gravada no pedido (§5.6.1), visível no financeiro do portal · o passe completo **não** abre curso de parceiro (`espectadorParaCurso`) · tirar da vitrine não invalida quem comprou · painel, retomar e caderno de erros linkam pelo caminho certo. 6 testes de integração + e2e no navegador | A mais cara, e a única que mexe numa trava de segurança já testada |

##### Travas de conformidade que o autosserviço não pode ignorar

- **CNPJ obrigatório** no cadastro do professor: sem ele não há subconta (regra do Banco Central, §8.2). A validação entra no formulário, não no suporte.
- **Teto do período de avaliação regulatória**: 10 subcontas e R$ 2.000 por subconta até a homologação. O autosserviço precisa **parar de aceitar novos portais** ao chegar no limite, com aviso claro em vez de erro — e a fila de espera vale mais que um cadastro que quebra.
- **LGPD na tela de alunos**: o professor é o controlador daqueles dados; o acesso do admin é para suporte e fica registrado em auditoria (§12.1).
- **Testes de isolamento**: a exceção da vitrine compartilhada entra na mesma suíte que hoje recusa 18 tentativas de cruzamento entre portais. Exceção sem teste é a porta pela qual o §15.14 acontece.

##### ~~Pendência que bloqueava a etapa 3~~ — resolvida em 03/09/2026

O preço foi calculado (§5.10.3) e definido: **R$ 149/mês + 10%**, cotas de 100 GB + 300 GB/mês, excedente R$ 0,40/GB. Aplicado em `db/023_plano_lancamento.sql`. A etapa 3 está desbloqueada.

#### 5.10.3 Levantamento de custo e preço (03/09/2026)

**Custos unitários apurados** (dólar a R$ 5,15 em 02/09/2026):

| Item | Custo |
|---|---|
| Armazenamento de vídeo (Bunny Stream, US$ 0,01/GB/mês) | R$ 0,052/GB/mês — transcodificação incluída |
| Entrega de vídeo (Bunny, a partir de US$ 0,005/GB) | R$ 0,026/GB · **pior caso** (POP América do Sul) ~R$ 0,234/GB |
| Conta Escrow por subconta | R$ 9,90/mês |
| Conta Escrow da conta-pai (custo único da plataforma) | R$ 99,90/mês |
| Asaas: Pix R$ 1,99 · cartão à vista R$ 0,49 + 2,99% | por transação |
| Rateio de infra (VPS/banco/backup) + provisão de suporte | ~R$ 35/portal/mês |

**Custo mensal por portal** (premissas: 1 h de aula armazenada ≈ 2 GB em HLS; 1 h assistida ≈ 0,7 GB):

| Cenário | Acervo · alunos | Custo (banda barata) | Custo (pior caso) |
|---|---|---|---|
| Pequeno | 20 h · 30 alunos | R$ 64 | R$ 77 |
| Médio | 50 h · 150 alunos | R$ 76 | R$ 163 |
| Grande | 100 h · 500 alunos | R$ 107 | R$ 398 |

O custo é baixo e quase todo fixo (escrow + infra + suporte ≈ R$ 45); o vídeo só pesa quando há aluno assistindo em volume — e aí o percentual acompanha. O único custo que não se dilui é a Conta Escrow da conta-pai: com um portal, pesa inteira; com dez, R$ 9,99 cada.

**Mercado:** Hotmart 9,9% + R$ 1/venda sem mensalidade (player +R$ 2,49/venda) · Kiwify 8,99% + R$ 2,49 · plataformas white-label R$ 150–300/mês sem percentual. Nosso produto é as duas coisas — checkout **e** site próprio — e o preço escolhido deixa o atrito total do professor (10% nosso + ~3% de gateway) na altura da Hotmart, com a mensalidade abaixo das plataformas.

**Margem no preço escolhido (R$ 149 + 10%):** portal médio rende R$ 468/mês contra custo de R$ 76–163; o portal pequeno — o cliente típico do lançamento — rende R$ 228 contra R$ 64–77, e sozinho cobre a escrow da conta-pai. A conta fecha até no pior caso de banda em todos os cenários.

**Domínio próprio — exemplos de preço (04/09/2026; decidido: opção B, decisão 18 do §16, aplicada por `db/030`).** O custo direto é quase zero: certificado gratuito (Let's Encrypt, emitido pelo Caddy sob demanda), nenhum tráfego a mais — o que pesa é o operacional (suporte a DNS mal configurado, um certificado a mais para vigiar) e o posicionamento. Referências: Hotmart e Kiwify incluem domínio próprio nas áreas de membros sem cobrar; construtores de site (Wix, Hostinger) cobram R$ 20–40/mês pelo degrau que libera domínio próprio; SaaS white-label costuma tratar como recurso do plano superior.

| Exemplo | Preço | Leitura |
|---|---|---|
| A — "custo coberto" | **R$ 19,90/mês** no plano B | Quase incluído; quem quer, paga sem pensar. Sinaliza que o portal é dele. |
| B — "recurso pago" (**sugerido**) | **R$ 29,90/mês** no plano B · **incluído** no plano C | ~20% da licença: valor perceptível sem virar objeção; dá ao plano C um motivo a mais de existir. |
| C — "posicionamento" | **R$ 49/mês** no plano B · incluído no C | Empurra quem quer marca própria para o plano C (R$ 249). Só faz sentido quando o C estiver em oferta. |

Qualquer um deles entra sem código: campo "Domínio próprio (R$/mês)" do plano, no admin. Enquanto estiver vazio, o painel do professor diz que o plano não inclui.

#### Estado da implementação (setembro/2026)

**Pronto e verificado:**

- `db/018_portal.sql` — tabelas do portal, escopo de tenant no catálogo e no comercial, isolamento por chaves compostas. 18 tentativas de cruzar portais foram recusadas pelo banco.
- `proxy.ts` — resolução de tenant pelo cabeçalho `Host` (no Next 16 a antiga *middleware* chama-se **proxy**). O cabeçalho recebido da rua é apagado antes de qualquer coisa: sem isso, mandar `x-portal-mascara` numa requisição comum leria o acervo alheio.
- `lib/portal.ts` (parte pura, 17 testes) e `lib/portal-consultas.ts` — leitura do endereço e tradução em portal.
- Escopo aplicado em catálogo, sessão, licença, preço, checkout, vade-mécum, painel e administração. O `portalId` é argumento obrigatório nas consultas: esquecer o escopo vira erro de compilação, não vazamento.
- Verificação: 106 testes de unidade, três suítes de ponta a ponta (autenticação, comercial, administração) e teste de isolamento por HTTP com dois hosts — o mesmo `slug` devolve conteúdos diferentes conforme o endereço, e a aula da plataforma responde 404 no host do portal.

**Atualização de 03/09/2026 — as cinco etapas do §5.10.2 estão entregues** (autosserviço, subconta/split/escrow, divulgação e funil, alunos e financeiro, vitrine compartilhada), todas com testes de integração e de ponta a ponta no navegador. O provedor de pagamento continua o `simulado`: o adaptador Asaas real implementa a mesma interface (`Provedor`) quando houver credencial.

**Entregue também em 03/09/2026, depois das cinco etapas:**

- **A página única do portal** (§5.10, "Anatomia"): `app/PaginaPortal.tsx` — abertura com chamada, propósito e foto; acervo por área e assunto com cadeado; oferta com os preços do portal; quem ensina e contato; rodapé legal com o responsável identificado (nome e CNPJ) e a plataforma como operadora. No endereço do professor a marca é a dele, blog e mural de vagas saem do menu, e a cor principal escolhida entra no tema (só cor validada chega ao CSS).
- **O painel do professor** (`/professor`): visão geral (portal, conta de recebimento, acervo, alunos, contrato, próximos passos), minha página, cursos e aulas (área → curso → assunto → aula → questão, publicar/despublicar, vitrine da plataforma), alunos (com o aviso de LGPD) e financeiro (sua parte, comissão de vitrine, consumo × cota, faturas com botão de pagar, extrato). Reaproveita os formulários e a biblioteca da retaguarda; a diferença que é o coração da segurança: **o portal vem da sessão, nunca do formulário**. E2E no navegador com 17 checagens.
- Correção de raiz encontrada pelo e2e: `editarPortal` apagava nome, CNPJ e e-mail do responsável (e o domínio próprio) ao salvar qualquer outra coisa — afetava o admin também.

- **Envio de vídeo e foto pelo painel** (`/api/upload`, `app/professor/Enviar.tsx`): o arquivo flui do navegador para o volume de mídia em stream, com barra de progresso, teto por tipo (2 GB vídeo, 5 MB imagem), extensões restritas (sem SVG), nome gerado por nós com o portal no prefixo, e a aula vinculada ao vídeo (`LOCAL`) no ato — o anterior sai do disco. Fica **fora do proxy** de propósito: no Next 16 o proxy bufferiza o corpo em memória (10 MB). Achado de infraestrutura pelo caminho: o volume `/midia` nascia do root e o processo roda como `nextjs` — o entrypoint agora prepara o volume como root e larga o privilégio (`su-exec`). Foto pública em `/api/imagem/<id>`.

- **Apuração e repasse da comissão de vitrine (§5.6.1)** — `db/027_apuracao.sql`, `lib/apuracao.ts`: fechamento mensal por portal com cada venda entrando uma vez (no mês do pagamento) e cada reembolso uma vez (no mês em que ocorre, como dedução) — o `UNIQUE (pedido_id, tipo)` faz o banco garantir; abaixo de **R$ 100 acumula** (a apuração seguinte incorpora o saldo); acima, **5 dias de conferência** com contestação pelo professor, aprovação pelo admin (respondendo a contestação), **nota fiscal** informada pelo professor e **repasse só com nota**, registrado com comprovante. Prazo vencido aprova sozinho (`scripts/fechar-mes.mjs`). Telas: seção "Apurações" no financeiro do portal (admin) e "Repasse da comissão de vitrine" no painel do professor. 7 testes de integração cobrindo o ciclo inteiro. **Avanço de 04/09/2026:** (a) **repasse pelo gateway** — `Provedor.transferir` (Asaas: `POST /transfers` para a `walletId` da subconta, sem custo entre contas Asaas) e `pagarRepasse`, que exige apuração aprovada, nota e subconta aprovada, e grava o id da transferência como comprovante; o registro manual continua como alternativa; (b) **prazo do dia 15** do mês seguinte (`prazoDePagamento`), visível ao professor e ao admin (vencido fica em vermelho); (c) **extrato venda a venda** aberto nas duas telas (`ItensApuracao`). Continuam fora: dedução de taxa de gateway e impostos (ajuste de contrato) e aviso por e-mail (o sistema ainda não envia e-mail). A comissão incide sobre o **bruto** da venda (decisão da etapa 5); descontar taxa de gateway e impostos, como o §5.6.1 sugere, é ajuste de contrato, não de código.

- **Adaptador do Asaas** (`lib/pagamento-asaas.ts`): cobrança Pix (cliente → cobrança com `split[].percentualValue` = 100 − nosso percentual → QR code) e cartão (página de pagamento do gateway), estorno (`/payments/{id}/refund`), subconta (`/accounts`) e Conta Escrow (`/accounts/{id}/escrow`, taxa por nossa conta), webhook autenticado pelo `asaas-access-token`, eventos `PAYMENT_CONFIRMED/RECEIVED` → confirmado, `OVERDUE/DELETED/…` → falhou, `ACCOUNT_STATUS_*` → subconta aprovada/recusada pelo status geral. Liga com `PROVEDOR_PAGAMENTO=asaas` + `ASAAS_API_KEY`, `ASAAS_AMBIENTE`, `ASAAS_WEBHOOK_TOKEN`. Escrito contra a documentação pública e testado contra uma API simulada (11 testes de mapeamento); o formato do objeto `account` nas notificações de status está marcado **"confirmar no sandbox"**. O estorno passou a ir ao gateway antes do registro no banco; o código Pix e o link de cartão passaram a ser guardados na cobrança (as telas os usam, em vez de reconstruir). Duas exigências do gateway que o produto **ainda não coleta** viraram pendências abaixo.

- **CPF do aluno na compra (§12.1)** ✅ — pedido uma vez, no ato da compra, só a quem ainda não tem: campo nos dois formulários de compra (`/planos` e o curso do parceiro), validado pelos dígitos verificadores (`validarCpf`) e guardado em `usuario.cpf`; o pedido passa ao gateway como `documentoPagador`. Com o provedor simulado a compra segue sem CPF; com o Asaas, `garantirCpf` recusa antes de criar a cobrança.
- **KYC do professor no cadastro (§8.2)** ✅ — o formulário de contratação coleta celular, renda mensal, CEP, logradouro, número, complemento e bairro (o que `/accounts` exige; cidade e UF o gateway tira do CEP). Validados em `assinarPortal`, normalizados e guardados em `portal.responsavel_telefone / responsavel_renda_centavos / responsavel_endereco` (db/028); `abrirSubconta` repassa tudo ao provedor.

- **Domínio próprio (Fase 2)** ✅ — o portal responde também em `cursos.dominiodele.com.br`. Mecânica: o `proxy.ts` marca todo Host que não é nosso nem subdomínio nosso (`x-portal-dominio`, apagado se vier da rua); `portalAtual` resolve por `portal.dominio_proprio`, **só depois de verificado**. O professor cadastra o domínio no painel (Minha página), aponta o CNAME para `<mascara>.<nosso domínio>` e pede a verificação (`verificarDominio`, consulta CNAME real; DNS ainda não propagado é "ainda não", não erro). O preço mora no plano (`portal_plano.centavos_dominio_proprio`; **NULL = o plano não oferece**, e o painel diz isso) e entra na fatura como linha própria só depois de verificado. Índice único por domínio; trocar zera a verificação; o admin, ao definir pelo cadastro do portal, já vale como verificado (db/029). **HTTPS (04/09/2026):** o Caddy entrou no perfil `vps` na frente do nginx (`caddy/Caddyfile`), com certificado **sob demanda** para qualquer host — subdomínio de portal ou domínio próprio — emitido na primeira visita e renovado sozinho. Antes de emitir, ele pergunta a `GET /api/dominio-permitido?domain=`, que só diz sim para a plataforma, para subdomínio de portal no ar e para domínio próprio verificado (cobertura no e2e do funil). Na VPS: `docker compose --profile vps up -d`, com `ACME_EMAIL` no `.env`; o nginx deixa de ouvir a porta 80 da rua e nada mais muda. O certbot deixa de ser necessário. **Preço decidido (04/09/2026):** R$ 29,90/mês no plano de lançamento (`db/030`); incluído no plano C quando ele existir.

**Entregue em 08/09/2026 — autonomia do professor sobre vídeo e ferramentas:**

- **"Vídeos das aulas" (`/professor/videos`)** — o professor via o envio do vídeo só *dentro* de cada aula, e quem ainda não tinha assunto nem aula não achava onde anexar ("não encontrei o local onde anexo o vídeo da aula"). A tela nova põe todas as aulas do portal numa lista, por curso, dizendo quais têm gravação e quais não, com o envio na linha de cada uma, a conferência do arquivo atual no player (assinado, `preload="none"` para não gastar banda do portal à toa), o tamanho ocupado e o **botão de tirar o vídeo** — o par que faltava (trocar já existia: enviar outro substitui e apaga o anterior). Arquivo que sumiu do volume aparece como problema, não como "enviado". `lib/video-aula.ts`, `acaoRemoverVideo`, item na barra lateral, atalhos nas telas de curso e de aula, e passo próprio na checklist da visão geral (`aulasComVideo`).
- **Ferramentas passam a ser escolha do portal** — o submenu **Ferramentas** saiu do topo do site principal e virou item de "Minha página": o professor marca quais ferramentas de estudo (vade-mécum, calculadora penal, caderno de erros) quer no topo do portal dele; sem marcar nenhuma, o submenu não aparece. O mural de vagas é conteúdo da casa e não se vincula a portal nenhum (`soPlataforma`). Catálogo e validação em `lib/ferramentas.ts` (7 testes): chave inventada no formulário não vira menu, e a ordem é a do catálogo. No site principal a porta das ferramentas passou a ser o rodapé — a calculadora entrou lá para não virar página órfã, e o e2e da calculadora confere isso.
- **Base de alunos de demonstração por portal** — `scripts/demo/alunos-do-professor.mjs` (`PORTAL=<mascara>`) cria quatro alunos pelos fluxos de verdade no endereço do portal: conta em `/cadastrar`, compra no checkout, pagamento pelo webhook assinado, aulas concluídas pela rota do player, exercício respondido com erro e acerto, e um reembolso pedido no botão de `/conta` (CDC, art. 49). Sai com venda paga, passe completo, pedido em aberto e pedido reembolsado — que é o que faz "Alunos" e "Financeiro" mostrarem o que sabem fazer.

**Também em 08/09/2026 — a tela do aluno que JÁ é aluno:**

O relato veio de um teste com conta de aluno dentro do portal: "já sou aluno e estou no ambiente de aula, não está correto a apresentação do valor à direita; não consigo ver as perguntas respondidas nem o meu progresso". Três defeitos reais atrás disso, e um deles silencioso:

- **A página do curso mostrava o preço para quem já comprou.** Ela só sabia decidir acesso *aula a aula* (`podeAcessar`); faltava o degrau do curso. Entrou `acessoAoCurso` em `lib/licenca.ts` — mesma escada de decisão, parando um degrau antes, com teste que trava a coerência entre os dois ("quem acessa o curso acessa a aula paga dele"). Com acesso, a caixa da direita deixa de ser vitrine e vira **progresso**: anel de percentual, aulas concluídas, questões respondidas e aproveitamento, botão de *continuar de onde parei* com o nome da próxima aula, e por qual licença o acesso vem, com a data em que vence. Sem acesso, a oferta continua — mas o aluno logado não recebe mais "Testar 7 dias grátis" apontando para `/cadastrar`.
- **O exercício voltava em branco.** `Exercicio` nascia sem estado: quem já tinha respondido não via as próprias marcações nem os comentários, e respondia de novo achando que a primeira vez não valera. Agora as respostas vêm do banco (`respostasDaAula`, a última de cada questão — o mesmo critério do caderno de erros) e a tela reabre no estado em que ficou, com etiqueta de acerto/erro e a data. **Refazer continua permitido, e é o que tira a questão do caderno** (§5.2), mas passou a ser um clique deliberado. Achado de raiz no caminho: `exercicioDaAula` devolvia os ids sem `::int` — BIGINT chega como texto, a comparação estrita com o id marcado dava `false` sempre, e o exercício respondido voltava como **"0 acertos"** com o gabarito certo do lado (§15.14, a mesma classe de defeito do `db/025`).
- **O progresso não aparecia em lugar nenhum do conteúdo.** `lib/progresso-curso.ts` (5 testes, 2 contra banco) responde o recorte fino — que aulas ESTE aluno concluiu neste curso, onde parou, como foi no exercício. A ementa passou a marcar *Concluída* / *Continuar* com o percentual assistido, e a barra lateral da aula só dá o visto verde no que foi realmente assistido (antes marcava tudo o que estava destrancado) e mostra o andamento do curso.
- Dois vazamentos de white-label corrigidos de passagem, na mesma tela: o painel do aluno dentro do portal do professor trazia **a marca da plataforma** no topo e o **tema roxo da casa** em vez da cor do portal; e tratava aluno com curso 100% concluído como visitante ("Sua jornada começa agora — comece sem pagar nada"), agora "Você concluiu todas as aulas liberadas", com o caderno de erros como próximo passo.

**09/09/2026 — exercício passo a passo, em aba própria** (plano e estado em `docs/plano-exercicio-sequencial.md`): as N questões vinham empilhadas abaixo das abas, e responder a 1ª obrigava a rolar pelo comentário inteiro até achar a 2ª. O exercício virou a aba **Exercício**, entre Resumo e Materiais — a ordem das abas passou a ser a ordem de estudo, e o rótulo carrega o estado (`Exercício · 5/6`, `✓ 5/6`). Dentro dela, **uma questão por vez**: marcadores numerados clicáveis (verde/vermelho/pendente), "Próxima questão" só depois de responder, e um **resultado** com nota, a lista das questões (clique volta a qualquer uma), "Refazer as que errei" e "Próxima aula". Abre na primeira pendente, ou no resultado se não há pendente. `AbasAula` passou a abrir a aba pela âncora (`#exercicio`), então o chamado no fim do resumo, os roteiros de demonstração e qualquer link antigo continuam chegando lá. A aula bloqueada mantém a aba, com a oferta no lugar das questões.

Fora do escopo, e não é defeito: **avaliação final e certificado são do portal de empresa** (§5.11). No portal do professor, a avaliação do aluno são os exercícios comentados de cada aula.

**Ainda não feito:**

- Transcodificação/CDN (Bunny) para o vídeo do portal — hoje o arquivo enviado é servido como está, pelo nosso volume; o adaptador CDN é o `case 'BUNNY'` de `lib/video.ts`.

#### Fora do escopo deste modelo (por ora)

E-mail no domínio do professor · editor livre de layout · app · múltiplos professores dentro de um mesmo portal · cupons e campanhas próprias do portal · certificado emitido pelo portal.

#### Riscos específicos

Consolidados nos itens 14 a 17 do §15.
### 5.11 Portal da Empresa — universidade corporativa em autosserviço (planejamento de 04/09/2026)

> **Acréscimo de 10/09/2026 — compra de cursos do catálogo** (`docs/plano-perfis-e-acessos.md`, etapa 6; db/047): além das trilhas próprias, a empresa compra **vagas** de cursos do catálogo da plataforma em `/empresa/catalogo`. Cada curso declara, no cadastro, até quantas vagas se compram na hora (`vagas_sem_orcamento`, padrão 10); acima disso é orçamento, respondido em `/admin/empresas`. O pagamento vira um lote; o RH distribui as vagas em "Liberar trilhas", e o colaborador estuda o curso da plataforma dentro do portal da empresa. "Sem página própria" significa apenas sem domínio próprio — o subdomínio existe sempre.

O §12-B.1 previu as licenças patrocinadas como "Fase 3, por proposta". A vitrine de `/empresas` (db/032) já capta o interesse — e a decisão desta rodada é que a empresa **não espere proposta**: assim como o professor, ela se cadastra, paga e opera sozinha. O que ela opera é diferente do que o professor opera, e é isso que este plano descreve.

**A promessa ao cliente:** "a universidade corporativa da sua empresa no ar em um dia: você sobe os vídeos, cadastra a equipe, libera as trilhas e acompanha quem concluiu — no seu endereço, com a sua marca."

#### O que se reaproveita e o que muda

O portal do professor já é um *tenant* completo: endereço próprio, acervo próprio, base de usuários própria, upload de vídeo, exercícios, progresso, faturamento por competência e isolamento garantido pelo banco (§5.10). A empresa é **o mesmo tenant com outro regime de acesso**. A tabela abaixo é a espinha do plano — cada linha "muda" vira trabalho; cada linha "igual" é o que se herda sem código.

| Tema | Portal do professor | Portal da empresa |
|---|---|---|
| Endereço | `<mascara>.aprimoreosaber.com.br`, domínio próprio como upgrade | **Igual, sem código novo.** Máscara escolhida na contratação (etapa 1); domínio próprio cadastrado em Minha página (etapa 2) com o mesmo CNAME + verificação + certificado sob demanda do Caddy. Incluído no Pro; no Starter, ver §16.19 |
| Quem opera | 1 professor, conta na plataforma (portal 0), painel em `/professor` | **1 responsável + N gestores**, contas na plataforma, painel em `/empresa` |
| Quem consome | Aluno que se cadastra sozinho e compra | **Colaborador cadastrado ou convidado pela empresa**; não compra nada |
| Página pública | Vitrine com acervo, amostra gratuita e preços | **Fechada**: marca + login. Sem amostra, sem preço, sem trial, sem cadastro aberto (salvo domínio de e-mail autorizado) |
| Acesso ao conteúdo | Licença por compra, trial, cortesia | **Licença de origem `B2B`**, concedida pela empresa por pessoa ou por setor, com prazo de conclusão |
| Teto | Cota de GB | Cota de GB **+ teto de contas ativas** do plano |
| Dinheiro | Mensalidade + % das vendas, subconta, split, escrow, apuração | **Só mensalidade** (+ excedente de GB e domínio). Sem subconta, sem split, sem apuração |
| Conteúdo | Área → curso → assunto → aula → questão | **Igual, com outros nomes na tela**: trilha → módulo → aula → questão. Ganha **avaliação final** com nota mínima |
| Conclusão | Progresso por aula | Progresso + **aprovação na avaliação + certificado com a chancela da empresa** |
| Vitrine compartilhada | Opcional por curso | **Nunca** (CHECK no banco) |
| Relatórios | Alunos, licenças, extrato de vendas | **Progresso por pessoa e por trilha, resultados, exportação CSV** |

#### Decisões tomadas neste plano

| Tema | Decisão | Por quê |
|---|---|---|
| **Modelagem** | `portal.tipo` (`PROFESSOR` \| `EMPRESA`) na mesma tabela, e não uma entidade `contrato_b2b` à parte | Tudo o que separa tenants (chaves compostas, proxy, sessão por portal, cota, fatura) já está pronto para `portal`. Uma segunda entidade duplicaria o isolamento — e o §15.14 diz que isolamento duplicado é isolamento que uma hora diverge |
| **Gestores** | Contas na **plataforma** (portal 0), papel novo `gestor`, painel em `/empresa` no site principal; vínculo N:N em `portal_gestor` | Espelha o professor: reaproveita `assinarPortal`, a tela de pagamento, o `dono()` e o layout do painel. O endereço da empresa fica só para o colaborador |
| **Colaborador** | Papel `aluno` dentro do portal da empresa (sem papel novo) | Toda consulta de progresso, sessão e licença já filtra `papel = 'aluno'`. Um papel novo espalharia `OR` por 30 consultas para não ganhar nada |
| **Liberação de acesso** | Licença com origem nova **`B2B`**, escopo `MATERIA` (uma trilha) ou `CATALOGO` (todas), `fim_em` = fim do contrato ou prazo da atribuição | O `podeAcessar` não muda: origem ≠ TRIAL já libera a matéria inteira (§6.3). Suspender o colaborador é cancelar a licença — mesmo mecanismo do admin |
| **Portal nasce pagando** | Igual ao professor: transação única, RASCUNHO até o webhook confirmar a 1ª mensalidade | Sem isso, "portal grátis por 14 dias" vira fila de suporte de portal abandonado. O teste gratuito da empresa fica como decisão pendente (§16.20) |
| **Planos** | Starter e Pro em autosserviço, lidos de `portal_plano` (tipo EMPRESA); Enterprise continua por proposta via `interesse_empresa` | O `lib/empresas.ts` já avisa: preço de referência de produto sem checkout não é preço vigente. Quando vira produto, entra na tabela de todo mundo |
| **Convite sem e-mail** | O convite é um **link com token** que o gestor copia e manda por onde quiser; e-mail transacional entra como tarefa transversal e passa a enviar o mesmo link | O sistema ainda não envia e-mail (§5.10, "Ainda não feito"). Depender disso travaria a etapa 4 inteira |
| **Avaliação** | `questao` ganha `avaliacao_id` (alternativo a `exercicio_id`, um ou outro); tabela `avaliacao` por trilha com nota mínima e tentativas; `tentativa_avaliacao` guarda nota e respostas | Reaproveita o formulário de questão do painel e a tabela `alternativa` com comentário obrigatório; não nasce um segundo editor de questões |
| **Certificado** | Página `/certificado/<codigo>` verificável, imprimível em PDF pelo navegador; chancela = nome, logo e responsável do portal; carga horária = soma da duração dos vídeos | Certificado de curso livre (§12.6), sem MEC. Verificável por código para o RH auditar; sem biblioteca de PDF no servidor |

#### Modelo de dados (migração `db/033_portal_empresa.sql`)

```
portal
  + tipo                 ENUM portal_tipo ('PROFESSOR','EMPRESA') NOT NULL DEFAULT 'PROFESSOR'
  + dominios_email       TEXT[]     -- autocadastro só com e-mail destes domínios (vazio = só por convite)
  CHECK: tipo = 'EMPRESA' → gateway_wallet_id IS NULL e subconta_situacao = 'PENDENTE'

portal_plano
  + tipo                 portal_tipo NOT NULL DEFAULT 'PROFESSOR'
  + limite_contas        INT        -- NULL = sem teto (Enterprise)
  CHECK: tipo = 'EMPRESA' → percentual_base = 0 e comissao_vitrine_pp = 0

portal_contrato
  + limite_contas        INT        -- copiado do plano no aceite, como o preço

portal_gestor (portal_id, usuario_id, papel_no_portal 'RESPONSAVEL'|'GESTOR', criado_em)
  usuario.papel ganha 'gestor'; usuario do gestor vive no portal 0

materia
  CHECK: na_vitrine_plataforma = false quando o portal é EMPRESA (função SQL portal_tipo(portal_id))

licenca.origem            + 'B2B'
usuario
  + setor_id             BIGINT REFERENCES setor
  + matricula            TEXT       -- identificador interno da empresa, opcional
setor (id, portal_id, nome, ordem)  UNIQUE (portal_id, nome)

convite (id, portal_id, email, nome, setor_id, token_hash, trilhas BIGINT[], prazo_dias,
         criado_por, criado_em, expira_em, aceito_em, usuario_id)
  -- o link carrega o token; o banco guarda só o hash, como a sessão (§10)

atribuicao (id, portal_id, materia_id, alvo_usuario_id | alvo_setor_id, obrigatoria BOOL,
            prazo_em DATE, criada_por, criada_em)
  -- é a INTENÇÃO do RH; a licença B2B é a materialização por pessoa
  -- (setor novo recebe as atribuições do setor no ato do cadastro)

avaliacao (id, portal_id, materia_id UNIQUE, titulo, nota_minima INT 0..100,
           max_tentativas INT, embaralhar BOOL, status status_publicacao)
questao   + avaliacao_id (exercicio_id passa a ser NULL-able; CHECK exatamente um dos dois)
tentativa_avaliacao (id, usuario_id, avaliacao_id, iniciada_em, entregue_em, nota INT,
                     aprovada BOOL, respostas JSONB)
conclusao (id, usuario_id, materia_id, concluida_em, nota, codigo_certificado TEXT UNIQUE,
           carga_horaria_min INT)   UNIQUE (usuario_id, materia_id)
```

Todas as filhas novas apontam para `(id, portal_id)` por chave composta, como em `db/018`. A suíte adversarial de isolamento ganha os casos novos: convite do portal 7 não cria conta no 3; atribuição não pendura trilha alheia; gestor do 7 não lê progresso do 3.

#### Sequência de construção

| # | Etapa | Entrega | Depende de |
|---|---|---|---|
| **0** | **Fundação do tenant-empresa** | `db/033` acima · `portal.tipo` lido em `portalAtual` · páginas públicas do portal (`PaginaPortal`, catálogo, aula, `/planos`, `/checkout`, `/cadastrar`) passam a **exigir sessão** e a não mostrar preço nem amostra quando o portal é EMPRESA · `semearPrecosDaPlataforma` não roda para empresa · plano Starter e Pro semeados em `portal_plano` (preços do `lib/empresas.ts` viram linhas, e a vitrine passa a ler do banco) · testes de isolamento ampliados | — |
| **1** | **Contratação em autosserviço** | `/empresas/contratar`: responsável, CNPJ, e-mail, senha, máscara, nome de exibição, plano (Starter/Pro), aceite do contrato · `assinarPortal` generalizado por `tipo` (sem KYC de renda/endereço — não há subconta) · webhook `PF-` ativa igual · `/empresas/pagamento/[ref]` · Enterprise segue pelo formulário de interesse · admin: `/admin/portais` ganha o filtro por tipo e a coluna de contas ativas × teto | 0 |
| **2** | **Painel da empresa `/empresa`** | Layout com barra lateral (Visão geral · Minha página · Trilhas · Colaboradores · Acompanhamento · Financeiro · Gestores) · visão geral com checklist honesta (portal no ar → marca preenchida → 1ª trilha publicada com aula → 1º colaborador ativo → 1ª atribuição) · Minha página: logo, cor, mensagem de boas-vindas, domínios de e-mail autorizados, domínio próprio · Gestores: convidar/remover (o responsável não se remove) | 1 |
| **3** | **Trilhas, vídeos e avaliação** | Mesmos formulários de área/curso/assunto/aula/questão com rótulos de empresa (trilha/módulo/aula) · upload de vídeo pelo mesmo `/api/upload` · **avaliação final** por trilha (questões, nota mínima, tentativas) · **pré-visualizar como colaborador** (o gestor abre a trilha no endereço do portal com uma sessão de visualização, sem gerar progresso) · sem opção de vitrine | 2 |
| **4** | **Colaboradores e liberação de acesso** | Cadastro individual (nome, e-mail, setor, matrícula) · **importação por CSV** com prévia de erros linha a linha · setores · **convite por link** (copiar; e-mail quando o envio existir) · autocadastro por domínio autorizado, caindo nas atribuições do setor "padrão" · **atribuição** de trilha por pessoa ou por setor, obrigatória ou não, com prazo → licença B2B · desativar/reativar (libera a vaga no teto) · **teto de contas** do contrato aplicado no cadastro e no convite, com aviso e link para o upgrade · aviso LGPD: a empresa é a controladora | 2 |
| **5** | **Ambiente do colaborador** | Home do portal EMPRESA = marca + login · `/painel` corporativo: **minhas trilhas** (obrigatórias primeiro, prazo e pendência em destaque), retomar de onde parou, avaliação quando as aulas terminam, certificado ao aprovar · aula com **sequência obrigatória** opcional por trilha (a próxima abre quando a anterior conclui) · `/certificado/<codigo>` público e imprimível · sem Planos, sem Minha conta financeira, sem caderno de erros da plataforma (fica o da trilha) | 3, 4 |
| **6** | **Acompanhamento para o RH** | Por trilha: atribuídos, iniciados, concluídos, aprovados, atrasados · por pessoa: trilhas, %, nota, data · filtros por setor e situação · **exportação CSV** · registro de quem liberou o quê (`log_auditoria`, já existente) | 5 |
| **7** | **Financeiro da empresa** | Faturas por competência (mensalidade + GB excedente + domínio), pagar por Pix/cartão, régua de atraso e suspensão **reaproveitadas** (`lib/portal-financeiro.ts`) · em portal suspenso o colaborador com licença continua, o gestor não cadastra · troca de plano (Starter → Pro) por novo contrato com vigência | 1 |
| **T** | **Transversal: e-mail** | Adaptador de e-mail transacional (interface `Remetente`, provedor simulado em desenvolvimento, SES/Resend em produção) · usos: convite, lembrete de prazo (D-7 e D-1), certificado emitido · o mesmo adaptador serve à régua de renovação do aluno (§6.4) e ao esqueci-minha-senha, hoje inexistentes | pode andar em paralelo a 3–4 |

Estimativa grosseira, no ritmo do §14 (5 a 15 h/semana): etapas 0–2 em 3 a 4 semanas; 3–4 em 4 a 5; 5–6 em 3 a 4; 7 e T em 2. **Doze a quinze semanas**, com a etapa 5 sendo a que mais se vê e a 4 a que mais se testa.

#### Verificação exigida por etapa

- **Unidade**: teto de contas, aceitação de convite (expirado, já aceito, portal errado), cálculo de nota e aprovação, sequência obrigatória, materialização de atribuição por setor.
- **Integração** (com `DATABASE_URL`): contratação → pagamento → portal ATIVO sem subconta; convite → conta → licença B2B; desativar libera vaga; suíte de isolamento com os casos novos.
- **Ponta a ponta** (`testes-e2e/portal-empresa.mjs`): RH contrata, sobe um vídeo, cria a avaliação, convida alguém; o colaborador entra pelo link no subdomínio, assiste, é aprovado, imprime o certificado; o RH vê a conclusão no relatório. E o visitante anônimo no endereço da empresa **não vê aula nenhuma**.

#### Estado da implantação (04/09/2026)

**Etapa 0 — Fundação do tenant-empresa ✅**

- `db/033_empresa_enums.sql` e `db/034_portal_empresa.sql`. Os dois arquivos existem separados por uma regra do PostgreSQL, não por gosto: `ALTER TYPE ... ADD VALUE` roda em transação, mas o valor novo não pode ser usado antes do COMMIT — e o migrador envolve cada arquivo numa transação.
- `portal.tipo` (`PROFESSOR` | `EMPRESA`), lido em `portalAtual` e propagado a `Portal`. **A plataforma é sempre PROFESSOR, por CHECK**: não porque seja de um professor, mas porque a coluna decide "aberto ou fechado", e um UPDATE errado não pode fechar o site inteiro atrás de um login.
- **Curso de empresa nunca vai à vitrine, e quem garante é o banco.** `materia.portal_tipo` com chave estrangeira composta para `portal (id, tipo)` mais CHECK; um gatilho preenche a coluna, para que a aplicação não precise lembrar. Se o gatilho sumisse, a chave estrangeira continuaria recusando — ela é a trava, ele é a comodidade.
- Toda tabela nova carrega `portal_id` e aponta para o par `(id, portal_id)`, como no `db/018`: `portal_gestor`, `setor`, `convite`, `atribuicao`, `avaliacao`, `tentativa_avaliacao`, `conclusao`.
- **A guarda de acesso** (`app/guarda-empresa.ts`): num portal de empresa, visitante sem sessão não vê nada. Chamada no topo de catálogo, curso, aula, biblioteca, blog e vagas; `recusarNoPortalDeEmpresa` fecha planos, checkout e cadastro para todo mundo. `Pagina` repete a guarda como segunda linha de defesa, para o dia em que uma rota nova esquecer de chamá-la.
- Planos `Empresa Starter` (R$ 380, 50 contas) e `Empresa Pro` (R$ 890, 250 contas, domínio próprio incluído) semeados em `portal_plano`; a vitrine passou a ler preço, teto e preço de domínio do banco. `planoDeLancamento` ganhou `AND tipo = 'PROFESSOR'` — sem o filtro, semear um plano de empresa mais barato mudaria em silêncio o que a página do professor vende.

**Etapa 1 — Contratação em autosserviço ✅**

- `assinarPortal` passou a servir aos dois produtos em vez de ganhar um gêmeo. O que muda é pequeno e está marcado ponto a ponto: a empresa não coleta KYC (não abre subconta, então renda e endereço seriam coleta sem finalidade, §12.1), escolhe entre dois planos, e o dono nasce `gestor` com vínculo `RESPONSAVEL`. O caro — transação única e webhook idempotente — continua sendo um só.
- `abrirSubconta` recusa portal de empresa **na fonte**, e não só em quem chama: o webhook abre subconta de todo portal que ativa, e uma subconta em nome de quem nunca vai vender é KYC pedido à toa e uma vaga a menos no teto regulatório do §8.2. Pelo mesmo motivo, o teto de 10 portais passou a contar só os de professor.
- `/empresas/contratar` e `/empresas/pagamento/[referencia]`. A vitrine `/empresas` ganhou o caminho de compra e manteve o formulário de interesse para o Enterprise.
- **Correção de passagem:** `portal_contrato` não copiava `comissao_vitrine_pp` do plano — ficava no DEFAULT da tabela. Os dois valiam 50 por coincidência, e mudar a comissão no plano não chegava a contrato nenhum. Agora é copiada, junto do teto de contas.

**Etapa 2 — Painel da empresa ✅**

- `/empresa` com barra lateral, visão geral e checklist honesta (cada passo mostra o número que veio do banco, não uma promessa), cartão de ocupação do plano e fatura em aberto.
- `/empresa/site`: marca da empresa, política de quem cria conta sozinho e domínio próprio — as três coisas juntas porque respondem à mesma pergunta do gestor, "como a minha equipe chega aqui?".
- `/empresa/gestores`: o RH tem mais de uma pessoa, e sem esta tela o portal ficaria refém de quem assinou o contrato. O responsável não se remove; conta de outro papel não vira gestora por um formulário.
- **Domínio de e-mail autorizado** (`validarDominiosEmail`): a lista vazia é o padrão e o mais fechado. Correio público (gmail, hotmail, uol e afins) é recusado com o motivo — ali "ter um e-mail do domínio" não prova vínculo com empresa nenhuma.
- O cabeçalho, o rodapé e a tela de login se ajustam ao portal fechado: sem Planos, sem ferramentas, sem "criar conta grátis" — e o rodapé legal diz que a **empresa é a controladora** dos dados e a plataforma a operadora.

**Verificação:** 277 testes de unidade e integração passando (17 novos em `lib/empresa.test.ts`), e `testes-e2e/portal-empresa.mjs` com **34 checagens no navegador**, da vitrine ao painel. As dez últimas são a varredura que mais importa: toda rota pública, anonimamente, no endereço da empresa, exigindo destino correto **e** ausência de preço, oferta de cadastro e conteúdo editorial.

**Correções de passagem em código existente:** a limpeza do e2e do professor não apagava `preco` antes do portal e deixava portal de teste no banco, ocupando o teto regulatório; e dois testes de preço mexiam na tabela de todo portal em vez da do portal 0 — passavam só enquanto a plataforma era o único portal com preço.

**Etapas 3 a 7 ✅ (07/09/2026)** — o portal da empresa passou a existir inteiro.

- **Etapa 3, trilhas e avaliação.** Os formulários de área/curso/assunto/aula da retaguarda ganharam um modo de empresa (`empresa` em `FormMateria`, `FormAssunto`, `FormAula`): mesmos campos, rótulos de trilha/módulo, e sem o que não existe ali — vitrine da plataforma, amostra gratuita e teste de 7 dias saem da tela, porque a empresa não vende nada. A **avaliação final** reaproveita a tabela `questao` e o editor de questões pelo caminho que o §5.11 previu: `salvarQuestaoDe` passou a receber o dono (`{aulaId}` ou `{avaliacaoId}`) em vez de só a aula, e nasceu **um** editor, não dois.
- **A regra do §5.3 virou código.** "Aula sem exercício não é publicável" vivia em texto de tela e num UPDATE de seed; a aplicação publicava aula vazia sem reclamar. Agora `criarAula`, `editarAula` e `mudarStatusAula` conferem, e o botão Publicar devolve o motivo na tela quando recusa. A mesma regra vale para a avaliação: sem questão, não publica.
- **Etapa 4, equipe (`lib/empresa-equipe.ts`).** Setores, cadastro individual com senha provisória, **convite por link** (token nominal, uso único, 7 dias, guardado só como hash), **importação por CSV** com prévia linha a linha, autocadastro por domínio autorizado, e a **atribuição** — a peça que faltava para `origem_licenca = 'B2B'' deixar de ser um valor de enum que ninguém escrevia. Atribuir a um setor alcança quem entrar depois; tirar a atribuição cancela as licenças que **ela** criou, e só elas (`licenca.atribuicao_id`, `db/038`).
- **Etapa 5, o colaborador.** `/painel` reconhece o portal de empresa e mostra "minhas trilhas" — obrigatórias primeiro, prazo em destaque, atrasadas em vermelho — em vez da jornada de quem compra curso. A prova (`/prova/[slug]`) corrige **no servidor**: o gabarito não vai ao navegador antes da entrega. Aprovado, sai a `conclusao` com o código do certificado, e `/certificado/[codigo]` é público e imprimível, com a chancela e o CNPJ da empresa.
- **Etapa 6, acompanhamento.** Por trilha (atribuídos, iniciados, concluídos, atrasados) e por pessoa, com filtros e **exportação CSV** que respeita os filtros. Nenhum número é contador guardado: tudo deriva da licença, do progresso e da conclusão.
- **Etapa 7, financeiro.** Metade do do professor, e é essa a diferença do produto: mensalidade, excedente de GB e o teto de contas. Sem extrato de vendas, sem subconta, sem apuração — a empresa paga, não recebe.

**Verificação:** 347 testes de unidade e integração (24 novos em `lib/empresa-equipe.test.ts`, cobrindo teto de contas, convite, atribuição, nota e certificado), e o roteiro `scripts/demo/portal-empresa.mjs` com **41 passos no navegador** — da contratação ao certificado conferido por quem está de fora, terminando na varredura das rotas públicas no endereço da empresa.

**Etapa 8 ✅ (09/09/2026) — o painel do colaborador e a Biblioteca da empresa.**
Do teste com conta de colaboradora no portal `aurora`: o menu mudava de
tela para tela, três itens levavam para fora do painel, e "Biblioteca"
abria o vade-mécum de leis. Plano em `docs/plano-painel-do-colaborador.md`.

- **O menu virou layout (`app/painel/layout.tsx`).** Em `/painel` a barra
  vinha de `PainelEmpresa`; em `/conta`, do menu da PLATAFORMA — com
  caderno de erros, vade-mécum e planos de venda, nada disso existente na
  empresa. Agora a barra mora no layout e cada tela é rota filha: o Next
  não remonta layout ao navegar, então clicar num submenu troca só o
  miolo da direita. Rotas, e não abas de cliente, para F5, botão voltar,
  favorito e `destino=` do login continuarem valendo.
- **"Minha Jornada" abre "Minhas trilhas" e "Todas as trilhas"**
  (`ItemPai` em `BarraLateral`, `enderecosDe` em `lib/navegacao.ts`). O pai
  não tem endereço: era ele que duplicava `/painel` junto com "Minhas
  trilhas", e é essa duplicação que o submenu desfaz.
- **Catálogo, Biblioteca e Planos entraram para dentro do painel.** A
  decisão antiga de deixá-los fora (`BarraLateral`) valia para a
  plataforma, onde são páginas de venda e de SEO. No portal fechado de uma
  empresa não há venda nem busca orgânica, e quem vê já está logado.
  `/catalogo`, `/conta` e `/planos` redirecionam para as rotas do painel;
  na plataforma, o caminho inverso. **Não há item "Catálogo"**: ali o
  catálogo É o conjunto das trilhas do portal, e já se chama "Todas as
  trilhas". **"Planos" virou "Meu acesso"** — o colaborador não contrata
  nada, e a tela responde a pergunta que ele tem: até quando tenho acesso
  a quê, e quem renova.
- **A Biblioteca da empresa (`db/042`, `lib/acervo-item.ts` + `lib/acervo.ts`).**
  Acervo do PORTAL, não anexo de aula: título, autor, assuntos (etiquetas
  livres), PDF ou link, capa, setor e rascunho/publicado. `material_apoio`
  (db/001) não servia — exige `aula_id`, não tem portal, autor nem
  publicação, e nunca ganhou rota de envio. O RH publica em
  `/empresa/biblioteca`; a equipe folheia em `/painel/biblioteca`,
  filtrando por assunto, autor e formato pela barra de endereço.
- **A entrega do PDF é privada (`/api/documento/[id]`), ao contrário da de
  imagem.** A foto do portal é pública porque é a cara dele; o acervo é
  conteúdo interno do cliente, e vale para ele o mesmo do §5.11. Confere
  sessão, portal (pelo prefixo do nome do arquivo), publicação e setor —
  e responde 404, nunca 403: "existe, mas você não pode" já entrega que o
  material existe. `Cache-Control: private, no-store`. O nginx da VPS não
  serve esse diretório: a única location de mídia é `/midia-interna/`,
  `internal`, apontando só para o vídeo.
- **O acervo entra na cota de GB**, junto com vídeo e material de apoio
  (`medirArmazenamento`). Sem isso a empresa encheria o disco sem que um
  byte aparecesse na fatura.

**Dois defeitos existentes encontrados de passagem:** cinco itens do menu
do RH (`route`, `groups`, `assignment_turned_in`, `monitoring`, `web`)
apontavam para ícones que não existem em `app/ui.tsx` — e `Icone` devolve
`null` para nome desconhecido, de propósito, então metade do menu vinha
sem ícone e ninguém via erro. Os cinco foram desenhados. E o formulário
de capa do acervo revelou que `tipo=imagem` no upload sempre trocava a
**foto de apresentação do portal**: nasceu `uso=acervo` para separar os
dois destinos.

**Verificação da etapa 8:** 394 testes (`skipped 0`, com `DATABASE_URL` na
mesma linha), `npm run build`, `npm run contraste`, o roteiro
`portal-empresa.mjs` com **66 passos no navegador** e `e2e:empresa` com as
cinco rotas novas na varredura de vazamento — tudo contra o container
reconstruído.

**Quatro defeitos encontrados ao percorrer o fluxo, e corrigidos:**

1. **Toda prova saía zerada.** O driver do Postgres devolve BIGINT como texto; a correção comparava o id marcado (número, vindo do formulário) com o id da alternativa (texto). `5 === '5'` é falso, e o gabarito certo no banco não salvava ninguém. `::int` nas duas consultas de `lib/avaliacao.ts`, e a comparação de matéria em `podeAcessar` passou a ser numérica pelo mesmo motivo.
2. **Ninguém conseguia responder a prova.** O rádio invisível levava `pointer-events: none`, e com isso o Chrome deixa de encaminhar ao controle o clique feito no rótulo. A alternativa não marcava, e o botão de entregar ficava desabilitado para sempre.
3. **O RH não conseguia enviar imagem nenhuma.** `/api/upload` só aceitava professor e admin, enquanto `/empresa/site` pedia "cole aqui o endereço da imagem que você enviou" sem oferecer lugar para enviá-la. O gestor entrou na rota (com o portal vindo do vínculo, nunca da requisição) e a tela ganhou o enviador.
4. **Quem passava na prova perdia a correção.** Terminada a ação de servidor, o Next re-renderiza a rota, e a página — vendo a trilha agora concluída — trocava o resultado recém-calculado por um resumo. A escolha entre "resultado desta tentativa" e "resumo de quem já passou" mudou-se para o cliente, que é quem sabe se houve entrega agora.

**Ainda pendente:** a transversal de e-mail (o convite continua sendo link copiado à mão), a sequência obrigatória entre aulas de uma trilha, e a troca de plano em autosserviço.

#### Fora do escopo desta rodada

SSO (SAML/Google Workspace) · API de RH · múltiplas unidades e centros de custo · relatório agregado anonimizado (§12-B.1) · gamificação · trilhas por cargo com pré-requisito entre trilhas · transcodificação/CDN (pendência já listada no §5.10) · nota fiscal automática da mensalidade. Tudo isso é Enterprise, e Enterprise fecha por proposta.

#### Riscos específicos

| Risco | Impacto | Mitigação |
|---|---|---|
| Página do portal EMPRESA vazar conteúdo por uma rota esquecida (catálogo, aula, `/api/video`, sitemap) | Crítico | A regra "EMPRESA exige sessão" mora em um ponto só (`espectadorAtual` / guarda de rota), e o e2e tenta cada rota anonimamente |
| Convite por link compartilhado com quem não devia | Médio | Token de uso único, expira em 7 dias, preso ao e-mail informado; aceitar exige criar a senha naquele e-mail |
| Teto de contas contornado por conta "desativada e reativada" | Baixo | O teto conta contas ATIVAS; reativar passa pela mesma conferência |
| Empresa sair e exigir os dados (LGPD, art. 18) | Médio | Exportação CSV de colaboradores e progresso desde a etapa 6; prazo de retenção pós-encerramento vai ao contrato (§16.16 vale para empresa também) |

---

### 5.12 Calculadora Penal — dosimetria, prescrição, decadência e perempção (planejamento de 05/09/2026)

Terceira ferramenta do catálogo de **Ferramentas** (`lib/ferramentas.ts`), ao lado do vade-mécum e do mural de vagas. O vade-mécum responde "o que a lei diz"; a calculadora responde "o que a lei dá neste caso" — e mostra, passo a passo, de onde cada número saiu.

**A promessa ao aluno:** "escolha a lei e o crime, descreva o caso, e veja a pena calculada nas três fases do art. 68 do CP com o artigo ao lado, a regra usada em cada passo e os prazos de prescrição, decadência e perempção — cada número com o dispositivo que o sustenta e a aula que o explica."

Para quem: o aluno de Direito Penal e Processo Penal, o candidato à OAB e a concursos (dosimetria e prescrição caem em toda prova de segunda fase penal) e o advogado em início de carreira que precisa conferir uma sentença. É ferramenta de **estudo e conferência**, e a tela diz isso: não substitui a análise do caso nem a jurisprudência do tribunal local.

#### O que o aluno faz (fluxo em uma página)

| Passo | O que acontece | Base legal mostrada |
|---|---|---|
| **1. Lei e crime** | Escolhe a norma (só as que têm tipos penais catalogados) e o tipo penal — por nome ("roubo"), por número ("157") ou pelo texto, com a mesma busca do vade-mécum. Escolhe a forma: caput, qualificadora, privilégio, § específico. O artigo do acervo aparece ao lado com o bloco **Pena** em destaque (o `partirDispositivo` já o reconhece) | O próprio artigo, com o carimbo "texto conferido em" |
| **2. O caso** | Data do fato · **nascimento do agente** (menor de 18 é inimputável, art. 27: a tela para e aponta o ECA) · **nascimento da vítima** (agravante do art. 61, II, h; majorantes como a do art. 121, § 4º; termo inicial do art. 111, V) · reincidência: data do trânsito da condenação anterior **e** data em que aquela pena foi cumprida ou extinta, para a temporariedade de cinco anos do art. 64, I · prisão provisória (detração) · datas processuais: recebimento da denúncia, pronúncia, sentença condenatória recorrível, trânsito para a acusação e para ambos · conhecimento da autoria (decadência) · último ato do querelante (perempção). Cada data é opcional: o que não for informado deixa o cálculo correspondente marcado como "falta dado" | arts. 2º, 10, 42, 63 e 64 CP |
| **3. Primeira fase** | As oito circunstâncias do art. 59, marcadas como desfavoráveis quando for o caso. Fração por circunstância configurável: **1/8 do intervalo entre mínimo e máximo** (padrão, critério do STJ) ou 1/6 da pena mínima. A pena-base nunca sai dos limites do tipo | art. 59 CP |
| **4. Segunda fase** | Agravantes (arts. 61 e 62) e atenuantes (arts. 65 e 66), fração padrão de 1/6. Aplica a preponderância do art. 67, a compensação reincidência × confissão (Tema 585 STJ) e a Súmula 231 do STJ (atenuante não leva abaixo do mínimo) | arts. 61 a 67 CP |
| **5. Terceira fase** | Causas gerais — tentativa (art. 14), arrependimento posterior (art. 16), semi-imputabilidade (art. 26, p. ún.), participação de menor importância (art. 29, § 1º), concurso formal (art. 70), continuidade (art. 71, com a tabela por número de crimes) — e as **específicas do tipo**, vindas do catálogo (art. 157, § 2º e § 2º-A; art. 33, § 4º e art. 40 da Lei de Drogas etc.). Podem sair dos limites. Ordem: parte especial antes da geral; incidência em cascata (padrão) ou somada; concurso de causas do art. 68, p. ún. | arts. 14, 16, 26, 29, 68, 70 e 71 CP |
| **6. Outros crimes** | Botão "adicionar crime": material soma (art. 69); formal e continuado exasperam a maior; unificação pelo teto do art. 75 (40 anos para fato a partir de 23/01/2020; 30 antes) | arts. 69 a 76 CP |
| **7. Resultado** | Tudo o que está na seção abaixo, numa página com endereço próprio | — |

#### O que a tela devolve

- **Pena definitiva** em anos, meses e dias, e **multa** em dias-multa × valor do dia (arts. 49 e 60), com a **memória de cálculo**: uma linha por operação, cada uma com o dispositivo, o link para ele no vade-mécum e o "explicado na aula" (reaproveita `aulasQueExplicam`).
- **Regime inicial** (art. 33, §§ 2º e 3º; Súmulas 718 e 719 do STF, 440 do STF e 269 do STJ), já considerada a detração para esse fim (art. 387, § 2º, CPP).
- **Substituição por restritiva de direitos** (art. 44, com a Súmula 588 do STJ na violência doméstica) e **sursis** (art. 77, inclusive etário e humanitário).
- **Institutos despenalizadores**, que dependem só da pena em abstrato e por isso saem de graça: infração de menor potencial ofensivo (pena máxima ≤ 2 anos, art. 61 da Lei 9.099/95), suspensão condicional do processo (mínima ≤ 1 ano, art. 89) e acordo de não persecução penal (mínima < 4 anos, sem violência ou grave ameaça, art. 28-A CPP).
- **Execução**: fração de **progressão** (art. 112 da LEP — 1/6, 2/5 e 3/5 para fato anterior a 23/01/2020; os percentuais de 16% a 70% depois; feminicídio pela Lei 14.994/24, a conferir na etapa 2) e de **livramento condicional** (art. 83), com as datas estimadas quando a data da prisão for informada.
- **Prescrição**, em linha do tempo: pretensão punitiva em abstrato (art. 109, pela máxima com a maior majorante e a menor minorante; termo inicial do art. 111), redução pela metade (art. 115: agente **menor de 21 anos na data do fato** ou **maior de 70 na data da sentença** — a idade sai da data de nascimento, e a tela mostra a conta), interrupções (art. 117) e suspensões (art. 116); retroativa e intercorrente pela pena aplicada (art. 110, § 1º, com a vedação da Lei 12.234/10 para fato posterior a 05/05/2010); pretensão executória (art. 110, caput, acrescida de 1/3 se reincidente — **só nela**: o acréscimo não alcança a retroativa nem a intercorrente, Súmula 220 do STJ; termo inicial do art. 112 com o Tema 788 do STF, que exige o trânsito para ambas as partes); **multa** (art. 114: dois anos quando é a única pena cominada ou aplicada; quando cumulada com a privativa, prescreve junto com ela, no mesmo prazo); **imprescritibilidade** marcada no catálogo, tipo a tipo (racismo e injúria racial, ação de grupos armados contra a ordem constitucional — CF, art. 5º, XLII e XLIV; Lei 14.532/23): para esses tipos a linha do tempo não tem vencimento, e a tela diz por quê.
- **Linha do tempo do processo**, que é o que justifica qual prescrição está correndo. Ela vai do fato à execução em trechos — fato → recebimento da denúncia → (pronúncia → confirmação) → sentença condenatória → trânsito para a acusação → trânsito para ambos → execução — e em cada trecho escreve **qual modalidade corre ali** e por quê: até a sentença, a punitiva em abstrato pela pena máxima; da sentença em diante, com trânsito para a acusação, a retroativa (olhando para trás) e a intercorrente (olhando para frente) pela pena aplicada; após o trânsito para ambos, a executória. Cada trecho traz o prazo aplicável, o vencimento e, com as datas informadas, **em que fase o processo está hoje**, quanto tempo já correu naquela fase e quanto falta. Trecho já vencido acende em vermelho com o dispositivo; data que falta aparece como "informe para calcular". Decadência e perempção entram na mesma linha, antes da denúncia e durante a ação privada.
- **Ficha do caso**: as informações derivadas que o aluno precisa enxergar para conferir as premissas — idade do agente na data do fato e na data da sentença (e o que cada uma disparou: art. 115, atenuante do art. 65, I, sursis etário do art. 77, § 2º); idade da vítima na data do fato (e o que disparou); se há reincidência e até quando ela vale (art. 64, I); qual redação da lei estava vigente na data do fato; quanto tempo decorreu desde o fato; espécie de ação penal e prazo de representação. Sem a ficha, um erro de data passa despercebido e o resultado inteiro sai errado sem ninguém ver.
- **Decadência** (art. 103 CP e art. 38 CPP): só quando a ação for privada ou pública condicionada — o catálogo sabe a espécie de ação de cada tipo. Seis meses do conhecimento da autoria, contados como prazo **penal** (art. 10 CP: o dia do começo conta, o prazo não se prorroga, não se interrompe nem se suspende). Avisa a retratação da representação (art. 25 CPP; art. 16 da Lei Maria da Penha só em audiência) e a Súmula 542 do STJ (lesão leve doméstica é pública incondicionada).
- **Perempção** (art. 60 CPP): só na ação privada exclusiva — não na subsidiária (art. 29 CPP). Trinta dias sem andamento; sessenta dias após a morte do querelante sem habilitação; os incisos III e IV explicados como hipóteses de ato, não de prazo. Contagem **processual** (art. 798 CPP: o dia do começo não conta, prorroga para o dia útil).
- **"Não se aplica, porque"**: cada instituto que não couber no caso aparece com o motivo (decadência não corre em ação pública incondicionada; perempção não existe em ação pública). Ensinar pela negativa é metade do valor da ferramenta em prova.

#### Decisões tomadas neste plano

| Tema | Decisão | Por quê |
|---|---|---|
| **Motor** | Módulo puro em `lib/penas/`, sem banco e sem React: `tempo.ts` (dias ↔ anos/meses/dias, arts. 10 e 11 CP, prazo processual do art. 798 CPP), `dosimetria.ts`, `regime.ts`, `execucao.ts`, `prescricao.ts`, `decadencia.ts`, `perempcao.ts`. Pena representada em **dias inteiros**; frações de dia desprezadas ao fim de cada operação (art. 11 CP) | É a parte que erra caro e a que mais muda: precisa rodar em `node --test` sem navegador nem `DATABASE_URL`, como `navegacao.ts` e `vademecum-texto.ts`. Ponto flutuante em pena é fonte de "3 anos, 11 meses e 29 dias" onde a lei dá 4 anos |
| **Catálogo de regras em código, não em tabela** | `lib/penas/catalogo/cp.ts`, `drogas.ts`, `maria-da-penha.ts`… tipados, com `conferidoEm` por norma. Cada tipo e cada causa apontam para o acervo por `(normaSlug, rotulo)`; o **texto legal vem da tabela `dispositivo`** em tempo de execução. Não nasce tabela de regras nem tela de admin para elas | Regra jurídica exige revisão humana, histórico e diff — o git faz isso; um formulário de admin não. E o acervo continua sendo a única fonte do texto da lei, com o mesmo carimbo de conferência do vade-mécum |
| **Lei no tempo** | Toda regra do catálogo tem `vigenciaDe` e `vigenciaAte`; a **data do fato** escolhe a versão (CF, art. 5º, XL; art. 2º CP). Quando a lei nova é mais benéfica só em parte, a tela avisa que não se combinam (Súmula 501 STJ) | Pacote Anticrime (23/01/2020), Lei 12.234/10, Lei 13.718/18, Lei 14.994/24 e Lei 14.811/24 mudaram exatamente as regras que a calculadora aplica. Sem a data do fato, metade dos resultados estaria errada para metade dos casos |
| **Critério jurisprudencial parametrizado** | Onde há divergência (fração da 1ª fase, cascata × soma na 3ª, compensação reincidência × confissão, termo inicial da executória), o padrão é o majoritário do STJ e o aluno pode trocar. A tela sempre diz qual critério usou | A calculadora não pode se apresentar como "a resposta" — em prova, quem sabe justificar o critério ganha o ponto; na prática, o tribunal local decide |
| **Resultado é uma URL** | O estado do cálculo vive nos `searchParams`; o resultado é renderizado no servidor, como o vade-mécum. Permalink, imprimível pelo navegador, sem sessão. O formulário é componente de cliente com prévia da pena ao vivo | O aluno cola o link no grupo de estudo e o professor cola na aula; e a tela de resultado indexa. Salvar exige sessão — `calculo_pena` |
| **Gratuita e pública** | Aberta como o vade-mécum (§5.4): a lei é pública, e a ferramenta é porta de entrada e SEO. Histórico salvo só logado. Disponível no portal do professor **quando ele a vincula** (§5.10, "Ferramentas na minha página"); no portal de empresa, atrás da guarda de `app/guarda-empresa.ts` | O menu Ferramentas deixou de ser da casa e passou a ser de cada portal: no site principal a porta da calculadora é o rodapé e o endereço direto |
| **Escopo de normas da v1** | Lista **fechada** de tipos: Código Penal (os mais cobrados — homicídio e feminicídio, lesão corporal inclusive doméstica, furto, roubo, extorsão, estelionato, receptação, estupro e estupro de vulnerável, peculato, corrupção ativa e passiva, ameaça, perseguição, entre 40 e 60 tipos), Lei de Drogas (arts. 28, 33, 33 § 4º, 35 e 40) e Lei Maria da Penha (via art. 129, §§ 9º e 13, art. 147-B CP e art. 24-A). Uma norma entra quando todos os seus tipos catalogados passam pela conferência | Catalogar o Código Penal inteiro são 300+ tipos revisados à mão. Melhor 50 certos que 300 duvidosos — o aluno percebe o erro no crime que ele estuda |
| **Acervo cresce junto** | Entram no `CATALOGO` do `scripts/importar-leis.mjs`: Lei 8.072/90 (hediondos), 9.099/95 (juizados), 9.455/97 (tortura), 9.503/97 (CTB), 9.605/98 (ambiental), 9.613/98 (lavagem), 10.826/03 (desarmamento), 12.850/13 (organização criminosa), 13.869/19 (abuso de autoridade) e DL 3.688/41 (contravenções) | A calculadora cita a Lei de Hediondos em todo regime e progressão; sem ela no acervo, o link "ver o artigo" quebra. As demais são as próximas normas com tipos penais |
| **Extrator de penas** | `scripts/extrair-penas.mjs` lê os blocos `pena` do acervo ("reclusão, de seis a vinte anos, e multa") e gera um **rascunho** do catálogo para revisão — não grava nada sozinho | O parser já isola a linha da pena; converter "seis a vinte anos" em dias é regra fechada. O que não é fechado — espécie de ação penal, hediondez, causas específicas — fica para a revisão humana |
| **Menu** | Item **Calculadora Penal** em `FERRAMENTAS` (`lib/ferramentas.ts`), chave `calculadora-penal`, rota `/calculadora-penal`, ícone `calculate`, sem `naBarra`. O submenu só aparece no portal de professor que marcou a ferramenta | Segue a regra do `MenuFerramentas`: quem mora só no submenu acende o gatilho |

#### Modelo de dados

Banco só para o que é do aluno; a regra fica no código.

```
calculo_pena (id, usuario_id, portal_id, titulo, entrada JSONB, resultado JSONB,
              versao_catalogo TEXT, criado_em)
  -- `versao_catalogo` é o conferidoEm do catálogo usado: um cálculo salvo em
  -- 2026 continua legível em 2028, e a tela avisa se a regra mudou desde então
```

Tipos do catálogo (TypeScript, em `lib/penas/tipos.ts`):

```
TipoPenal   { id 'cp-157-2', norma 'cp', rotulo 'Art. 157', forma '§ 2º', nome,
              especie RECLUSAO|DETENCAO|PRISAO_SIMPLES, penaMinDias, penaMaxDias, multa,
              acaoPenal PUBLICA_INCONDICIONADA|PUBLICA_CONDICIONADA|PRIVADA,
              elemento DOLOSO|CULPOSO|PRETERDOLOSO, violenciaOuGraveAmeaca,
              hediondo NAO|HEDIONDO|EQUIPARADO, imprescritivel: boolean, vigenciaDe, vigenciaAte?,
              causasEspecificas: CausaId[], observacoes }
Causa       { id, fase 2|3, sinal +|-, fracaoMin, fracaoMax (iguais quando fixa),
              base { norma, rotulo }, escopo GERAL | tipo(s), preponderante?, vigenciaDe, vigenciaAte? }
Caso        { tipos: [{ tipoId, circunstancias59[], agravantes[], atenuantes[], causas[] }],
              concurso MATERIAL|FORMAL|CONTINUADO, datas {...},
              agente { nascimento, reincidente, transitoAnterior?, extincaoAnterior? },
              vitima { nascimento? }, criterios {...} }
Resultado   { penas por crime e unificada, memoria: Passo[], regime, substituicao, sursis,
              despenalizadores, execucao, prescricao: Marco[], decadencia, perempcao,
              linhaDoTempo: Trecho[]  -- fase, modalidade que corre, prazo, vencimento, situação hoje
              ficha: Derivado[]        -- idade do agente/vítima e o que dispararam, reincidência, lei vigente
              avisos[] }
```

#### Sequência de construção

| # | Etapa | Entrega | Depende de |
|---|---|---|---|
| **0** | **Motor de tempo e de pena** | `lib/penas/tempo.ts` e `dosimetria.ts` com as três fases, limites, cascata, concurso de crimes, art. 75 por data do fato, detração e multa · testes com **casos-referência de acórdãos publicados** (pena informada no voto = pena calculada) | — |
| **1** | **Catálogo v1 e acervo** | Tipos do CP, da Lei de Drogas e da Maria da Penha · `scripts/extrair-penas.mjs` · as dez normas novas no `importar-leis.mjs` · teste de integração (com `DATABASE_URL`): todo `(norma, rotulo)` do catálogo existe no acervo e a pena catalogada bate com o bloco `pena` extraído | 0 |
| **2** | **Consequências da pena** | `regime.ts` (regime inicial, substituição, sursis, despenalizadores) e `execucao.ts` (progressão e livramento por data do fato, com conferência das frações da Lei 14.994/24) | 0, 1 |
| **3** | **Extinção da punibilidade** | `prescricao.ts` (abstrata, retroativa, intercorrente, executória, multa, imprescritibilidade, com marcos para a linha do tempo), `decadencia.ts` e `perempcao.ts` | 0, 1 |
| **4** | **Tela** | `/calculadora-penal`: seleção do tipo com a busca do acervo · formulário por fases (cliente, com prévia ao vivo) · resultado renderizado no servidor a partir da URL · artigo ao lado com "explicado na aula" · linha do tempo da prescrição · imprimir · item no menu Ferramentas · guarda de empresa · `testes-e2e/calculadora-penal.mjs` | 2, 3 |
| **5** | **Histórico e pontes** | Salvar cálculo (logado) e listar em `/conta` · botão **"Calcular a pena"** no vade-mécum em todo artigo que tenha bloco `pena` e esteja no catálogo · link "reportar erro neste cálculo" (abre e-mail ou formulário simples com a URL do cálculo) | 4 |

Estimativa no ritmo do §14 (5 a 15 h/semana): etapas 0 e 1 em 2 a 3 semanas (a 1 é a mais demorada: é leitura de lei, não código); 2 e 3 em 2 a 3; 4 em 2 a 3; 5 em 1. **Sete a dez semanas.** A etapa 1 pode ser fatiada por norma: o CP sozinho já entrega a ferramenta.

#### Verificação exigida por etapa

- **Unidade** (sem banco): conversão dias ↔ anos/meses/dias e desprezo de fração (art. 11); pena-base presa aos limites; Súmula 231; preponderância do art. 67; cascata × soma na 3ª fase; tabela da continuidade; art. 75 por data do fato; tabela do art. 109 nas duas versões (antes e depois da Lei 12.234/10); art. 115 nas duas pontas (20 anos na data do fato reduz; 21 completos no dia do fato não reduz; 70 na data da sentença reduz, 70 completados depois dela não) e o mesmo nascimento disparando a atenuante do art. 65, I; menor de 18 na data do fato interrompe o cálculo; temporariedade do art. 64, I (reincidência caduca cinco anos após a extinção da pena anterior); sequência de interrupções do art. 117 recomeçando o prazo; +1/3 da executória para reincidente **e ausência do acréscimo** na retroativa e na intercorrente (Súmula 220); multa do art. 114 isolada (dois anos) e cumulada (acompanha a privativa); tipo imprescritível nunca vence, qualquer que seja a data; linha do tempo: com as mesmas datas, a fase apontada e a modalidade que corre em cada trecho, inclusive quando faltam datas; decadência em prazo penal (fato conhecido em 15/03 decai em 14/09; o dia do começo conta; 31/08 + 6 meses cai em 28/02); perempção em prazo processual (feriado e fim de semana prorrogam); **casos-referência**: pelo menos dez dosimetrias de acórdãos do STJ com os números publicados, reproduzidas ao dia.
- **Integração** (com `DATABASE_URL`): catálogo × acervo (rótulo existe; pena bate com o texto); `calculo_pena` salvo só com sessão e só lido pelo dono.
- **Ponta a ponta**: o aluno escolhe roubo majorado tentado, preenche o caso, confere pena, regime e prescrição na tela, abre o artigo no vade-mécum pelo link, imprime; anônimo no endereço de uma empresa não vê a ferramenta.

#### Melhorias avaliadas além do pedido

O pedido foi: cálculo por lei escolhida, artigo, regra de cálculo, prescrição, decadência e perempção. O que segue foi avaliado e dividido em duas listas — o que entra na v1 porque custa pouco e muda o produto, e o que fica para depois.

**Entram na v1 (custo baixo, valor alto):**

1. **Memória de cálculo pedagógica** — cada operação com o dispositivo e o link; é o que transforma a calculadora em aula.
2. **Institutos despenalizadores** (IMPO, suspensão condicional do processo, ANPP) — saem da pena em abstrato, que já está no catálogo; três linhas de regra, e são pergunta certa de prova.
3. **Regime, substituição, sursis, progressão e livramento** — o aluno que calculou a pena quer saber "e daí?"; sem isso a ferramenta para no meio da história.
4. **Linha do tempo do processo** — as fases desenhadas, com a modalidade de prescrição que corre em cada uma, o vencimento e a fase atual; a prescrição é o assunto que o aluno menos entende em texto e mais entende em desenho, e é a fase do processo que justifica qual prazo se aplica.
5. **Lei no tempo** — versão da regra pela data do fato, com o aviso de qual lei foi aplicada. É requisito de correção, não enfeite, mas merece a etiqueta "compare antes e depois do Pacote Anticrime" na tela.
6. **"Não se aplica, porque"** — explicar a negativa.
7. **Permalink e impressão** — do desenho da tela, sem custo adicional.
8. **Ponte com o vade-mécum e com as aulas** — botão no artigo e "explicado na aula" no resultado; é o método da casa (§5.4, deep link bidirecional).
9. **Reportar erro** — regra jurídica muda e a calculadora vai errar em algum caso; o aluno que avisa é o revisor mais barato.

**Ficam para depois (anotadas para não se perder):**

- **Calculadora de execução penal completa** — data-base, remição (art. 126 LEP), unificação de várias condenações, falta grave, comutação e indulto pelo decreto do ano. É a extensão natural e o que o advogado criminalista mais usa; vale uma rodada própria.
- **Modo prova** — o aluno faz a dosimetria do caso e o sistema corrige passo a passo; vira o "caso prático discursivo com espelho" do §5.5 v2 sem custo novo de conteúdo.
- **Comparação lado a lado** — duas dosimetrias do mesmo caso (tese da defesa × da acusação); útil na prática e na segunda fase da OAB.
- **Família de calculadoras** — prazos processuais (CPC e CPP, com feriados), prescrição civil (arts. 205 e 206 CC), trabalhista (CF, art. 7º, XXIX), tributária (arts. 173 e 174 CTN). O item do menu vira "Calculadoras" quando houver a segunda. O `tempo.ts` desta rodada já nasce servindo a todas.
- **Páginas por crime para busca** — "pena do art. 157 do CP" como página estática com o artigo, a pena, o regime possível e a prescrição em abstrato; é a porta de entrada orgânica que o §10 pede do Next.js.
- **Medidas socioeducativas do ECA e Código Penal Militar** — outro regime, outro motor; fora até haver matéria correspondente no catálogo.
- **Telemetria de uso** — quais tipos são mais calculados orienta que aula produzir primeiro.

#### Estado da implantação (05/09/2026)

**Etapas 0 a 5 implantadas na mesma rodada.** O que o plano previa em sete a dez semanas coube num dia porque o motor é puro e o acervo já existia; o que NÃO coube foi a revisão jurídica externa (§16.25), que continua pendente — a ferramenta está no ar marcada como "estudo e conferência".

- **Motor** em `lib/penas/`: `tempo.ts` (pena em dias, prazo penal do art. 10 e processual do art. 798, feriados, idade), `dosimetria.ts` (três fases, Súmula 231, Tema 585, art. 68 p. ún., cascata × soma, concurso, art. 75 por data, multa), `regime.ts` (regime, substituição, sursis, IMPO, suspensão do processo, ANPP), `execucao.ts` (progressão e livramento em **quatro redações da LEP**), `prescricao.ts` (abstrata, retroativa, intercorrente, executória, multa, imprescritibilidade, art. 111 V, art. 115 com a exceção da Lei 15.160/25, Súmula 220, Lei 12.234/10, Tema 788 — e a **linha do tempo por fase**), `extincao.ts` (decadência, inclusive os 12 meses da Lei 15.438/26; perempção), `calcular.ts` (orquestra e monta a **ficha do caso**), `url.ts` (o caso vira URL, saneado na volta). Nada disso toca banco: 46 testes rodam sem `DATABASE_URL`.
- **Catálogo** em `lib/penas/catalogo/`: 78 tipos (Código Penal, Lei de Drogas, Maria da Penha e Lei do Racismo), com **versões por data do fato** onde a pena mudou — furto, roubo, latrocínio, receptação e estelionato (Lei 15.397/26), lesão doméstica e art. 24-A (Lei 14.994/24) — e 60 causas de aumento e diminuição. As datas das leis de 2024–2026 foram conferidas no Planalto, e as penas foram lidas do acervo: o teste de integração `penas-catalogo.test.ts` confere, tipo a tipo, que a pena catalogada continua igual ao bloco "Pena" do texto oficial. **Achado da rodada:** o acervo, conferido em 03/09/2026, traz redações mais novas do que qualquer manual — a LEP foi reescrita em março e maio de 2026 (Leis 15.358 e 15.402: progressão de 1/6 a 85%), o roubo passou a 6 a 10 anos e o § 5º do estelionato foi revogado. Sem o acervo como fonte, o catálogo teria nascido errado.
- **Acervo ampliado** com onze leis penais pelo `importar-leis.mjs` (hediondos, Lei 9.099/95, tortura, CTB, ambiental, lavagem, desarmamento, organização criminosa, abuso de autoridade, contravenções e Lei 7.716/89 — 834 dispositivos), para que todo artigo citado no resultado tenha link.
- **Extrator** `scripts/extrair-penas.mjs` (`npm run penas:extrair -- cp 155 157`): lê os blocos "Pena" do acervo e imprime o rascunho do catálogo para revisão humana.
- **Tela** `/calculadora-penal` (item "Calculadora Penal" no menu Ferramentas): formulário de cliente com prévia ao vivo, resultado renderizado no servidor a partir da URL (permalink, impressão), memória de cálculo com o artigo ao lado de cada passo e "explicado na aula", cartões de regime/substituição/sursis/despenalizadores/execução, **linha do tempo do processo** com a modalidade que corre em cada trecho e a fase atual, decadência e perempção com o "não se aplica, porque", e a **ficha do caso** com as idades e o que cada uma disparou. Guarda de portal de empresa aplicada.
- **Histórico** (`db/035_calculo_pena.sql`, `lib/calculo-pena.ts`): o aluno logado guarda o cálculo com um nome e o reabre; cada registro leva a versão do catálogo, e a lista avisa quando a regra mudou desde então.
- **Ponte com o vade-mécum**: todo artigo do acervo que é um crime catalogado ganhou o botão "Calcular a pena", que abre a calculadora com o tipo escolhido.
- **Verificação:** 323 testes de unidade e integração (46 novos, entre eles os casos de borda pedidos: 21 anos no dia do fato, 70 na sentença, Súmula 220, art. 114 isolado e cumulado, imprescritível, art. 64 I, reincidência × confissão, art. 75 por data, 111 V) e `testes-e2e/calculadora-penal.mjs` com 26 checagens no navegador — do menu ao vade-mécum e de volta.

**Pendências desta rodada:** revisão por profissional de Penal antes de tirar o selo de conferência (§16.25); art. 28 da Lei de Drogas (sem pena privativa: pede um caminho próprio no motor); art. 147-B do CP, que o importador do Planalto colou dentro do 147-A; contravenções, CTB, Desarmamento e Lei de Tortura entraram no acervo, mas ainda não no catálogo; e o e-mail de "reportar erro" aponta para um endereço genérico até existir o adaptador de e-mail transversal do §5.11.

#### Fora do escopo desta rodada

Penas de pessoa jurídica (Lei 9.605/98) · Justiça Militar · ECA · remição, indulto e comutação · atualização monetária da multa · unificação de execuções com datas distintas · jurisprudência por tribunal · cálculo de pena para o júri com quesitos.

#### Riscos específicos

| Risco | Impacto | Mitigação |
|---|---|---|
| Erro jurídico numa regra (fração, tabela, termo inicial) | Alto — o aluno leva o erro para a prova, o advogado para a petição | Casos-referência de acórdãos nos testes; `conferidoEm` por norma na tela; "reportar erro"; **revisão por profissional de Direito Penal antes de sair do beta** (§16.25) |
| Mudança legislativa depois do lançamento | Médio | Vigência por data em toda regra; rotina de revisão trimestral do catálogo, junto da reimportação do acervo |
| Divergência entre STF, STJ e tribunais | Médio | Critérios parametrizados com o padrão declarado; nunca uma única "resposta certa" |
| Escopo do catálogo crescer sem fim | Médio | Lista fechada por rodada; extrator gera rascunho, humano confirma; uma norma só entra inteira |
| Ferramenta usada como parecer | Baixo, mas de reputação | Aviso permanente "ferramenta de estudo e conferência"; a memória de cálculo mostra as premissas, e premissas erradas são visíveis |

---

## 6. Regras de negócio — licenciamento

Esta é a parte mais crítica do sistema. Erro aqui vira prejuízo ou cliente irritado.

### 6.1 Camadas de acesso

| Camada | Cadastro | Cartão | O que libera | Duração |
|---|---|---|---|---|
| **Aberta** | não | não | Blog, vade-mécum completo, ementas, **1ª aula de cada assunto** | permanente |
| **Teste gratuito** | sim | **não** | 1 matéria à escolha, limitada a ~20% das aulas e 30 exercícios no total. Sem download de material, sem certificado. | 7 dias corridos a partir do 1º acesso |
| **Licença por matéria** | sim | sim | 1 matéria completa: aulas, exercícios, materiais, simulados daquela matéria | período contratado |
| **Licença promocional** | sim | não obrigatório | **1 matéria com acesso total** (igual à licença paga da matéria) | **período definido na campanha** |
| **Passe completo** | sim | sim | Todas as matérias publicadas, incluindo as lançadas durante a vigência | período contratado |

**Regras do teste gratuito**
- Um teste por CPF, não renovável e não acumulável.
- Não exige meio de pagamento (reduz atrito e evita disputa de cobrança indevida).
- Ao expirar: conteúdo bloqueia, mas progresso e anotações são preservados — isso vira argumento de conversão.

### 6.1.1 Licença promocional

Diferente do trial (que é limitado em conteúdo), a promocional dá **acesso total a uma matéria**, limitado apenas pelo **período** definido na campanha. É a ferramenta de marketing e parcerias do sistema.

**Formas de concessão (as três suportadas):**

1. **Cupom/código de campanha** — o admin cria a campanha (matéria, período de acesso, gratuita ou com desconto, quantidade de resgates, validade do código); o aluno resgata o código no site e a licença é criada na hora.
2. **Concessão manual pelo admin** — direto na conta de um aluno específico (parceria, brinde, influenciador, professor convidado).
3. **Automática por evento** — o sistema concede sozinho em gatilhos configuráveis (ex.: indicou um amigo que assinou, concluiu o trial com X% de progresso, data comemorativa).

**Modalidades:** a campanha define se a promocional é **gratuita** (cortesia — sem cobrança) ou **com desconto** (é uma compra normal de licença por matéria com preço promocional; nesse caso passa pelo checkout).

**Regras:**
- Acesso idêntico ao da licença paga da matéria durante a vigência (aulas, exercícios, materiais, simulados).
- Ao expirar, não renova: o aluno recebe oferta de conversão para licença paga, com progresso preservado.
- Limites anti-abuso por campanha: nº máximo de resgates, 1 resgate por CPF por campanha, e política de acúmulo (por padrão, promocional não acumula com outra promocional da mesma matéria).
- Toda concessão fica auditada: campanha de origem, quem concedeu, quando.

### 6.2 Períodos de contratação
Mensal · Trimestral · Semestral · Anual — com desconto crescente. Períodos mais longos são a defesa contra o churn alto típico de assinatura para estudante.

### 6.3 Resolução de acesso (algoritmo)

```
podeAcessar(usuario, aula):
  materia = aula.assunto.materia
  se aula.amostra_gratuita == true            → LIBERA
  licencas = licencas_do_usuario(status = ATIVA, vigencia contém agora)
  se existe licenca de escopo CATALOGO         → LIBERA
  se existe licenca de escopo MATERIA(materia) → LIBERA
  se existe licenca TRIAL cobrindo materia
     e aula está dentro da cota do trial       → LIBERA
  senão                                        → BLOQUEIA (mostra oferta contextual)
```

Licenças **somam**, nunca se anulam. Um aluno pode ter 3 licenças de matéria e depois comprar o passe — a mais abrangente prevalece, as outras seguem válidas até expirar.

A licença promocional **não exige regra nova no algoritmo**: ela é uma licença de escopo `MATERIA` com origem `PROMOCIONAL` e vigência própria — o mesmo `podeAcessar` resolve. Essa é a vantagem de tratar licença como entidade de primeira classe.

### 6.4 Ciclo de vida da licença e da conta

`PENDENTE` (aguardando pagamento) → `ATIVA` → `EM_ATRASO` → `SUSPENSA` → `CANCELADA` / `EXPIRADA`

- **Renovação no cartão:** aviso por e-mail 3 dias antes. Recusa → 3 novas tentativas em 5 dias → `EM_ATRASO` com 3 dias de carência de acesso → `SUSPENSA`.
- **Renovação no Pix avulso:** não renova sozinha. Lembretes em D-7, D-3 e D-0 com link de pagamento em 1 clique.
- **Pix Automático:** renova sozinha, e o aluno cancela pelo app do próprio banco — o sistema precisa tratar o cancelamento vindo por webhook, não só pelo painel.
- **Cancelamento pelo aluno:** acesso mantido até o fim do período já pago. Sem reembolso proporcional após os 7 dias legais.
- **Upgrade matéria → passe:** crédito proporcional do saldo não consumido, abatido na nova cobrança.

### 6.5 Inatividade e bloqueio de conta

Regra definida pelo responsável: **conta sem uso por mais de 1 ano é bloqueada**.

- **O que conta como uso:** qualquer login zera o contador de inatividade. (Simples de entender e de implementar; o aluno é dono do próprio relógio.)
- **Régua de avisos antes do bloqueio:** e-mails automáticos aos 10 meses, 11 meses e 11 meses e 15 dias de inatividade — "entre na sua conta para mantê-la ativa".
- **Bloqueio (reversível):** aos 12 meses, a conta muda para `BLOQUEADA_INATIVIDADE`. Nenhum acesso é possível, mas progresso, anotações e histórico ficam preservados.
- **Reativação self-service:** o próprio aluno reativa por link de verificação enviado ao e-mail cadastrado — sem depender de suporte.
- **Licenças durante o bloqueio:** licenças vigentes têm o prazo **congelado ou não** conforme o caso — como o gatilho é 1 ano sem login, na prática só contas sem licença ativa em uso chegam ao bloqueio; se houver licença vigente (ex.: anual comprada e nunca usada), ela continua correndo normalmente e o bloqueio não estende prazo.
- **Ciclo de vida da conta:** `ATIVA → INATIVA (aviso) → BLOQUEADA_INATIVIDADE → reativada` — estado separado do status das licenças.
- **Conexão com a LGPD (§12.1):** o bloqueio por inatividade alimenta a política de retenção — conta bloqueada há mais de X meses (sugestão: 24) entra na fila de anonimização, com último aviso prévio por e-mail. O prazo exato é decisão pendente (§16).

### 6.6 Reembolso (obrigação legal, não escolha)
- **Arrependimento em 7 dias** (CDC, art. 49 e Decreto do Comércio Eletrônico): devolução **integral**, sem justificativa, mesmo que o aluno já tenha assistido. Vale para toda compra feita a distância.
- **Cancelamento fácil** (CDC, art. 51): botão no painel, em no máximo 2 cliques, com confirmação e protocolo. Esconder cancelamento é cláusula abusiva.
- **Oferta vincula** (CDC, art. 30): o que a página de planos diz é o que vale — preço total, prazo de acesso, o que está incluído.

---

## 7. Precificação — hipótese a validar

Posicionamento pretendido: **abaixo dos grandes preparatórios**, acima do gratuito. A tabela abaixo é hipótese inicial e precisa de teste de disposição a pagar na Fase 0.

| Produto | Mensal | Trimestral | Semestral | Anual |
|---|---|---|---|---|
| Matéria avulsa | R$ 24,90 | R$ 59,90 | R$ 99,90 | R$ 169,90 |
| Passe completo | R$ 59,90 | R$ 149,90 | R$ 269,90 | R$ 449,90 |

**Alavancas a testar:** desconto de estudante com comprovante; combo de 3 matérias; preço menor no primeiro mês; passe anual como oferta principal (melhor previsibilidade de caixa e menor churn).

**Regra de ouro:** o preço da matéria avulsa multiplicado por 3 deve ficar próximo do passe completo. Se ficar muito abaixo, ninguém compra o passe; muito acima, ninguém compra avulso.

---

## 8. Pagamentos

**Meios aceitos:** Pix e cartão de crédito. Sem boleto, sem carteiras digitais na v1 (decisão do produto).

### 8.1 Como cada meio funciona no sistema

| Meio | Uso | Recorrência | Observação |
|---|---|---|---|
| **Pix (QR + copia-e-cola)** | compra avulsa de período | não | Liberação em segundos via webhook. Menor custo por transação. Ideal para o público sem cartão. |
| **Cartão de crédito** | assinatura | sim, automática | Exige tokenização. Nunca armazenar o número do cartão (PCI-DSS SAQ-A: o gateway captura). |
| **Pix Automático** | assinatura sem cartão | sim, automática | Disponível no Brasil desde junho de 2025 e em crescimento acelerado. **É o principal desbloqueio para este público** — grande parte dos estudantes não tem cartão de crédito. |

### 8.2 Escolha de gateway

Faixas indicativas de mercado (confirmar na negociação — variam por volume e mudam com frequência):

| Gateway | Pix | Cartão | Recorrência | Split |
|---|---|---|---|---|
| Asaas | ~R$ 0,49 por transação | ~2,99% | avançada | sim |
| Pagar.me | variável | ~3,19% | sim | nativo e robusto |
| Iugu | variável | a partir de ~2,49% | avançada | sim |
| Mercado Pago | ~0,99% | ~4,99% | básica | sim |
| Stripe | variável | ~3,99% + R$ 0,39 | avançada | Connect |

**Recomendação:** **Asaas** ou **Pagar.me**. O critério decisivo não é a taxa, é o **split de pagamento** — com professores convidados recebendo percentual, o repasse automático na liquidação evita virar rotina manual de transferência e reduz risco fiscal. Confirmar antes de fechar: (a) suporte a Pix Automático via API, (b) split com retenção, (c) qualidade dos webhooks e reenvio em falha.

**Decidido em setembro/2026, pelo item (b): Asaas.** A verificação feita para o §5.10 mostrou que o Asaas é o único dos dois com retenção programável documentada — a **Conta Escrow**, com prazo por subconta (`daysToExpire`) e liberação automática, manual por API ou por desabilitação. É o que protege o reembolso de 7 dias do CDC num modelo com split, e o que evita que o estorno caia na conta principal, que o Asaas define como **garantidora do saldo negativo da subconta**. O Pagar.me oferece controle mais fino de responsabilidade (`options.liable` transfere o chargeback ao recebedor), mas sem caminho público de retenção com liberação manual. Requisitos que passam a ser condição de contrato: **operação em CNPJ** (subconta exige PJ) e **homologação antecipada** para sair dos limites do período de avaliação regulatória.

### 8.3 Requisitos transversais de pagamento
- Webhook idempotente (o mesmo evento pode chegar duas vezes — nunca liberar duas licenças).
- Fila com retentativa para eventos de pagamento; nada de processar direto no request.
- Conciliação diária entre pedidos do sistema e liquidação do gateway.
- Emissão de NFS-e (ISS municipal) — verificar obrigação no município da empresa.
- Antifraude e política de chargeback no cartão.
- Cupons de desconto com regras: validade, limite de uso, escopo (matéria específica ou geral), primeiro pagamento ou recorrente.

---

## 9. Identidade e diretrizes de UX

O pedido é "visual descontraído". Traduzindo em regras aplicáveis:

**Tom de voz** — segunda pessoa, frases curtas, zero juridiquês desnecessário. O conteúdo é sério; o tom não precisa ser solene. Humor contido, nunca infantilizado — o aluno está pagando para levar a matéria a sério.

**Requisito confirmado pelo responsável: site e sistema adaptados a equipamentos mobile.** Isso vale para as três frentes:

| Frente | Exigência mobile |
|---|---|
| **Site público** | Responsivo completo — catálogo, blog, vade-mécum e checkout funcionam integralmente no celular; Pix por copia-e-cola e QR |
| **Área do aluno** | **Mobile-first**: player em tela cheia com legendas, resumo legível, exercícios com alvos de toque generosos, vade-mécum lateral vira painel deslizante (bottom sheet) no celular |
| **Sistema (admin e professor)** | Responsivo — as tarefas do dia a dia (aprovar aula, conceder licença, ver métricas, responder aluno) executáveis do celular; tarefas pesadas (upload de vídeo, edição longa) otimizadas para desktop, mas não bloqueadas no mobile |

**Interface**
- **Mobile-first, sem negociação.** O aluno estuda no celular, em deslocamento, muitas vezes sem som — daí a importância de legendas e do resumo em texto.
- Testar em aparelhos de entrada e rede 3G/4G limitada: vídeo com qualidade adaptativa (HLS), páginas leves, imagens comprimidas. O público-alvo nem sempre tem flagship com Wi-Fi.
- O caminho para "app" já está no roadmap: PWA instalável com download offline na Fase 3 — sem app nativo antes disso.
- Aulas curtas e progresso sempre visível (barra por matéria, não só por aula).
- Cor e ilustração leves; hierarquia tipográfica forte para textos longos de lei.
- Estados vazios que ensinam ("você ainda não errou nenhuma questão — quando errar, ela aparece aqui para revisar").
- **Acessibilidade WCAG 2.1 AA:** contraste, navegação por teclado, legendas em todo vídeo, alvos de toque adequados.

**Cuidado regulatório com gamificação:** o ECA Digital restringe design manipulativo dirigido a menores (recompensa variável, notificação persistente, gamificação excessiva). Streaks e badges leves, sim; mecânica de vício, não.

---

## 10. Arquitetura técnica proposta

Escolhida para caber no seu ambiente atual (Docker Compose no WSL2, ao lado das stacks `appluz-dev` e `teiaflow`) e para operar com pouca manutenção.

```
[Next.js 15 App Router]  →  páginas públicas em SSG/ISR (SEO) + área logada em SSR
        │
        ├── API (rotas Next ou NestJS separado)
        ├── PostgreSQL 16      — dados, licenças, progresso, busca full-text pt-BR
        ├── Redis              — sessão, cache, rate limit
        ├── BullMQ             — webhooks, e-mails, ingestão de leis, transcodificação
        ├── Cloudflare R2 / S3 — PDFs e materiais
        ├── Panda Video        — hospedagem e proteção de vídeo
        └── Gateway (Asaas/Pagar.me) — Pix, cartão, Pix Automático, split
```

**Decisões e porquês**
- **Next.js** — o site público precisa ranquear no Google; SSG/ISR resolve isso sem stack separada.
- **PostgreSQL com `tsvector` em português** cobre a busca do vade-mécum no MVP; Meilisearch só se o acervo e o volume justificarem.
- **Vídeo no Panda Video** — plataforma brasileira, cobrança em real, com marca d'água dinâmica, anti-download e controle de domínio prontos. Cloudflare Stream é mais barato, mas exigiria construir a proteção. Para conteúdo pago, a proteção pronta vale a diferença.
- **Autenticação** — e-mail + senha, magic link e Google. 2FA obrigatório para admin e professor.
- **Proteção de vídeo — REQUISITO formal do responsável: bloqueio de download, com marca d'água.** Solução em camadas (nenhuma camada sozinha basta; juntas tornam a pirataria cara e rastreável):

| Camada | Mecanismo | O que impede |
|---|---|---|
| 1. Streaming, nunca arquivo | Vídeo servido em **HLS com URLs assinadas e expiração curta** (minutos); nenhum MP4 exposto | Download direto pelo link e compartilhamento de URL |
| 2. Criptografia | HLS com chave criptografada (AES-128 / DRM do provedor) entregue só a sessão autenticada | Captura do stream por ferramentas de download (yt-dlp e similares) |
| 3. Player protegido | Player sem botão de download, bloqueio de clique direito, domínio restrito (o vídeo só toca no site) | Embed do vídeo em outros sites e download casual |
| 4. **Marca d'água dinâmica visível** | Nome + CPF parcial do aluno **sobrepostos ao vídeo em posição móvel**, renderizados por sessão | Regravação de tela: o vídeo vazado identifica quem vazou — dissuasão principal |
| 5. Marca d'água forense (quando disponível no provedor) | Identificador invisível embutido no stream por sessão | Rastreio de vazamento mesmo com a marca visível recortada |
| 6. Controle de sessão | Limite de sessões simultâneas e de dispositivos por conta; detecção de uso anômalo (IPs distantes no mesmo horário) e bloqueio progressivo | Conta compartilhada |

  - **Implantação:** as camadas 1–4 são atendidas por provedor especializado (Panda Video entrega URLs assinadas, anti-download, domínio restrito e marca d'água dinâmica prontos — critério decisivo da escolha em vez do Cloudflare Stream). A camada 5 depende do plano do provedor; a 6 é do nosso sistema.
  - **Termos de uso:** cláusula expressa proibindo captura/redistribuição, com previsão de suspensão da conta e responsabilização — a marca d'água é o que torna a cláusula aplicável na prática.
  - **Limite honesto:** nenhuma solução impede 100% a regravação de tela; o objetivo é tornar o vazamento **identificável** (marca com dados do aluno) e **caro** (esforço técnico), o que na prática reduz a pirataria a nível residual.
  - **Materiais de apoio (PDFs):** download é permitido por natureza; recebem carimbo com nome/e-mail do aluno na geração.
- **Deploy** — Docker Compose em VPS, coerente com o que você já opera. Ambientes: dev (WSL2) · staging · produção. CI/CD por GitHub Actions. Backup diário do Postgres **com teste de restauração** (backup não testado não é backup).
- **Observabilidade** — Sentry, logs estruturados, monitor de uptime, alerta em falha de webhook de pagamento.

**Custo de infraestrutura estimado no MVP:** cerca de R$ 200 a R$ 450/mês (VPS, vídeo, e-mail transacional, domínio), mais as taxas por transação do gateway. Valor indicativo, a confirmar.

---

## 11. Modelo de dados (entidades principais)

| Domínio | Entidades |
|---|---|
| **Identidade** | `usuario`, `perfil` (aluno/professor/revisor/admin), `professor`, `sessao`, `dispositivo` |
| **Catálogo** | `area`, `materia`, `assunto`, `aula`, `aula_versao`, `video`, `material_apoio`, `tag` |
| **Exercícios** | `exercicio`, `questao`, `alternativa`, `tentativa`, `resposta`, `caderno_erros` |
| **Legislação** | `norma`, `dispositivo` (artigo/parágrafo/inciso), `vinculo_aula_dispositivo`, `favorito`, `anotacao` |
| **Comercial** | `plano`, `preco`, `cupom`, `campanha_promocional`, `resgate`, `pedido`, `pagamento`, `assinatura`, **`licenca`**, `reembolso` |
| **Progresso** | `progresso_aula`, `progresso_materia`, `evento_aprendizagem` |
| **Plano de ensino** | `diagnostico` (respostas de perfil e nivelamento), `plano_estudo`, `plano_item` (aula/exercício, ordem, semana prevista, status) |
| **Repasse** | `contrato_professor` (modelo cachê/comissão, percentual, vigência), `apuracao`, `apuracao_item` (venda a venda), `repasse`, `nota_fiscal_professor` |
| **Publicidade** | `anunciante`, `campanha_publicitaria`, `peca` (criativo, formato), `insercao` (posição × período), `metrica_peca` (impressões, cliques) |
| **Vagas** | `vaga` (status: `rascunho → em_moderacao → publicada → pausada → expirada → removida`; `publicada_em`, `expira_em` ≤ 3 meses), `denuncia_vaga` |
| **Empresa (§5.11)** | `portal.tipo`, `portal_gestor`, `setor`, `convite`, `atribuicao`, `avaliacao`, `tentativa_avaliacao`, `conclusao`, licença de origem `B2B` |
| **Futuro previsto** | `afiliado` + origem no `pedido` (§12-B) |
| **Governança** | `log_auditoria`, `solicitacao_titular` (LGPD), `consentimento` |

**Entidade `licenca` — o coração do sistema:**

```
licenca
  id
  usuario_id
  escopo          ENUM: CATALOGO | MATERIA
  materia_id      (nulo quando escopo = CATALOGO)
  origem          ENUM: TRIAL | COMPRA | PROMOCIONAL | CORTESIA | MIGRACAO
  campanha_id     (nulo exceto quando origem = PROMOCIONAL)
  status          ENUM: PENDENTE | ATIVA | EM_ATRASO | SUSPENSA | CANCELADA | EXPIRADA
  inicio_em
  fim_em
  assinatura_id   (nulo em compra avulsa)
  cota            JSON — limites do trial (aulas, exercícios)
  criada_em / atualizada_em
```

Separar `assinatura` (contrato de cobrança recorrente) de `licenca` (direito de acesso vigente) é o que permite Pix avulso, cortesia, trial, promocional e cartão recorrente coexistirem sem gambiarra.

**Entidade `campanha_promocional`:**

```
campanha_promocional
  id
  nome / codigo            (código de resgate, quando aplicável)
  tipo_concessao   ENUM: CODIGO | MANUAL | EVENTO
  modalidade       ENUM: GRATUITA | DESCONTO
  materia_id
  duracao_acesso           (período que a licença concede)
  desconto_percentual      (nulo quando GRATUITA)
  gatilho          JSON    (regra do evento, quando tipo = EVENTO)
  max_resgates / resgates_usados
  valida_de / valida_ate
  criada_por / status
```

**Estado da conta (`usuario.status_conta`):** `ATIVA | INATIVA_AVISO | BLOQUEADA_INATIVIDADE | ENCERRADA`, com `ultimo_login_em` como base do relógio de inatividade (§6.5) — um job diário varre e transiciona os estados.

---

## 12. Conformidade e riscos jurídicos

### 12.1 LGPD
- **Bases legais:** execução de contrato (conta, pagamento, entrega da aula) · legítimo interesse (métricas agregadas, antifraude) · consentimento (marketing e cookies não essenciais).
- **Encarregado (DPO)** nomeado, com canal de contato publicado.
- **Direitos do titular:** portal para acesso, correção, exclusão, portabilidade e revogação, com prazo de resposta controlado.
- **Minimização:** não pedir CPF no cadastro — só na compra (para NF e marca d'água).
- **Retenção e descarte:** prazos definidos por tipo de dado; anonimização após exclusão de conta, preservando o mínimo exigido pela legislação fiscal. O bloqueio por inatividade (§6.5) é o primeiro estágio dessa política: conta bloqueada há mais tempo que o prazo definido entra na fila de anonimização, com aviso prévio.
- **Banner de cookies** com recusa tão fácil quanto o aceite; analytics não essencial só após consentimento.
- **Contrato de operador** com gateway, hospedagem de vídeo e e-mail.

### 12.2 Menores de idade (ECA Digital)
**Decisão do responsável: a plataforma atenderá também menores de idade** (ex.: vestibulandos e adolescentes interessados). Com isso, as obrigações do ECA Digital vigentes em 2026 deixam de ser risco a evitar e viram **requisitos do sistema**:

- **Verificação de idade** que vá além da autodeclaração — data de nascimento + validação por CPF é o mínimo; avaliar serviço de verificação na compra.
- **Consentimento do responsável legal** para cadastro de menor de 18 anos, com fluxo próprio (e-mail/aceite do responsável) e registro do consentimento.
- **Compra sempre pelo responsável:** menor não contrata; o meio de pagamento e a NF ficam no CPF do adulto responsável.
- **Privacy by design:** perfil privado por padrão, sem compartilhamento de dados de menores com terceiros, analytics mínimo.
- **Proibição de publicidade comportamental dirigida a menores** — o modelo de receita já é assinatura, o que ajuda; remarketing e pixels de anúncio não podem ser aplicados a contas de menores.
- **Design não manipulativo:** sem recompensa variável, notificação persistente ou gamificação de vício para esse público (reforça §9).
- Se a base de menores crescer muito (limiar legal de 1 milhão de usuários menores), há obrigação de **relatórios semestrais** — distante do MVP, mas registrado.

**Impacto no escopo:** o fluxo de cadastro ganha ramificação por idade e consentimento parental já na Fase 1 (ou, alternativa mais barata: lançar o MVP 18+ e habilitar o fluxo de menores na Fase 2, quando o produto estiver validado — a decidir no planejamento da Fase 1).

### 12.3 Consumidor
Já detalhado em §6.5: arrependimento em 7 dias, cancelamento fácil com protocolo, oferta que vincula, informação completa antes da compra (CNPJ, endereço, carga horária, prazo de acesso, preço total, política de reembolso).

### 12.4 Propriedade intelectual
- **Aulas** — contrato com cada professor convidado definindo cessão ou licença de uso, prazo, exclusividade e remuneração. Sem contrato assinado, não publica.
- **Lei e jurisprudência** — livres de direito autoral (Lei 9.610/98, art. 8º, IV). Reprodução permitida; a obrigação é de exatidão.
- **Doutrina** — protegida. Citação apenas dentro dos limites do art. 46 da mesma lei, com atribuição.
- **Imagens e trilhas** — só de banco licenciado ou próprias.
- **Marca** — registrar no INPI (classe 41). Atenção: "Aprimore o Saber" tem carga descritiva (o verbo remete direto ao serviço de ensino), o que traz algum risco de indeferimento por falta de distintividade — menor que o do nome anterior, "Aprendendo o Direito", mas não nulo. **Registrar como marca mista** (nome + logo) melhora a chance. Verificar disponibilidade antes de investir em identidade visual.

### 12.5 Publicidade profissional
Se o responsável for advogado inscrito na OAB, as regras de publicidade da entidade se aplicam. Conteúdo educacional é permitido; o cuidado é não misturar a plataforma com captação de clientela para escritório.

### 12.6 Certificação
Curso livre não exige credenciamento do MEC, e o certificado emitido é de curso livre. Isso precisa estar dito com todas as letras na página de vendas — prometer mais do que isso é publicidade enganosa.

---

## 12-B. Oportunidades adicionais (selecionadas pelo responsável)

Soluções propostas além do escopo original, aprovadas para o discovery. Todas reutilizam infraestrutura já planejada — nenhuma exige retrabalho se o modelo de dados nascer preparado:

### B.1 Licenças patrocinadas (B2B)
Faculdade, empresa ou patrocinador compra **lotes de licenças** para seus alunos/funcionários. Painel do parceiro com convites por e-mail/código, relatório agregado de uso (sem dados individuais além do consentido) e renovação por contrato. É a ponte natural entre a publicidade (§5.7) e o licenciamento (§6): o anunciante de hoje é o comprador B2B de amanhã. Tecnicamente é a entidade `licenca` com origem nova (`B2B`) + entidade `contrato_b2b` — por isso vale prever agora. **Fase 3.**

**Atualização de 04/09/2026:** promovida a produto em autosserviço — o **Portal da Empresa** (§5.11), que reaproveita o tenant do portal do professor em vez de criar `contrato_b2b`. Enterprise continua por proposta.

### B.2 Programa de afiliados
Alunos, professores e influenciadores divulgam com link/cupom próprio e ganham comissão por venda. **Reutiliza integralmente o motor de fechamento de contas do professor** (§5.6.1): apuração mensal, extrato, mínimo de saque, NF. Prevista no modelo: entidade `afiliado` + rastreio de origem no `pedido`. **Fase 2–3**, após o fechamento estar rodando bem para professores.

### B.3 Mural de vagas e estágios — promovido a requisito
Virou funcionalidade definida do site (§5.7.1): publicação **gratuita e em autosserviço** por escritórios e empresas, com aprovação prévia, gestão pelo anunciante e vigência máxima de 3 meses. **Fase 2.** A monetização por destaque pago permanece como oportunidade futura.

### B.4 Eventos ao vivo patrocinados
Aulões e webinars gratuitos com marca do patrocinador ("Aulão de véspera de OAB oferecido por X"). Gera lead qualificado para o patrocinador (inscritos que consentirem) e cadastro para a plataforma; a gravação vira conteúdo do catálogo depois. Operacionalmente simples: transmissão via ferramenta externa (YouTube unlisted/Zoom) com página de inscrição própria. **Fase 2–3**, pode ser testado manualmente antes de virar funcionalidade.

**Sequência sugerida:** B.4 (teste manual barato) → B.2 (afiliados, motor já pronto) → B.1 e B.3 (exigem força comercial B2B).

---

## 13. Métricas de sucesso

| Métrica | O que mede | Meta inicial |
|---|---|---|
| Ativação | % de cadastros que assistem à 1ª aula em 24h | ≥ 60% |
| Conversão trial → pago | eficácia do teste gratuito | 8% a 15% |
| Churn mensal | retenção da assinatura | < 8% |
| Conclusão de aula | qualidade e duração do conteúdo | > 70% |
| Exercícios por aluno ativo/semana | engajamento real com a prática | ≥ 15 |
| LTV / CAC | sustentabilidade da aquisição | > 3 |
| Tráfego orgânico | eficácia do conteúdo aberto e do vade-mécum | crescimento mês a mês |
| Receita de publicidade | ocupação das posições e ticket médio por anunciante | fila de anunciantes ≥ posições a partir da Fase 2 |
| NPS | satisfação | > 50 |

**Instrumentação mínima no MVP:** eventos de cadastro, início e conclusão de aula, resposta de exercício, início e fim de trial, checkout iniciado e concluído, cancelamento. Sem isso, não há como decidir nada depois.

---

## 14. Roadmap por fases

### Fase 0 — Validação (2 a 3 semanas, antes de escrever código de produto)
Entrevistar 10 estudantes · publicar landing de captura de e-mail · gravar 3 aulas piloto e medir conclusão · testar disposição a pagar com preço real (pré-venda) · registrar domínio e verificar a marca no INPI.
**Critério para seguir:** 3 das 10 pessoas dizem que pagariam, e pelo menos 1 paga na pré-venda.

### Fase 1 — MVP (10 a 14 semanas de desenvolvimento)
**1ª onda do catálogo: 3 a 5 das 11 matérias definidas (§4)** — o aluno escolhe livremente entre elas; as demais entram em ondas quinzenais/mensais pós-lançamento, com lista de espera/votação ordenando a fila. Site público com catálogo e blog · cadastro e login · player com resumo, materiais e exercício de múltipla escolha · vade-mécum com busca e painel lateral na aula · trial de 7 dias · licença por matéria e passe completo · concessão manual de promocional e bloqueio por inatividade · Pix e cartão · painel do aluno com cancelamento · admin básico · páginas legais completas.
**Fora do MVP:** multi-professor com fechamento de contas, publicidade, split, diagnóstico/plano de ensino, motor de campanhas, simulados, certificados, gamificação, app. (A "página Anuncie aqui" estática com formulário de contato pode entrar já no MVP para começar a formar fila de anunciantes.)

### Fase 2 — Escala (8 a 10 semanas)
Painel de autoria e fluxo editorial · **cadastro completo de professores com contrato e fechamento de contas mensal (§5.6)** · **frente publicitária: mídia kit, gestão de anunciantes e primeiras posições (§5.7)** · **diagnóstico de perfil/nivelamento e plano de ensino sugerido (§5.8)** · Pix Automático · simulados cronometrados · cupons e **campanhas promocionais completas** (códigos, concessão automática por evento) · caderno de erros · **ondas restantes das 11 matérias do catálogo** · **mural de vagas e estágios: gratuito, autosserviço, aprovação prévia, vigência máx. 3 meses (§5.7.1)** · eventos ao vivo patrocinados (teste manual) · programa de indicação.

*Nota:* a concessão **manual** de licença promocional pelo admin e o bloqueio por inatividade são simples e já entram na **Fase 1**; o motor de campanhas (códigos e gatilhos automáticos) fica para a Fase 2.

### Fase 3 — Diferenciação
Revisão espaçada · trilhas por objetivo (faculdade, OAB, concurso) · tutor de IA ancorado no vade-mécum e nas aulas · certificados · PWA com download para consumo offline · **licenças patrocinadas B2B com painel do parceiro (§12-B.1)** · **programa de afiliados (§12-B.2)** · destaque pago no mural de vagas · área institucional para faculdades.

**Nota de realismo:** com 5 a 15 horas por semana e execução solo, a Fase 1 leva de 6 a 9 meses de calendário só de desenvolvimento — e o lançamento com **3 a 5 matérias completas multiplica a carga de produção de conteúdo** (a grosso modo, 40 a 100 aulas com exercícios). Isso torna quase obrigatório antecipar os professores convidados: fechar 2 a 4 parceiros na Fase 0/1 para produzirem matérias em paralelo (mesmo que o painel de autoria só chegue na Fase 2 — o conteúdo pode ser recebido e publicado pelo admin). Alternativas: contratar apoio pontual de desenvolvimento para liberar seu tempo para conteúdo, ou lançar no limite inferior (3 matérias).

---

## 15. Riscos e mitigação

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| 1 | **Produção de conteúdo trava o projeto** — lançar com 3 a 5 matérias multiplica a carga de gravação | Crítico | Antecipar professores convidados (2 a 4 parceiros produzindo em paralelo desde a Fase 0/1), roteiro padronizado, gravação em lote, e lançar no limite inferior (3 matérias) se preciso |
| 2 | **Pirataria** — vídeo redistribuído | Alto | Requisito formal atendido pela proteção em 6 camadas do §10: streaming assinado, criptografia, player protegido, marca d'água visível e forense, controle de sessão |
| 3 | **Vade-mécum desatualizado** — lei muda e o aluno estuda errado | Alto | Rotina automática de atualização, carimbo de data visível, aviso destacado de alteração recente |
| 4 | **Churn alto** — assinatura de estudante é volátil | Alto | Priorizar planos semestral e anual, conteúdo novo constante, revisão espaçada como gancho de retorno |
| 5 | **Concorrência de grandes players** | Médio | Não competir em catálogo. Competir em preço por matéria, linguagem acessível e integração com a lei |
| 6 | **Dependência de professor convidado** | Médio | Contrato com prazo e cessão claros; nunca deixar uma matéria inteira nas mãos de um único autor sem contrato |
| 7 | **Pix avulso não renova** — receita cai no vencimento | Médio | Régua de lembretes D-7/D-3/D-0 e adoção de Pix Automático na Fase 2 |
| 8 | **Complexidade do licenciamento** gera bug de acesso | Médio | Testes automatizados cobrindo toda a matriz de escopo × status × vigência antes do lançamento |
| 9 | **Conformidade com menores** (ECA Digital) falha ou incompleta | Alto | Verificação de idade + consentimento parental como requisito de Fase 1/2; compra sempre no CPF do responsável; sem publicidade comportamental |
| 10 | **Marca descritiva** indeferida no INPI | Baixo | Registro como marca mista; verificar antes de investir na identidade |
| 11 | **Conflito de interesse na publicidade** — anunciar cursos concorrentes ou conteúdo enganoso | Médio | Curadoria editorial em contrato, direito de recusa, identificação obrigatória de publicidade (CDC art. 36) |
| 12 | **Disputa com professor sobre comissão** — e, no portal (§5.10.1), sobre quem trouxe o aluno | Médio | Contrato com percentual e critério de rateio explícitos, extrato venda a venda, prazo formal de contestação na apuração. No acréscimo por indicação: vínculo gravado no clique e imutável pelo professor, com data de origem visível no extrato dele |
| 13 | **Vaga falsa ou golpe no mural** expõe alunos | Médio | Aprovação prévia obrigatória, CNPJ validado, denúncia pelo aluno, disclaimer de responsabilidade do anunciante, expiração automática em 3 meses |
| 14 | **Vazamento entre portais** — falha na resolução de tenant mostra acervo ou aluno de um portal a outro (§5.10) | Crítico | **Escrita já protegida no banco** por `db/018_portal.sql`: chaves compostas `(pai_id, portal_id)` tornam impossível pendurar conteúdo, licença ou pedido de um portal em outro. Falta o lado da **leitura** — escopo aplicado na camada de consulta, nunca só na de exibição, com suíte de testes por tenant tão rigorosa quanto a do motor de licença |
| 15 | **Split libera o dinheiro antes do prazo de arrependimento** — reembolso do CDC ou chargeback chega depois de o professor já ter sacado (§5.10) | Alto | Retenção e reserva parametrizadas no contrato do portal; fallback de débito na apuração seguinte (§5.6.1); confirmar com o gateway antes de assinar |
| 16 | **Conteúdo de terceiro publicado direto no nosso domínio** — ilícito, plágio ou propaganda enganosa em portal de professor (§5.10) | Alto | Declaração contratual de titularidade, identificação do responsável em cada portal, canal de denúncia, remoção rápida após notificação e direito de desligamento imediato |
| 17 | **Dois produtos disputando a mesma capacidade de execução** — portal do professor em paralelo à Fase 1, que o §16 já estima em 6 a 9 meses | Crítico | Piloto fechado com um único professor e escopo congelado; contrato assinado antes de escrever código; adiar tudo que estiver na lista "fora do escopo" do §5.10 |

---

## 16. Decisões pendentes

Estas travam o detalhamento e precisam de resposta antes da Fase 1:

1. **Ordem das ondas de lançamento** — o catálogo das 11 matérias está definido (§4); falta ordenar quais 3 a 5 abrem a 1ª onda e a sequência das demais. Sugestão de 1ª onda: Introdução ao Direito, Carreiras Jurídicas e Noções de Constitucional (porta de entrada + maior busca), validar na Fase 0.
2. ~~**CNPJ ou pessoa física?**~~ **RESPONDIDA (set/2026): CNPJ.** Não por preferência, mas por exigência: o portal do professor (§5.10) depende de subcontas no gateway, e *"contas de pessoa física (CPF) não podem criar subcontas"* por regra do Banco Central. Permanece em aberto apenas o desdobramento tributário (regime e emissão de NF).
3. **Modelo de remuneração dos professores convidados** — cachê fixo por aula ou percentual da receita da matéria? Muda o desenho do split.
4. **Certificado de conclusão** entra em qual fase, e com qual carga horária declarada?
5. **Público-alvo primário** — graduando, candidato à OAB ou leigo? A resposta muda tom, formato da aula e estilo do exercício.
6. **Orçamento e disponibilidade real** para a Fase 1 — determina se o caminho é solo, apoio pontual ou redução de escopo.
7. **Nome definitivo** — confirmar disponibilidade da marca e do domínio antes de qualquer investimento em identidade visual.
8. **Quando entra o fluxo de menores** — cadastro com consentimento parental já na Fase 1, ou MVP 18+ com o fluxo habilitado na Fase 2? (O atendimento a menores está decidido; o timing, não.)
9. **Prazo de anonimização após bloqueio por inatividade** — sugestão de 24 meses de conta bloqueada antes de anonimizar os dados; confirmar o prazo.
10. **Tabela de preços da publicidade** — valores por posição/formato/período para o mídia kit; definir quando houver os primeiros números de audiência.
11. **Percentuais de comissão dos professores** — faixa padrão a ofertar em contrato (mercado pratica de 20% a 50% conforme exclusividade e produção); definir antes de fechar os primeiros parceiros.
12. ~~**Retenção no split (§5.10)**~~ **RESPONDIDA (set/2026): sim, via Conta Escrow do Asaas.** Retenção por subconta com prazo próprio (`daysToExpire`) e liberação automática, manual por API ou por desabilitação; sem ela, o estorno recai sobre a conta principal, que o Asaas define como garantidora. Ver §5.10 e §8.2. Resta negociar **o custo recorrente da Conta Escrow por subconta** e obter **homologação regulatória** antes do primeiro portal, para escapar do teto de R$ 2.000 por subconta do período de avaliação.
13. ~~**Valores do portal do professor**~~ **RESPONDIDA (03/09/2026): R$ 149/mês + 10% sobre as vendas** (mais os 5 p.p. de indicação do §5.10.1), com **100 GB de armazenamento e 300 GB de banda/mês** inclusos e **excedente a R$ 0,40/GB**. Decidida sobre o levantamento de custo do §5.10.3; aplicada em `db/023_plano_lancamento.sql`. Um segundo plano de volume (R$ 249 + 8%) entra quando existir portal grande.
14. **Quem é o vendedor perante o aluno do portal** — com split, a plataforma normalmente figura como intermediadora. Definir quem emite a nota ao aluno final, quem responde ao Procon e o que exigimos de KYC do professor para abrir a subconta (CPF ou CNPJ, documentos, prazo).
15. **Política da máscara** — regras de escolha do subdomínio (lista de nomes proibidos, colisão com rotas do sistema, marcas de terceiros), se há aprovação manual, e o que acontece com o endereço após o encerramento (prazo de reserva e destino da URL antiga).
16. **Saída do professor** — prazo para exportar vídeos e base de alunos, prazo até a eliminação definitiva no nosso lado, e o que acontece com os alunos de licença vigente quando o portal encerra. Precisa estar no contrato antes do primeiro cliente, não depois.
17. **Comissão do professor na venda pela NOSSA vitrine (§5.10.2, etapa 5)** — quanto ele recebe quando um aluno da plataforma compra o curso dele. O sistema nasceu com **50%** (`portal_plano.comissao_vitrine_pp`, copiada ao contrato no aceite) como hipótese: nós arcamos com gateway, marketing e suporte, ele com a produção. A faixa de mercado do §16.11 (20 a 50%) vale de referência. Definir antes de o primeiro curso compartilhado ir à vitrine.
    **Proposta de 04/09/2026 (para ser mais atraente que Hotmart e Udemy):** **60% para o professor** na venda pela vitrine, e **70% nos 3 primeiros meses** do piloto (contrato com vigência de 90 dias, trocado depois por um de 60% — o admin já registra contratos com vigência; não há código). Comparação que se põe na mesa: a Udemy paga **37%** ao instrutor quando a venda vem do marketplace dela; na Hotmart, o produtor que depende de afiliado para vender cede 40–50% ao afiliado e ainda paga 9,9% + R$ 1 — fica com ~40–45%. Aqui, quem traz o aluno somos nós, e ele ainda fica com 60%. Margem nossa numa venda de R$ 39,90 por Pix: R$ 13,97 (35%) a 60%; R$ 9,98 a 70% — o tráfego do vídeo é do portal dele (cota que ele já paga). O argumento completo para o professor: **90% no portal dele** (Hotmart 90,1% − R$ 1, Udemy 97% mas sem site próprio, sem player protegido e sem exercícios) **e 60% quando a plataforma vende por ele**, pago até o dia 15 do mês seguinte com extrato venda a venda.
18. **Preço do domínio próprio — DECIDIDO em 04/09/2026:** opção B do §5.10.3 — R$ 29,90/mês no plano de lançamento, incluído no plano C. Aplicado por `db/030`; muda-se no admin (Planos), sem código.
19. **Planos da empresa em autosserviço (§5.11)** — Starter (R$ 380/mês, até 50 contas) e Pro (R$ 890/mês, até 250 contas, domínio próprio incluído) são os valores de referência da vitrine; confirmar antes de semear em `portal_plano`. Cotas de GB sugeridas iguais às do professor (100 GB + 300 GB/mês). **Endereço:** todo portal tem subdomínio, inclusive o Starter (a vitrine hoje anuncia "subdomínio exclusivo" só no Pro — corrigir). Decidir se o Starter oferece domínio próprio como extra pago (R$ 29,90, como o professor) ou não oferece; o Pro inclui.
20. **Teste gratuito para empresa** — o plano nasce pagando, como o professor. Se a conversão pedir, um período de avaliação de 14 dias sem cartão entra depois; decidir com os primeiros leads de `interesse_empresa`.
21. **Carga horária e validade do certificado corporativo** — soma da duração dos vídeos, arredondada para cima em horas, sem validade; confirmar com o primeiro cliente se o RH precisa de reciclagem periódica (validade + reatribuição automática).
22. **Provedor de e-mail transacional** — SES ou Resend; decidir antes da etapa 4 do §5.11, que o usa para convites e lembretes.
23. **Tipos penais da v1 da Calculadora Penal (§5.12)** — fechar a lista de 40 a 60 tipos do Código Penal que entram primeiro, com a Lei de Drogas e a Maria da Penha. Sugestão: os tipos das aulas de Penal já publicadas mais os dez mais cobrados na 2ª fase da OAB.
24. ~~**Nome da ferramenta**~~ **RESPONDIDA na implantação (05/09/2026): "Calculadora Penal"**, em `/calculadora-penal`. Muda-se num lugar só (`FERRAMENTAS`, em `app/componentes.tsx`) se a decisão for outra.
25. **Revisão jurídica externa antes do lançamento** — quem confere o catálogo e os casos-referência: um professor de Penal da casa, em troca de crédito na tela, ou revisão paga. Decide se a ferramenta sai como "beta" ou como produto.
26. **Gratuita ou parte do plano** — o plano parte de gratuita e pública (porta de entrada, como o vade-mécum), com o histórico salvo só para quem tem conta. A alternativa é liberar só o resultado resumido ao visitante e a memória de cálculo ao assinante — decidir com os primeiros números de uso.

---

## Fontes consultadas

- [Comparativo de gateways de pagamento no Brasil 2026 — Mind Group](https://mindconsulting.com.br/2026/07/gateways-pagamento-online-brasil-comparativo-2026/)
- [Pix Automático: análise de dados do 1º trimestre — PagBrasil](https://www.pagbrasil.com/pt-br/blog/pagamento-recorrente/pix-automatico-2026/)
- [Panda Video vs. Vimeo — comparativo oficial](https://www.pandavideo.com/br/compare/panda-vimeo)
- [Dados abertos do LexML — Projeto LexML / Senado Federal](https://projeto.lexml.gov.br/transparencia/dados-abertos)
- [Cursos online sem ciladas: direitos do consumidor no EAD](https://codigoalpha.blog/cursos-online-direitos-do-consumidor-ead/)
- [LGPD na educação em 2026: o impacto do ECA Digital — Confidata](https://confidata.com.br/blog/lgpd-educacao-2026-impacto-eca-digital)
- [Split de pagamento — documentação do Asaas](https://docs.asaas.com/docs/split-de-pagamentos)
- [Conta Escrow — documentação do Asaas](https://docs.asaas.com/docs/introducao-conta-escrow)
- [Criação de subcontas — documentação do Asaas](https://docs.asaas.com/docs/criacao-de-subcontas)
- [Termos e Condições de Uso — Asaas (responsabilidade da conta principal por saldo negativo de subconta)](https://central.ajuda.asaas.com/hc/pt-br/articles/32096847160859-Termos-e-Condi%C3%A7%C3%B5es-de-Uso)
- [Regras de split — documentação do Pagar.me](https://docs.pagar.me/reference/split-1)
- [Configurações de transferência do recebedor — Pagar.me](https://docs.pagar.me/reference/atualizar-informa%C3%A7%C3%B5es-de-transfer%C3%AAncia-1)
- [Preço do Bunny Stream — armazenamento e entrega](https://bunny.net/pricing/stream/)
- [Preços e taxas do Asaas](https://www.asaas.com/precos-e-taxas)
- [Conta Escrow do Asaas — o que é e quanto custa](https://central.ajuda.asaas.com/hc/pt-br/articles/34119457118875-O-que-%C3%A9-a-Conta-Escrow-do-Asaas)
- [Taxa da Hotmart em 2026 — EngagED](https://engaged.com.br/blog/taxa-hotmart-quanto-custa-vender/)
- [Hotmart ou Kiwify em 2026 — EngagED](https://engaged.com.br/blog/hotmart-ou-kiwify-qual-escolher/)
- [Cotação do dólar — Investing.com](https://br.investing.com/currencies/usd-brl)
