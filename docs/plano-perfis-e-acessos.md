# Perfis, credenciais e cadastro de usuários — planejamento (10/09/2026)

Pedido do responsável: a plataforma passa a ter perfis de operação
(Administrador, Financeiro, Suporte), dois regimes de professor (com e sem
página própria), dois regimes de empresa (com e sem página própria) e um
aluno que pode **usar a mesma credencial nos três ambientes** — plataforma,
página do professor e página da empresa — desde que e-mail e CPF/CNPJ
coincidam, ou ter acessos distintos com e-mails diferentes. Sobre isso:
ajustar todas as telas de login, e dar ao Administrador e ao Suporte uma
tela de cadastro de usuários com dados cadastrais, licenças e a criação de
contas para a plataforma, para professores e para empresas.

Este documento diz **o que já existe**, **o que falta**, **as decisões que
o pedido obriga a tomar** e **a ordem de construção**, no formato dos
outros planos em `docs/`.

---

## 1. O que já existe (levantado no código em 10/09/2026)

### 1.1 Identidade e sessão

| Peça | Onde | Estado |
|---|---|---|
| Papéis | `papel_usuario` (db/010, db/033): `aluno`, `professor`, `revisor`, `admin`, `gestor` | `revisor` existe no enum e não é usado em lugar nenhum |
| Conta **por portal** | `usuario.portal_id` (db/018); e-mail único **por portal** (`usuario_email_por_portal`) | Decisão do §5.10: "base de alunos separada por portal". É o oposto do que o pedido quer para o aluno |
| Senha | `usuario.senha_hash`, scrypt (`lib/auth.ts`) | Pronta |
| Sessão | `sessao` com hash do token; `usuarioPorToken(token, portalId)` só resolve se `u.portal_id = portalId` | Pronta e testada (`testes-e2e/separacao-de-bases.mjs` **afirma** que aluno da plataforma é recusado no portal do professor) |
| CPF | `usuario.cpf`, pedido só na compra (`garantirCpf`, §12.1) | Pronto; não é único, não é conferido no login |
| Quem cria o admin | só `scripts/criar-admin.mjs` | Não há tela |
| Esqueci a senha | não existe (sem e-mail transacional, §16.22) | Pendência transversal |

### 1.2 Perfis e onde cada um entra

| Perfil do pedido | Hoje | Lacuna |
|---|---|---|
| **Administrador** | `papel = 'admin'`, portal 0, `/admin` com guarda `exigirAdmin` em layout e em toda ação | — |
| **Financeiro** | não existe | Papel, permissões só de leitura, visão consolidada |
| **Suporte** | não existe | Papel, permissões de cadastro sem ações financeiras |
| **Professor COM página** | §5.10 completo: autosserviço, portal, painel `/professor`, financeiro, apuração | — |
| **Professor SEM página** | `criarProfessor` (admin) cria `papel = 'professor'` no portal 0, mas `/professor` exige portal e manda para `/para-professores`; o curso do portal 0 tem só `materia.professor` (texto) | Cadastro em autosserviço, autoria restrita aos próprios cursos, publicação com revisão, comissão sobre venda no catálogo |
| **Empresa COM página** | §5.11 completo: portal EMPRESA, `/empresa`, colaboradores, trilhas, atribuição → licença B2B, certificado | — |
| **Empresa SEM página** | não existe (`interesse_empresa` só capta lead) | Cadastro, compra de licenças do catálogo por quantidade, orçamento acima de 10, distribuição de vagas aos colaboradores |
| **Aluno** | conta por portal; compra na plataforma, no portal do professor, ou recebe B2B na empresa | Uma credencial para os três ambientes; cadastro alternativo com outro e-mail |

### 1.3 Telas de login e cadastro

`/entrar` (`app/entrar/page.tsx`, `app/FormAuth.tsx`) já serve **três
contextos** pelo endereço: plataforma (abas *Sou aluno* / *Sou professor*),
portal do professor (só aluno, com a "porta de serviço" que manda o
professor ao site principal) e portal da empresa (uma porta, sem cadastro).
`paginaInicial` (`lib/navegacao.ts`) decide o destino pelo papel. O que
falta ali é a aba da **empresa** (o gestor hoje entra pela aba de aluno e é
redirecionado), a entrada da **equipe da plataforma**, e — o principal — a
autenticação contra uma **credencial única** em vez da base do portal.

`/cadastrar` cria conta **no portal em que foi aberto**. Não sabe dizer
"esse e-mail já é seu na plataforma; entre com a mesma senha".

### 1.4 Retaguarda de cadastros

| Tela | Faz | Não faz |
|---|---|---|
| `/admin/alunos` | lista alunos do **portal 0**, busca por nome/e-mail, contagem de licenças vigentes | abrir, editar, criar; ver aluno de portal; ver CPF |
| `/admin/licencas` | concede cortesia, estende, suspende — portal 0 | filtrar por aluno; licenças de portal |
| `/admin/portais/[id]/alunos` | base de um portal, com aviso de LGPD | criar aluno ali; editar |
| `/admin/portais` | cria professor + portal (`criarProfessor`, `criarPortal`) | professor sem portal com painel; gestor de empresa sem portal |
| `/empresa/colaboradores` | RH cadastra, convida, importa CSV | — |
| Tela de **usuários** (todos os papéis, todos os portais) | **não existe** | criar equipe da plataforma, editar dados, senha provisória, status da conta, vínculos |

---

## 2. Decisões que o pedido obriga a tomar

### 2.1 A decisão central: credencial global, perfil por portal

O §5.10 decidiu "base separada por portal" e o banco foi construído sobre
isso: `licenca`, `pedido`, `assinatura`, `progresso`, `setor`, `convite` —
tudo aponta para `(usuario.id, usuario.portal_id)` por chave composta, e é
essa chave que impede (18 tentativas recusadas, §5.10) conteúdo de um
portal pendurar em outro. **Isso não muda.** O que o pedido exige é
separar duas coisas que hoje moram na mesma linha:

- **a credencial** — e-mail, senha, CPF/CNPJ, nome civil, estado da conta —
  que passa a ser **uma por pessoa**, global;
- **o perfil no portal** — papel, setor, matrícula, licenças, progresso —
  que continua **um por portal**, como hoje.

| Opção | O que é | Custo | Veredito |
|---|---|---|---|
| A. Tornar `usuario` global | tirar `portal_id` de `usuario` e migrar toda chave composta | Reescrever db/018, db/034 e ~30 consultas; perder a trava de isolamento que o §15.14 chama de crítica | **Não** |
| **B. `conta` acima de `usuario`** | tabela nova `conta` (credencial); `usuario` ganha `conta_id` e perde a senha | Migração aditiva; nenhuma chave composta muda; `sessao.usuario_id` continua por portal | **Sim** |

Com B, "mesma credencial nos três ambientes" é **uma `conta` com três
`usuario`** (um por portal); "acesso distinto com outro e-mail" é **outra
`conta`**. O professor continua **controlador** da base dele (LGPD, §5.10):
o `usuario` do portal dele é dele; a `conta` é da pessoa.

**Modelo (migração `db/045_conta.sql`):**

```
conta                                  -- a credencial: uma por e-mail
  id              BIGSERIAL
  email           TEXT NOT NULL            UNIQUE (lower(email))
  senha_hash      TEXT
  nome            TEXT NOT NULL
  documento       TEXT                     -- CPF ou CNPJ, só dígitos; UNIQUE quando informado
  tipo_documento  ENUM ('CPF','CNPJ')
  status_conta    status_conta NOT NULL DEFAULT 'ATIVA'
  ultimo_login_em TIMESTAMPTZ
  criado_em       TIMESTAMPTZ

usuario                                -- o perfil DENTRO de um portal (existente)
  + conta_id      BIGINT NOT NULL REFERENCES conta
  + UNIQUE (conta_id, portal_id)           -- uma pessoa, um perfil por portal
  senha_hash      -> migra para conta; a coluna fica e cai numa migração posterior
  email           -> continua (é lido em dezenas de consultas); gatilho mantém igual ao da conta
  cpf             -> migra para conta.documento; a coluna fica e cai depois
```

**Migração dos dados:** agrupa `usuario` por `lower(email)`. Um só → uma
conta. **Mais de um** (a mesma pessoa cadastrada separadamente em dois
portais — o que o modelo antigo permitia) → uma conta, com a senha do
perfil do portal 0 se existir, senão a do último login; o migrador imprime
a lista desses casos para comunicar às pessoas. Em produção hoje isso é
conteúdo de demonstração (`scripts/demo/`), então o custo é baixo — mas o
relatório é obrigatório, não opcional.

### 2.2 As regras de login e de cadastro com credencial global

| Situação | Regra |
|---|---|
| Login na **plataforma** ou no **portal de professor** com conta que não tem perfil ali | Entra e o perfil `aluno` nasce no ato (vínculo na primeira entrada). É o "mesmo acesso nos três ambientes" |
| Login no **portal de empresa** sem perfil ali | **Recusado** ("quem libera é o RH"), salvo e-mail de domínio autorizado (`autocadastrar`, já existe) |
| `/cadastrar` com e-mail que já tem conta | Não cria outra: "esse e-mail já tem conta — entre com a mesma senha para usar o mesmo acesso aqui, ou cadastre outro e-mail". A regra do pedido ("acessos distintos exigem outro e-mail") vira exatamente esta mensagem |
| CPF/CNPJ | Continua pedido só na compra (§12.1). **Quando os dois lados têm documento e ele difere**, a vinculação é recusada e a pessoa é orientada a usar outro e-mail. Documento é `UNIQUE` em `conta`: dois e-mails com o mesmo CPF são duas contas — permitido, é o "acesso distinto" |
| RH cadastra colaborador com e-mail que já tem conta | Cria só o perfil no portal da empresa, ligado à conta existente; **não** gera senha provisória, e a tela diz "essa pessoa já tem conta; entra com a senha que já usa". Convite aceito: idem |
| Admin cria professor/gestor com e-mail que já tem conta | Liga à conta existente (o `ON CONFLICT` de `criarProfessor` passa a ser por conta) |
| Sessão | Continua por portal (`sessao.usuario_id`) e por host (cookie). Entrar no portal do professor não abre sessão na plataforma — a credencial é a mesma, a sessão não |
| Estado da conta (`ATIVA`, `BLOQUEADA_INATIVIDADE`, `ENCERRADA`) | Sobe para `conta`: bloquear uma pessoa bloqueia todos os perfis dela. `ultimo_login_em` idem |

O teste `testes-e2e/separacao-de-bases.mjs` **inverte** no caso "aluna da
plataforma no portal do professor": deixa de ser recusada e passa a entrar
com perfil novo. Os demais casos (colaboradora fora da empresa, gestor no
portal, professor no portal) continuam como estão.

### 2.3 Os perfis de operação e o que cada um pode

Os três perfis da plataforma vivem no portal 0, como o admin. A guarda
deixa de ser "é admin?" e passa a ser "tem esta permissão?":

```
lib/permissoes.ts
  Permissao = 'conteudo.agir' | 'cadastros.ver' | 'cadastros.agir'
            | 'licencas.suporte' | 'licencas.conceder'
            | 'financeiro.ver' | 'financeiro.agir' | 'equipe.agir' | 'auditoria.ver'
  pode(papel, permissao): boolean        -- tabela pura, testável
```

| Permissão | admin | financeiro | suporte | O que cobre |
|---|:-:|:-:|:-:|---|
| `conteudo.agir` | ✔ | | | cursos, blog, vagas, preços da vitrine |
| `cadastros.ver` | ✔ | ✔ | ✔ | tela de usuários, aluno por portal, CPF |
| `cadastros.agir` | ✔ | | ✔ | criar/editar usuário, senha provisória, status da conta, vínculos |
| `licencas.suporte` | ✔ | | ✔ | estender, suspender, reativar |
| `licencas.conceder` | ✔ | | | cortesia e promocional (é decisão comercial — ver §6, decisão pendente) |
| `financeiro.ver` | ✔ | ✔ | | pedidos, pagamentos, reembolsos, faturas de portal, apurações, repasses, consolidado |
| `financeiro.agir` | ✔ | | | preço, contrato, aprovar apuração, registrar repasse, marcar fatura paga, estornar |
| `equipe.agir` | ✔ | | | criar/editar admin, financeiro, suporte |
| `auditoria.ver` | ✔ | ✔ | ✔ | log |

Leitura do pedido que vira premissa: **Financeiro só enxerga** (nenhum
botão de ação, e a ação recusa no servidor mesmo que o botão apareça);
**Suporte opera cadastro e licença de apoio, e não toca em dinheiro**.

`exigirAdmin()` vira `exigirPermissao(p)` em `lib/sessao.ts`; o layout de
`/admin` filtra o menu pela tabela e cada ação em `app/admin/**/acoes.ts`
confere a permissão específica — a mesma regra do comentário que já está
lá: "esconder o link não é controle de acesso, é decoração".

### 2.4 Professor SEM página própria

É o "professor convidado" do §5.6, que o discovery previu e o código só
tocou de lado: `criarProfessor` cria o papel, e nada mais. Para ele vender
no catálogo da plataforma:

| Peça | Decisão |
|---|---|
| Entrada | `/para-professores` ganha a segunda porta: "vender no catálogo, sem portal" — cadastro em autosserviço (`conta` + `usuario` papel `professor`, portal 0, sem portal). Sem pagamento de mensalidade |
| Autoria | `materia.professor_id` (portal 0) — hoje `materia.professor` é texto livre. O painel `/professor` ganha o modo **"meus cursos no catálogo"** quando não há portal, com os mesmos formulários da retaguarda restritos ao que é dele |
| Publicação | **Com revisão**, ao contrário do portal: `rascunho → em_revisao → publicado`, e quem publica é `conteudo.agir`. O enum `status_publicacao` já tem os estados; o papel `revisor` que dorme no enum pode virar isso um dia, mas não agora |
| Venda e aluno | Nada muda: venda no portal 0 é venda da plataforma, aluno da plataforma, licença de matéria (§5.10, "origem da venda") |
| Comissão | `contrato_professor` (§11) por professor, com percentual e vigência, e a **apuração passa a ter dono `professor_id` ou `portal_id`** (hoje só portal). `lib/apuracao.ts` já fecha mês, acumula abaixo de R$ 100, contesta, exige nota e repassa pelo gateway — o que muda é a chave, não o ciclo. O repasse pelo gateway exige subconta; sem ela, o registro manual que já existe |
| Financeiro do professor | `/professor/financeiro` mostra a apuração dele; sem faturas, sem consumo de GB (o vídeo é nosso) |

### 2.5 Empresa "sem página própria" = sem domínio próprio (revisto em 10/09/2026)

**Esclarecimento do responsável:** "sem página própria" não é empresa sem portal. É a empresa que usa o **subdomínio** fornecido pela plataforma (`empresa.aprimoreosaber.com.br`) em vez de vincular um **domínio próprio** (`treinamento.empresa.com.br`). Nos dois casos a empresa tem o mesmo espaço: publica os vídeos dela e **compra cursos do catálogo da plataforma** para os colaboradores. Os dois regimes de endereço já existem (§5.11: subdomínio na contratação, domínio próprio em "Minha página"), então a etapa 6 se reduz ao que falta: **a compra de cursos do catálogo por quantidade de colaboradores**.

| Peça | Decisão |
|---|---|
| O que é | Nada de portal novo. O portal EMPRESA de sempre (subdomínio ou domínio próprio) ganha uma **loja do catálogo**: cursos publicados na plataforma (os da casa, os dos professores sem portal da etapa 5 e os compartilhados na vitrine) |
| Compra | `/empresa/catalogo`: escolhe o curso e a **quantidade de vagas**. Até **10 vagas por curso** → checkout na hora, como pedido da empresa (`pedido.quantidade`, `pedido.empresa_portal_id`; valor = quantidade × preço **anual** vigente do curso). Acima de 10 → **pedido de orçamento** (`orcamento_empresa` + itens; `novo → proposto → aceito/recusado`); o comercial responde com o valor em `/admin/empresas`, e o aceite do RH vira um pedido a pagar pelo mesmo checkout |
| Vagas | O pagamento confirmado gera um **lote** (`licenca_lote`: portal da empresa, curso, quantidade, validade, pedido). O RH **distribui** as vagas pela tela de atribuição que já existe — por pessoa ou por setor, limitado ao saldo do lote. Cada vaga distribuída vira uma licença B2B **no perfil do colaborador no portal da empresa**, apontando para o curso da plataforma (`materia_portal_id = 0`, `lote_id`), com `fim_em` = validade do lote. Devolver a vaga cancela a licença e libera o saldo |
| Onde o colaborador vê | Dentro do portal da empresa, nas trilhas dele, ao lado das trilhas próprias. A rota de curso de outro portal (`/parceiros/<mascara>`) **já aceita licença como chave** (não só vitrine); o que falta é ela responder dentro de um portal de empresa para a máscara da plataforma, com a guarda de sessão e licença do portal fechado |
| Dinheiro | A venda é da plataforma (portal 0). Curso de professor sem portal ou de parceiro paga a comissão de sempre pela apuração, sobre o total do pedido (quantidade × preço). A mensalidade da empresa **não muda**: ela já paga o plano dela |
| Fora | Cursos próprios da empresa continuam como hoje (sobem no portal dela e nunca vão à vitrine). Não há "portal sem endereço" |

---|---|
| O que é | Um **portal `EMPRESA` sem endereço** (`portal.mascara` passa a aceitar NULL para esse caso; `modo_acesso = 'PLATAFORMA'`). Reaproveita gestores, colaboradores, setores, atribuição → licença B2B, acompanhamento, financeiro. **Não** nasce uma segunda entidade de empresa — o §5.11 já pagou o preço de tudo isso morar em `portal` |
| Onde o colaborador entra | Na **plataforma**, com a credencial global. O `/painel` mostra o bloco "Treinamentos da *Empresa X*" ao lado da jornada própria dele — o mesmo mecanismo de curso de outro portal que o `progressoPorMateria` já resolve (`base = /parceiros/<mascara>`) |
| Compra do catálogo | Nova tela em `/empresa/catalogo`: escolhe curso (ou passe) e **quantidade de vagas**. Até **10** vagas por curso → checkout como pedido de empresa (`pedido.quantidade`, preço = quantidade × preço vigente da matéria). Acima de 10 → **pedido de orçamento** (`orcamento_empresa`: empresa, itens, quantidades, status `novo → proposto → aceito/recusado`), tratado em `/admin/empresas` — que hoje só cuida de `interesse_empresa` |
| Vagas | `licenca_lote` (portal da empresa, materia_id ou passe, quantidade, usadas, pedido_id ou orcamento_id, validade). O RH **distribui** vagas a colaboradores pela mesma tela de atribuição; cada distribuição gera uma licença **no perfil do colaborador no portal 0** com `materia_portal_id = 0` e `lote_id`. Devolver vaga cancela a licença e libera a contagem |
| Cursos próprios | Sobem no portal da empresa (sem endereço) e chegam ao colaborador pelo mesmo bloco do painel. Exige liberar a rota `/parceiros/<mascara>` para curso de empresa **quando há licença** (hoje ela só serve vitrine compartilhada, que o CHECK proíbe para empresa). É a parte mais delicada desta etapa e fica **por último** dentro dela |
| Mensalidade | Decisão pendente (§6): sem página, a empresa paga mensalidade menor, só o que compra, ou ambos |

---

## 3. A tela de cadastro de usuários (Administrador e Suporte)

`/admin/usuarios` — lista **contas** (credenciais), não perfis: uma linha
por pessoa, com os portais em que ela existe.

**Lista.** Busca por nome, e-mail e CPF/CNPJ; filtros por papel, por
portal (plataforma / professor *X* / empresa *Y*), por estado da conta e
por "tem licença vigente". Colunas: pessoa, documento (mascarado, inteiro
só ao abrir), vínculos (chips: *aluno · plataforma*, *aluno · Otávio
Lins*, *colaborador · Aurora*, *professor*, *gestor · Aurora*, *suporte*),
licenças vigentes, último acesso, estado.

**Ficha (`/admin/usuarios/[id]`)**, em blocos:

1. **Dados cadastrais** — nome, e-mail, documento, nascimento, criado em,
   último login, estado da conta. Editar; **senha provisória** (gera,
   mostra uma vez, revoga as sessões — é o "esqueci a senha" enquanto não
   há e-mail); bloquear/reativar/encerrar (`status_conta`, auditado).
2. **Vínculos** — um cartão por portal: papel, setor/matrícula quando
   empresa, data. Ações: **adicionar vínculo** (aluno na plataforma, aluno
   em portal de professor, colaborador em empresa, gestor de empresa),
   remover vínculo. No portal de professor, o mesmo aviso de LGPD de
   `/admin/portais/[id]/alunos`: o dado é do professor, o acesso é
   suporte e fica em auditoria.
3. **Licenças** — todas, de todos os vínculos, com o **tipo** que o pedido
   nomeia: compra, teste gratuito, promocional, cortesia, B2B (empresa),
   migração; escopo, vigência, situação, origem (pedido, campanha,
   atribuição, lote). Estender/suspender/reativar (`licencas.suporte`);
   conceder cortesia (`licencas.conceder`).
4. **Pedidos e pagamentos** — só leitura, para o suporte responder "o
   pagamento entrou?" sem ir ao financeiro. Visível a `financeiro.ver` e
   a `cadastros.ver`.
5. **Sessões** — dispositivos abertos, revogar.
6. **Auditoria** — o que foi feito nesta conta, por quem.

**Criar (`/admin/usuarios/novo`)** — o formulário pergunta primeiro *o que*
está sendo criado, e só depois pede os campos daquele caso:

| Tipo | Campos | Quem pode |
|---|---|---|
| Equipe da plataforma (admin, financeiro, suporte) | nome, e-mail, papel, senha provisória | `equipe.agir` (só admin) |
| Aluno da plataforma | nome, e-mail, senha provisória, CPF opcional | `cadastros.agir` |
| Aluno em portal de professor | + o portal | `cadastros.agir` |
| Professor sem página | nome, e-mail, documento, senha provisória | `cadastros.agir` |
| Professor com página | nome, e-mail e **atalho para o fluxo existente** de `/admin/portais` (plano, máscara, contrato) | `cadastros.agir` |
| Empresa sem página | responsável, CNPJ, nome de exibição; nasce o portal sem endereço + gestor RESPONSAVEL | `cadastros.agir` |
| Empresa com página | atalho para `/admin/portais` com tipo EMPRESA | `cadastros.agir` |
| Colaborador de empresa | + a empresa e o setor | `cadastros.agir` |

Em todo tipo, e-mail que já tem conta **liga** em vez de duplicar, e a tela
diz isso antes de gravar ("essa pessoa já tem conta na plataforma; vamos
criar só o vínculo").

`/admin/alunos` continua existindo como atalho filtrado da lista nova
(papel aluno, portal 0) — ou some, se a lista nova cobrir; decidir ao ver a
tela.

---

## 4. Sequência de construção

| # | Etapa | Entrega | Depende de | Estimativa* |
|---|---|---|---|---|
| **1** | **Perfis de operação** | `db/044`: `papel_usuario` + `financeiro`, `suporte` · `lib/permissoes.ts` com testes · `exigirPermissao` · menu de `/admin` filtrado · toda ação em `app/admin/**/acoes.ts` conferindo a permissão certa · botões de ação escondidos para quem só vê · `/admin/financeiro` (visão consolidada só leitura: receita por fonte, faturas de portal em aberto, apurações do mês, reembolsos) · `criar-admin.mjs` aceita `--papel` | — | 1–2 sem. |
| **2** | **Cadastro de usuários** | `/admin/usuarios` (lista, ficha, criar) sobre o modelo **atual** (uma linha por `usuario`; o agrupamento por pessoa chega na etapa 3) · senha provisória · status da conta · vínculo "aluno em portal" · `lib/admin-usuarios.ts` · auditoria em toda ação · `/admin/empresas` ganha "criar empresa" | 1 | 2–3 sem. |
| **3** | **Credencial global** | `db/045_conta.sql` + migrador de dados com relatório · `autenticar`, `cadastrar`, `usuarioPorToken`, `criarSessao` sobre `conta` · vínculo na primeira entrada · recusa no portal de empresa · `/cadastrar` reconhecendo e-mail existente · RH/convite/admin ligando à conta existente · `conta.documento` único e a conferência de CPF/CNPJ na vinculação · `/admin/usuarios` passa a agrupar por conta · testes de unidade e integração; `separacao-de-bases.mjs` revisto | 2 | 3–4 sem. |
| **4** | **Telas de login** | `/entrar` na plataforma com abas *Aluno · Professor · Empresa* e a entrada discreta da equipe (papel decide, aba só rebaixa) · no portal do professor, o texto "use a conta que já tem" · no portal da empresa, "se já tem conta na plataforma, a senha é a mesma" · `paginaInicial` para `financeiro`/`suporte` → `/admin` e para professor sem portal → `/professor` · `tela-de-acesso.mjs` ampliado | 3 | 1 sem. |
| **5** | **Professor sem página** | segunda porta em `/para-professores` · `materia.professor_id` · `/professor` em modo catálogo · fluxo `em_revisao → publicado` na retaguarda · `contrato_professor` · apuração por professor · `/professor/financeiro` sem faturas | 3 | 3–4 sem. |
| **6** | **Compra do catálogo pela empresa** | `db/047`: `pedido.quantidade` e `pedido.empresa_portal_id` · `licenca_lote` e `licenca.lote_id` · `orcamento_empresa` + itens · `/empresa/catalogo` (cursos publicados da plataforma, quantidade, checkout até 10, orçamento acima) · confirmação do pagamento gera o lote · distribuição de vagas na tela de atribuição, por pessoa ou setor, com saldo · curso da plataforma visível nas trilhas e na rota `/parceiros/plataforma` dentro do portal fechado, só com licença · fila de orçamentos em `/admin/empresas` com resposta de valor e aceite pelo RH · apuração da comissão sobre o total do pedido | 3, 5 | 2–3 sem. |
| **T** | **Transversal: e-mail** | Continua pendente (§16.22). Enquanto não existe, a senha provisória do admin/suporte/RH é o "esqueci a senha". Quando existir: redefinição por link, aviso de vínculo novo ("sua conta agora também entra em…"), convite | paralelo | — |

\* No ritmo do §14 (5 a 15 h/semana). **Treze a dezoito semanas** no total; as
etapas 1, 2 e 4 são as que o responsável vê primeiro, a 3 é a que mais se
testa.

Por que esta ordem e não outra: 1 e 2 entregam a tela pedida **sem mexer no
modelo de identidade** — ficam de pé mesmo que a etapa 3 atrase. A 3 é a
fundação de 4, 5 e 6, e é a única com migração de dados; fica isolada num
commit próprio, com o relatório do migrador guardado.

### Estado da implantação

**Etapa 1 — Perfis de operação ✅ (10/09/2026)**

- `db/044_perfis_operacao.sql`: `financeiro` e `suporte` no enum, sozinhos no arquivo pela regra do db/033.
- `lib/permissoes.ts`: a tabela papel × permissão (10 permissões), `pode()`, `daEquipe()`, `ROTULO_PAPEL`. `lib/permissoes.test.ts` confere a matriz inteira, sem exceção implícita.
- `exigirPermissao` / `exigirEquipe` em `lib/sessao.ts`; `exigirAdmin` sobrou só para o que é exclusivo do admin. `paginaInicial` manda a equipe inteira para `/admin`.
- `/admin/layout.tsx` filtra o menu pela permissão de cada item e mostra o papel no subtítulo; `app/admin/guarda.ts` dá `exigirTela` (redireciona com `?sem-permissao=1`) e `permissoesDaTela` (esconde botões). Cursos, Blog e Vagas ganharam `layout.tsx` com `exigirTela('conteudo.agir')`.
- **Toda ação** em `app/admin/**/acoes.ts` passou a conferir a permissão específica (preço → `financeiro.agir`; cortesia → `licencas.conceder`; estender/suspender → `licencas.suporte`; portal/professor/status → `cadastros.agir`; plano/contrato/fatura/apuração/repasse → `financeiro.agir`; conteúdo → `conteudo.agir`; fila de empresas → `cadastros.agir`).
- Telas que existem para quem só vê e escondem os formulários: preços, licenças, portais (lista e ficha), financeiro do portal, alunos do portal, empresas.
- `/admin/financeiro` (`lib/financeiro-consolidado.ts`): receita por fonte nos últimos 6 meses (venda na plataforma, venda nos portais e o nosso %, mensalidades, reembolsos, líquido), faturas de portal em aberto, apurações esperando alguém, últimos pedidos com "nossa parte", reembolsos. Só leitura por construção.
- `scripts/criar-admin.mjs --papel=financeiro|suporte`; cabeçalho do site, barra lateral do aluno e rótulos de perfil reconhecem a equipe.

**Etapa 2 — Cadastro de usuários ✅ (10/09/2026)**

- `lib/admin-usuarios.ts`: lista com busca por nome, e-mail ou **CPF** (mascarado na lista) e filtros por papel, portal, estado da conta e licença vigente; ficha com dados, vínculos (o que a pessoa opera), **outros perfis com o mesmo e-mail em outros portais**, licenças com o tipo (compra, teste, promocional, cortesia, B2B, migração) e a origem (pedido, campanha, atribuição), pedidos, sessões abertas e auditoria.
- Criar: um formulário que pergunta primeiro o tipo — aluno/colaborador (em qualquer portal; empresa passa por `cadastrarColaborador`, com teto e trilhas do setor), professor (`criarProfessor`), gestor de empresa (`adicionarGestor`) e equipe (só `equipe.agir`; e-mail de aluno é promovido, de professor/gestor é recusado).
- Ações da ficha: editar dados, **senha provisória** (mostrada uma vez, derruba as sessões — o "esqueci a senha" até haver e-mail), estado da conta, derrubar sessões, trocar papel entre aluno e equipe, estender/suspender licença, cortesia. Ninguém mexe na própria conta por ali.
- `/admin/alunos` continua como atalho e leva à ficha.
- Verificação: `lib/admin-usuarios.test.ts` (7 testes contra banco) — **407 testes, `skipped 0`**; `npm run build`; `npm run contraste`; **`testes-e2e/perfis-e-usuarios.mjs`** (39 checagens: admin cria aluno com CPF, senha provisória, o aluno entra com ela; financeiro é devolvido de Cursos, lê preços e financeiro sem botão; suporte cadastra e não vê dinheiro nem cria equipe; aluno não entra em /admin) e as suítes `tela-de-acesso` e `separacao-de-bases` sem regressão — tudo contra o container reconstruído.

**Ficou fora, de propósito:** tentar a ação por HTTP com sessão de financeiro (o e2e confere que o formulário não existe; a recusa no servidor está em cada ação e é a mesma função `exigirPermissao` que o teste de unidade cobre pela tabela).

**Etapa 3 — Credencial global ✅ (10/09/2026)**

- `db/045_conta.sql`: tabela `conta` (e-mail único global, senha, nome, documento CPF/CNPJ **não único** — dois e-mails com o mesmo CPF são o "acesso distinto" do pedido); `usuario.conta_id NOT NULL` com `UNIQUE (conta_id, portal_id)`; **`senha_hash` e `cpf` saem de `usuario`** (derrubar a coluna é o que impede uma consulta esquecida de ler a credencial velha). Nenhuma chave composta `(id, portal_id)` mudou: o isolamento dos tenants é o mesmo.
- **Decisão revista na implantação:** `status_conta` e `ultimo_login_em` **ficam em `usuario`**, e não sobem para a conta. O RH desativa um colaborador (ENCERRADA) sem encerrar a pessoa em outro portal, e o teto de contas da empresa conta perfis do portal dela — subir o estado quebraria as duas coisas.
- Migração de dados com **`conta_fusao_relatorio`**: o mesmo e-mail em mais de um portal vira uma conta, com a senha do perfil da plataforma (ou, sem ele, do perfil com senha e login mais recente); cada fusão fica registrada com `senha_escolhida_de`. No banco local: 77 perfis → 73 contas, 4 fusões (alunos de demonstração repetidos em dois portais de professor). A migração foi provada de novo contra um `pg_dump` anterior a ela, numa base descartável.
- Quatro gatilhos: perfil inserido sem `conta_id` acha ou cria a conta pelo e-mail (é o que mantém os roteiros de teste antigos válidos); `usuario.email` é cópia do e-mail da conta e um UPDATE direto divergente é recusado; trocar `conta.email` propaga a todos os perfis; o último perfil apagado leva a conta (sem credencial órfã).
- `lib/auth.ts`: `garantirConta` (a operação que todo cadastro usa: conta nova nasce com senha e documento; conta existente **não** troca de senha e só ganha o que faltava; documento divergente é recusado com "use outro e-mail"), `cadastrar` (e-mail com conta em qualquer portal devolve `null`), `autenticar` (senha da conta; sem perfil no portal → `semPerfil`), `vincularNoPortal` (o perfil de aluno da primeira entrada), `revogarSessoesDaConta`. A sessão continua **por portal**.
- `app/acoes-auth.ts`: senha certa sem perfil → plataforma e portal de professor criam o perfil e mandam para `/painel?bemvindo=1`; portal de empresa recusa (salvo domínio autorizado, que cai no autocadastro com teto e setor). `/cadastrar` com e-mail existente diz "entre com a mesma senha, ou cadastre outro e-mail".
- Todos os cadastros passaram pela conta: RH (`cadastrarColaborador` devolve `ligadoAExistente` e a tela avisa que a provisória foi ignorada), convite (quem já tinha conta é mandado ao login com aviso), autocadastro, gestor, professor, contratação de portal (recusa e-mail com conta em qualquer portal), equipe e tela de usuários (senha provisória e troca de e-mail agora valem em todos os portais; a ficha agrupa os perfis pela conta). O CPF da compra grava em `conta.documento`. Perfil (`/conta`) troca e-mail e senha na conta e derruba as sessões em todos os portais.
- Verificação: `lib/conta.test.ts` (7 testes: cadastro, `semPerfil` + vínculo idempotente, sessão por portal, revogação global, `garantirConta` com documento divergente, RH ligando a conta existente, propagação de e-mail, gatilho de compatibilidade) — **414 testes, `skipped 0`**; `separacao-de-bases.mjs` com a **matriz revista** (aluna da plataforma entra no portal do professor; a equipe e o professor entram no portal dele como aluno; no portal da empresa só quem tem perfil ou domínio autorizado — o gestor da Aurora, que tem o domínio, vira colaborador dele mesmo); `tela-de-acesso.mjs` ajustado; `perfis-e-usuarios`, `autenticacao` e `portal-empresa` sem regressão.

**Etapa 4 — Telas de login ✅ (10/09/2026)**

- `/entrar` na plataforma com **três portas**: *Sou aluno · Sou professor · Sou empresa* (a aba da empresa leva ao painel do RH e oferece `/empresas`); no portal do professor, duas (aluno e a porta de serviço); no da empresa, uma. A aba continua só rebaixando (`papel_escolhido=aluno`); nenhuma promove. A equipe da plataforma não tem aba — o rodapé diz que entra por qualquer uma e o papel decide.
- Textos: o aluno lê que a mesma senha vale no site, na página do professor e no portal da empresa; no portal do professor, "já tem conta na plataforma? use a mesma senha — o seu acesso aqui nasce na primeira entrada"; na empresa, "se já tem conta na plataforma com esse e-mail, a senha é a mesma". `/entrar?ja-tem-conta=1` (vindo do convite) explica que a senha digitada no convite não substituiu a de sempre. "Esqueceu a senha?" passa a citar a senha provisória do suporte. `/cadastrar` diz para não criar outra conta e entrar com a mesma senha, ou usar outro e-mail para acesso separado.
- Fica para a transversal de e-mail: redefinição por link e o aviso "sua conta agora também entra em…".

**Etapa 5 — Professor sem página própria ✅ (10/09/2026, aprovada com 40% e CPF ou CNPJ)**

- `db/046_professor_catalogo.sql`: `materia.professor_id` (só no portal 0), `contrato_professor` (percentual, chave Pix, vigência, aceite com IP; um vigente por professor), `pedido.professor_id` (sem ON DELETE: venda com comissão segura a conta — professor se encerra, não se apaga), e a apuração passa a ter **um dono: portal ou professor** (`apuracao.professor_id`, CHECK de exclusividade, índice único por competência).
- `lib/professor-catalogo.ts`: cadastro em autosserviço (e-mail que já tem conta só vira professor com a senha dela; aluno é promovido; gestor, equipe e professor de portal são recusados), contrato-padrão de `COMISSAO_PADRAO_PP = 40` aceito no ato, `registrarContratoProfessor` (fecha o vigente na véspera), `definirChavePix`, **posse** (`posseDaMateria`, `materiaDe`), `situacaoPermitidaAoProfessor` (rascunho, em revisão, arquivado — publicar é da revisão), resumo e extrato.
- `lib/apuracao.ts` generalizado por `DonoApuracao` (`{ portalId }` ou `{ professorId }`; número continua valendo como portal): `apurarComissao`, `listarApuracoes`, `contestarApuracao`, `informarNota`; `apurarTodos` também fecha o mês dos professores com contrato; `pagarRepasse` recusa sem subconta e manda registrar por fora (Pix na chave do contrato).
- `lib/checkout.ts`: venda de curso assinado carimba `professor_id` e `comissao_professor_pp` do contrato vigente; curso sem contrato não vende.
- Painel `/professor` em **modo catálogo** quando não há portal (`app/professor/catalogo/*`, `acoes-catalogo.ts`): visão geral com checklist, meus cursos, curso (capa, assuntos, aulas, "enviar para revisão" só com aula publicada), aula (vídeo, dados, exercício), financeiro (chave Pix, apurações, extrato). Toda ação sobe do alvo até a matéria e confere a posse; as telas de portal (página, vídeos, alunos) redirecionam. `FormMateria` ganhou o modo `catalogo` (sem onda, destaque e vitrine; quem assina é fixo; situação limitada). `/api/upload` aceita o professor sem portal, só para aula ou curso dele.
- Entrada: `/para-professores` oferece a segunda porta e `/para-professores/catalogo` cadastra (nome, e-mail, senha, CPF ou CNPJ, aceite do contrato). Retaguarda: `/admin/cursos` mostra quem assina; a ficha do usuário ganhou o bloco **Professor do catálogo** (histórico de contratos, novo contrato por `financeiro.agir`, apurações com aprovar/registrar repasse); `/admin/financeiro` liga a apuração de professor à ficha.
- **Regra nova de catálogo:** curso de professor do catálogo só aparece (lista e página) quando **publicado** — rascunho e "em revisão" não viram cartão "em breve", que é o mecanismo das ondas de lançamento da casa.
- Verificação: `lib/professor-catalogo.test.ts` (cadastro e promoção com senha, venda carimbada, apuração por professor com contestação, nota e repasse, contrato novo não muda venda antiga, curso sem contrato não vende) — **417 testes, `skipped 0`**; build; **`testes-e2e/professor-catalogo.mjs`** (27 checagens: cadastro → painel em modo catálogo → curso, assunto, aula, questão → aula publicada → revisão → admin publica → catálogo público assinado → ficha com 40% → chave Pix → telas de portal redirecionam); `comercial`, `portal-vitrine` e `perfis-e-usuarios` sem regressão — contra o container reconstruído.

**Etapa 6 — Compra de cursos do catálogo pela empresa ✅ (10/09/2026)**

- **O limite é do curso** (pedido do responsável): `materia.vagas_sem_orcamento` (padrão 10; 0 = sempre por orçamento), editado no cadastro do curso — na retaguarda (curso da plataforma), no painel do professor do catálogo e, no portal do professor, assim que o curso é marcado para a vitrine (`FormMateria` mostra o campo na hora).
- `db/047_compra_do_catalogo_pela_empresa.sql`: `pedido.quantidade` e `pedido.empresa_portal_id` (compra de empresa é sempre venda da plataforma); `orcamento_empresa` (`novo → proposto → aceito/recusado/cancelado`, valor total proposto, pedido do aceite); `licenca_lote` (empresa, curso, quantidade, validade, pedido, orçamento); `licenca.lote_id` com uma vaga viva por pessoa por lote, e a regra "curso alheio só na plataforma" ganhou a exceção da vaga.
- `lib/empresa-catalogo.ts`: a loja (`cursosAVenda`: publicados com aula, da casa, de professor do catálogo com contrato, ou de portal ATIVO com contrato e na vitrine; preço **anual** da plataforma × quantidade), `comprarVagas` (até o limite; `abrirPedido` com `quantidade` e `empresaPortalId`), orçamento (`pedirOrcamento` acima do limite, `responderOrcamento`/`recusarOrcamento` pelo comercial, `aceitarOrcamento` vira pedido pelo valor proposto), lotes (`lotesDaEmpresa`), `distribuirVaga` (licença B2B no perfil do colaborador, curso da plataforma, até o fim do lote; confere que a pessoa é colaboradora ativa) e `devolverVaga`.
- `lib/checkout.ts`: `confirmarPagamento` cria o **lote** em vez de licença quando o pedido é de empresa (sem assinatura; a comissão de professor, se houver, já vai carimbada e entra na apuração de sempre).
- Telas: `/empresa/catalogo` (loja com quantidade — o botão vira "Pedir orçamento" acima do limite —, vagas compradas, orçamentos com "Aceitar e pagar"); "Liberar trilhas" ganhou o bloco **Vagas compradas do catálogo** (dar vaga por lote, devolver); `/admin/empresas` ganhou a fila de orçamentos com proposta e recusa (`financeiro.agir`); o checkout diz "N vagas para a sua equipe" e, pago, manda distribuir.
- O colaborador vê o curso comprado em "Minhas trilhas" com a etiqueta *curso da plataforma*; o link vai a `/parceiros/plataforma/...` **dentro do portal da empresa**, que passou a responder ali só com a licença do próprio colaborador (sem sessão ou sem vaga: 404). Sem avaliação final nem certificado — são das trilhas próprias.
- Verificação: `lib/empresa-catalogo.test.ts` (limite por curso, pedido com quantidade × preço anual, lote no pagamento, distribuição/devolução, orçamento proposto e aceito pelo valor proposto) — **420 testes, `skipped 0`**; build; **`testes-e2e/compra-do-catalogo.mjs`** (27 checagens: loja com o limite do curso, botão que vira "Pedir orçamento" acima dele, compra de 2 vagas, checkout, webhook, lote sem licença para o gestor, distribuição a uma colaboradora, saldo do lote, orçamento pedido → proposto pelo admin → "Aceitar e pagar", a colaboradora vê o curso como *curso da plataforma* e o abre pela rota de parceiro dentro do portal, anônimo toma 404); `portal-empresa`, `comercial`, `portal-vitrine`, `perfis-e-usuarios` e `professor-catalogo` sem regressão — contra o container reconstruído. De passagem, um teste antigo instável: `checkout.test.ts` e `portal-subconta.test.ts` escolhiam "a primeira matéria por ordem" e pegavam a matéria temporária de outro arquivo rodando em paralelo (ordem 0); passaram a excluir cursos de teste.

**Lição da implantação:** `docker compose up -d --build` **não substituiu o container** (o `BUILD_ID` dentro dele continuava o antigo) e os e2e falharam todos no login por "column senha_hash does not exist". `docker compose build --no-cache web` + `up -d --force-recreate web` resolveu; conferir `docker exec aprimoreosaber-web-1 cat .next/BUILD_ID` antes de qualquer e2e.

---

## 5. Verificação exigida por etapa

- **Unidade** (`node --test lib/*.test.ts`): tabela de permissões (todo papel × toda permissão, sem exceção implícita); vinculação de conta (e-mail existente, documento divergente, portal de empresa fechado); cálculo de vagas do lote; corte de 10 vagas.
- **Integração** (com `DATABASE_URL` na mesma linha — sem isso 55 testes pulam em silêncio): migração `usuario → conta` num banco com e-mail repetido em dois portais; login cria perfil no portal do professor e não cria no da empresa; RH cadastra e-mail existente sem gerar senha; suíte adversarial de isolamento **repetida inteira** depois da etapa 3 — a chave composta continua sendo a trava.
- **Ponta a ponta** (`CHROMIUM` + `SENHA_ADMIN`): `tela-de-acesso.mjs` com as abas novas e a entrada da equipe; `separacao-de-bases.mjs` com a matriz revista (a aluna da plataforma **entra** no portal do professor; a colaboradora **não** entra fora da empresa; financeiro não vê botão e a ação recusa por HTTP); roteiro novo `cadastro-de-usuarios.mjs` (admin cria suporte → suporte cria aluno em portal → aluno entra nos dois endereços com a mesma senha → suporte tenta alterar preço e é recusado).
- **Ao fim de cada etapa:** `npm run build`, `npm run contraste`, e `docker compose up -d --build` antes de testar no site — sem reconstruir, a tela nova responde 404.

---

## 6. Decisões pendentes (travam etapas específicas)

1. **Suporte concede cortesia?** O plano diz não (é decisão comercial, fica com admin). Se o suporte precisar compensar cliente, vira `licencas.conceder` para ele também — é uma linha na tabela. *(etapa 1)*
2. **Financeiro aprova apuração e marca fatura paga?** O pedido diz "restrito a visualizações"; o plano obedece. Se a operação do dia a dia pedir, é a mesma linha. *(etapa 1)*
3. ~~**Professor sem página: percentual de comissão**~~ **Etapa aprovada em 10/09/2026 com a sugestão:** parte de **40%** no contrato-padrão, editável por professor na retaguarda (contrato com vigência, como o do portal). *(etapa 5)*
4. ~~**Professor sem página precisa de CNPJ?**~~ **Aprovado com a sugestão:** aceita CPF ou CNPJ no cadastro; CNPJ só é exigido para repasse pelo gateway (subconta). *(etapa 5)*
5. ~~**Empresa sem página paga mensalidade?**~~ **Sem objeto (10/09/2026):** "sem página" é sem domínio próprio; a empresa já paga o plano dela e a compra do catálogo é à parte.
6. **"10 licenças": por curso ou no total do pedido?** O pedido diz "acima de 10 licenças para um curso ou mais" — o plano lê como **por curso**; confirmar. *(etapa 6)*
7. **Validade da vaga comprada** — a licença B2B do portal vale 2 anos (`VIGENCIA_B2B`); a vaga comprada do catálogo vale o período da tabela de preço (mensal…anual)? O plano parte de **anual** (quantidade × preço anual), com renovação do lote. *(etapa 6)*
8. **Documento na vinculação quando só um lado tem** — o plano grava o informado na conta e segue. Alternativa mais rígida: exigir o documento no cadastro (contra o §12.1). *(etapa 3)*

---

## 7. Riscos específicos

| Risco | Impacto | Mitigação |
|---|---|---|
| Migração `usuario → conta` fundir pessoas diferentes que usavam o mesmo e-mail em portais diferentes | Alto (acesso indevido a progresso/licença alheia) | Relatório do migrador; fusão só por e-mail **igual**; conta fundida ganha a senha do portal 0 e as outras sessões são revogadas; aviso às pessoas (manual, sem e-mail) |
| Perfil `financeiro` ver botão de ação e a ação passar | Alto (preço alterado por quem só deveria ver) | Permissão conferida **na ação**, nunca só na tela; e2e tenta a ação por HTTP com sessão de financeiro |
| Login no portal do professor criar perfil de quem só errou o endereço | Baixo | O perfil vazio não custa nada e não dá acesso a curso (sem licença); a lista do professor pode filtrar "com licença" |
| Rota `/parceiros/plataforma` dentro de um portal de empresa abrir curso sem licença | Alto | A rota já exige vitrine OU licença; no portal fechado, exige sessão e licença do próprio colaborador; sem isso, 404. Caso na suíte adversarial |
| Tela de usuários expor CPF a quem não precisa | Médio (LGPD) | Documento mascarado na lista, inteiro só na ficha, e cada abertura de ficha auditada |
