# Plano — página pública da universidade corporativa

Pedido de 10/09/2026: substituir a página do portal de empresa
(`aurora.localhost:3010`, "Universidade Aurora") pelo layout "Aprimore
Empresas" (`code.html` + `DESIGN.md`), com todos os elementos e imagens; depois,
avaliar o que da tela nova precisa ser **administrável** — pelo RH, em
`/empresa`, ou pelo administrador da plataforma, em `/admin`.

---

> ## Estado em 10/09/2026: página e administração entregues
>
> **Fase 1 (manhã)** — a home do portal EMPRESA passou a ser
> `app/PaginaEmpresa.tsx`: sete seções na ordem do protótipo mais rodapé. O
> portão antigo (`PortalDeEmpresaFechado`) continua como segunda linha de
> defesa das rotas internas; o que mudou é a **porta**, não a **regra**:
> nenhuma trilha, documento ou pessoa aparece antes do login.
>
> **Fase 2 (tarde)** — tudo o que a §3 abaixo pedia:
>
> - **3.1/3.2/3.7** `personalizacao.pagina` (JSONB, sem migração) com textos
>   por seção, quatro pilares (ícone de lista fechada), bloco de contato,
>   rodapé, chaves de seção, `mostrarNumeros` e `assinatura`. O RH edita em
>   `/empresa/site` ("A página pública, seção a seção"); o placeholder de cada
>   campo é o que a página mostra quando ele está vazio. A resolução das três
>   camadas (empresa → admin → código) é `lib/pagina-empresa.ts`, pura e com
>   testes.
> - **3.3** fotos próprias (`fotoAbertura`, `fotoCelular`) pelo upload com
>   `uso=acervo`; o selo "ilustrativa" some quando a foto é da empresa.
> - **3.4** decidido pela opção 3: os dois blocos coexistem, cada um com a sua
>   chave. O "Fale com o RH" grava em `pedido_acesso` (db/048) e aparece em
>   `/empresa/colaboradores` → "Pedidos de acesso"; atender cria o convite por
>   link (mesmo teto, 7 dias), recusar fecha. O da plataforma continua indo
>   para `interesse_empresa`.
> - **3.5** `pagina.assinatura` liga/desliga o "por Aprimore o Saber" no topo e
>   no rodapé; `pagina.links.termos/privacidade` (só https) entram na coluna
>   "Precisa de ajuda?". **O nome da universidade virou campo** do RH
>   (`nomeExibicao`, em "A marca da empresa"): é o que vai ao topo de toda
>   tela, ao rodapé legal e ao certificado.
> - **3.6** tabela `configuracao` (chave/valor, db/048) e a tela
>   `/admin/portais/pagina-da-universidade` (permissão `conteudo.agir`), com o
>   mesmo formulário em modo `admin`. Vale para toda empresa que não escreveu
>   o próprio texto.
> - **3.8** `lib/tema-portal.ts`: o tema inteiro sai da cor do portal —
>   inclusive `--grad-cta`, que era roxo cravado — e o texto/botão usam uma
>   versão da cor que passa 4,5:1 sobre branco e sobre a pill clara (cor
>   clara demais é escurecida). Vale para os quatro pontos que emitiam o
>   `<style>` à mão (site público, painel do aluno e do colaborador).
>
> **O nome no topo é dinâmico por empresa, e o e2e agora prova as duas
> pontas**: o campo vem preenchido com o nome da contratação ("Universidade
> Acme"), o RH troca para "Universidade Acme Corp", e o portão anônimo no
> subdomínio da empresa mostra o nome novo em `header .marca .rotulo` — antes
> mesmo da checagem antiga, que continua exigindo a marca da empresa e a
> mensagem de boas-vindas. No container, a Aurora responde "Universidade
> Aurora" no mesmo seletor.
>
> Verificado contra o container reconstruído: `npm test` (435, `skipped 0`,
> 15 novos em `lib/pagina-empresa.test.ts` e `lib/tema-portal.test.ts`) e
> `testes-e2e/portal-empresa.mjs` com 10 checagens novas (nome dinâmico,
> título com destaque, prova em branco caindo no padrão, bloco desligado
> trocando o botão principal, pedido de acesso da página pública até o link
> de convite na fila do RH). Tela do admin exercitada com conta temporária:
> o padrão salvo apareceu no `<h1>` da Aurora e, limpo, voltou ao de fábrica.

---

## 1. O que a página tem e de onde cada coisa vinha (fase 1)

| Seção | Elemento | Origem na fase 1 |
|---|---|---|
| Cabeçalho | Nome do portal + "por Aprimore o Saber"; botão Entrar | `portal.nome_exibicao` (RH); menu vazio para quem não entrou |
| Abertura | Etiqueta acima do título | `personalizacao.chamada` (RH, "Mensagem de boas-vindas") |
| Abertura | Título, parágrafo, dois botões, três provas ("sem fidelidade", "100% privativo", "web/tablet/celular") | **fixo no código** |
| Abertura | Foto da equipe + legenda de vidro + citação | `public/imagens/equipe-colaborando.jpg`, texto **fixo**; selo "Imagem ilustrativa" |
| Abertura | "+N colaboradores ativos" | **banco** (`ocupacaoDeContas`) — some quando 0 |
| Compromisso | Quatro pilares (ícone, tom, título, texto) | **fixo** (`PILARES`) |
| Ambiente | Quatro etapas com mini telas simuladas | **fixo**; as mini telas são ilustração, não dado |
| Biblioteca | Três recursos, preview com três "documentos" | **fixo**; os documentos são EXEMPLO (o acervo real é interno) |
| Biblioteca | "N documentos e normas indexados neste portal" | **banco** (`acervo` publicado) — texto genérico quando 0 |
| Multiplataforma | Foto do celular, quatro cartões, botão | `public/imagens/treinamento-no-celular.jpg`; textos **fixos** |
| RH | Três cartões + faixa de relatórios | **fixo** (`GESTAO`) |
| Contato | Lado escuro (título, três checks, e-mail corporativo@…) | **fixo** |
| Contato | Formulário "Solicite uma demonstração guiada" | grava em `interesse_empresa` → **`/admin/empresas`** (já administrável) |
| Rodapé | Marca, contato, responsável/CNPJ, âncoras, "Neste portal", ajuda, texto legal | `portal.*` + `personalizacao.contato` (RH); âncoras e legal fixos |
| Tema | Cor principal (botões de contorno, ícones, degradês, faixa escura) | `personalizacao.cor_primaria` (RH) |

Ou seja: na fase 1 a empresa controlava **logo, cor, etiqueta da abertura e
contato**, e a plataforma atendia **os pedidos de demonstração**; todo o resto
do texto era o do protótipo, igual em toda empresa. O que está marcado
**fixo** acima foi o que a §3 mandou virar campo — e virou (ver o estado no
alto).

## 2. O que o protótipo dizia e NÃO entrou como estava

A regra da casa (cabeçalho de `app/page.tsx`, `lib/empresas.ts`): número
inventado e recurso inexistente não vão ao ar sob a marca de ninguém (CDC,
art. 37). Cada troca abaixo é reversível se a decisão de produto for outra —
mas aí o recurso precisa existir antes do texto.

| No protótipo | Na página | Por quê |
|---|---|---|
| "+8.400 Colaboradores ativos" | contagem real; some se 0 | número de ninguém |
| "Mais de 180 documentos e normas indexadas" | contagem real; genérico se 0 | idem |
| "Modo Offline Seguro … total criptografia DRM" | "Material para Levar" (baixar manuais da biblioteca) | não há DRM nem app offline (`lib/video.ts`) |
| "SSO Google Workspace e Microsoft Azure AD" | "Portal fechado … vídeo com endereço assinado e marca d'água" | não há SSO; o que existe é convite, domínio autorizado e o player assinado |
| "Compatível com SAP, TOTVS, Kenoby, Gupy … via API" | "exportação em CSV que respeita os filtros" | não há integração nem API pública; o CSV existe (`/empresa/acompanhamento`) |
| "Autenticação criptográfica por QR Code" | "código de validação público" | o certificado é verificável em `/certificado/<codigo>`; não há QR |
| "Aprovado com distinção" / "Simulados cronometrados" / "legendas, transcrições" | texto do que o player e a prova fazem | recursos que não existem |
| "Lembretes … notificações personalizadas" | "prazo em destaque no painel" | não há e-mail nem push (tarefa T do §5.11) |
| Formulário sem CNPJ, com 4 faixas de porte próprias | CNPJ + as 3 faixas de `PORTES` | a fila `interesse_empresa` exige CNPJ (db/032) e os portes são os dos planos |
| Rodapé "Ecossistema" (Portal do Aluno, Vade-mécum Digital, Mural de vagas…) | coluna "A universidade" (âncoras) + "Neste portal" | conteúdo da plataforma dentro do portal fechado; o e2e proíbe |
| "corporativo@aprimoreosaber.com.br", "em até 2 horas úteis" | e-mail mantido; prazo é o da ação existente ("2 dias úteis") | a promessa de prazo é de quem atende |

## 3. O que precisa ser construído para a tela ser administrável

Ordem sugerida; cada item diz quem administra e onde.

### 3.1 Textos da página, por seção — RH, em `/empresa/site` (prioridade alta)

Hoje `personalizacao` (JSONB em `portal`) tem `chamada`, `proposito`, `sobre`,
`contato`, `corPrimaria`, `foto`, `ferramentas`. A página nova precisa de um
bloco a mais, **`pagina`**, com os textos que a empresa vai querer no tom dela:

```
personalizacao.pagina = {
  titulo, subtitulo,                       -- abertura (h1 e parágrafo)
  provas: [3 × texto],                     -- as três checagens sob os botões
  citacao,                                 -- a frase de vidro sobre a foto
  pilares: [4 × {icone, titulo, texto}],   -- compromisso
  contatoTitulo, contatoTexto, contatoEmail,
  rodapeDescricao,
}
```

- **Onde:** `lib/portal.ts` (tipo `Personalizacao`), `app/empresa/acoes.ts`
  (`acaoSalvarPaginaEmpresa` passa a aceitar os campos, com `maxLength` por
  campo e sem HTML), `app/empresa/site/FormPaginaEmpresa.tsx` (um `<details>`
  por seção da página, com o padrão da plataforma como placeholder).
- **Regra:** campo vazio = texto padrão da plataforma. A página não pode ficar
  com buraco porque o RH apagou um campo.
- **Ícones dos pilares:** lista fechada (`Icone` só desenha o que existe em
  `app/ui.tsx`; nome fora da lista renderiza nada, sem erro) — um `<select>`
  com os nomes válidos, não texto livre.
- **Sem migração:** é JSONB. Só o tipo e o formulário mudam.

### 3.2 Ligar/desligar seções — RH, em `/empresa/site` (prioridade alta)

Nem toda empresa quer a seção "Para o RH" na página que o colaborador vê, nem
o formulário de demonstração da plataforma dentro do próprio portal (ver 3.4).
`personalizacao.pagina.secoes = { compromisso, experiencia, biblioteca,
multiplataforma, gestao, contato }` com booleanos; a página pula a seção
desligada e o rodapé pula a âncora dela. Abertura e rodapé não se desligam.

### 3.3 Imagens da página — RH, em `/empresa/site` (prioridade média)

A foto da equipe e a do celular são de banco, com selo. A empresa vai querer a
foto **dela** — e aí o selo sai, porque deixa de ser encenação.

- `personalizacao.pagina.fotoAbertura` e `.fotoCelular`: mesmo caminho da logo
  (`Enviar tipo="imagem"` → `/api/upload` → `/api/imagem/…`), com a validação de
  proporção sugerida (16/9 e 9/16).
- Quando a imagem é da empresa, `.selo-ilustrativo` não aparece; quando é a
  padrão, aparece. A decisão fica no componente, não no formulário.
- **Cessão de uso de imagem** é da empresa (ela é a controladora, LGPD) —
  o formulário deve dizer isso ao lado do envio, como o `LEIA-ME.md` diz hoje.

### 3.4 Para onde vai o "Falar com um especialista" — decisão de produto

O formulário como está é o **funil da plataforma** (lead em
`interesse_empresa`, atendido em `/admin/empresas`). Numa página que a empresa
mostra ao próprio time, isso é anúncio do fornecedor dentro da casa do cliente
— o mesmo argumento que tirou "monte o seu portal" do rodapé do professor
(§5.10.2). Três caminhos, a escolher:

1. **Manter, com chave** (3.2): a plataforma liga por padrão; a empresa desliga.
2. **Trocar por "Fale com o RH"**: um formulário que grava um pedido de acesso
   (`nome, email, setor, mensagem`) numa tabela nova `pedido_acesso (portal_id,
   …)` lido em `/empresa/colaboradores` — e vira convite com um clique. É o uso
   que faz sentido para quem chega à página sem conta: "ainda não tenho acesso".
3. **Os dois**, decididos pelo RH.

A opção 2 é a que dá função real ao bloco na página da empresa; é uma
migração (`db/048`), uma tela de lista no painel do RH e o reaproveitamento
de `criarConvite`.

### 3.5 Cabeçalho e rodapé — RH (prioridade média)

- **"por Aprimore o Saber" no alto**: entrou porque o protótipo o mostra. A
  empresa Pro, com domínio próprio, pode não querer o fornecedor no topo
  (o rodapé legal já diz quem opera). Chave `personalizacao.pagina.assinatura`
  (padrão: ligada).
- **Links do rodapé** (Termos, Privacidade, LGPD): o protótipo os tem e a
  plataforma não tem páginas para eles no portal. Ou apontam para documentos da
  **empresa** (URLs cadastradas pelo RH — ela é a controladora), ou para os da
  plataforma (`/planos#legal` não serve: é página de venda, fechada na
  empresa). Precisa de `personalizacao.pagina.links = { termos, privacidade }`
  e de uma página estática da plataforma com os termos de operação.

### 3.6 Padrões da plataforma — administrador, em `/admin` (prioridade baixa)

Os textos "de fábrica" (o que aparece quando a empresa não preencheu) estão
em constantes de `app/PaginaEmpresa.tsx`. Se o comercial precisar mudá-los
sem deploy, viram uma linha em `configuracao` (tabela chave/valor com
`revalidateTag`), editada em `/admin/portais` → "Página padrão da
universidade". Vale o mesmo para o e-mail `corporativo@…` e para o texto do
rodapé legal da empresa (`app/componentes.tsx`), que hoje é fixo e cita LGPD
e MEC — texto jurídico que quem deve poder rever é o administrador, não o
código.

### 3.7 Números na página — nada a construir, uma decisão a tomar

Os dois contadores (colaboradores ativos, documentos publicados) são reais e
somem quando zero. Se a empresa não quiser expor **quantas** pessoas tem
(é informação dela, não conteúdo — mas é informação), a chave de 3.2 cobre:
`pagina.mostrarNumeros`.

### 3.8 Botão principal na cor do portal — plataforma inteira (prioridade média)

Aurora tem `corPrimaria = #0b3d5c` (azul-marinho) e, na captura, os botões
principais continuam roxos: `.btn-primario` usa `--grad-cta`, um degradê
cravado que `Pagina` não sobrescreve ao aplicar a cor do portal. Não é da
página nova — é assim em todo portal, do professor também. Corrigir é uma
linha em `Pagina`/`PainelEmpresa` (derivar `--grad-cta` da cor) mais o
`npm run contraste` para garantir 4,5:1 com branco em qualquer cor escolhida
(ou clarear/escurecer a cor até passar, como fazem as capas com o teto de 36%).

## 4. O que NÃO entra, e por quê

- **Editor de HTML/blocos livres para o RH.** A estrutura fixa é o que mantém
  o provisionamento automático e o suporte viáveis (§5.10); o RH preenche
  campos, não escreve página. Tudo acima cabe em campos.
- **Mostrar o acervo real (trilhas, documentos) na página pública.** O e2e
  confere que nem o título de um item publicado chega a quem não entrou. Se um
  dia a empresa quiser "vitrine interna", é uma rota **atrás do login**, não
  esta página.
- **Prova social (depoimentos, logos de áreas, avaliações).** Sob a marca da
  empresa, tudo isso é dado dela: só entra como campo preenchido por ela
  (3.1/3.3), nunca como padrão da plataforma.

## 4-A. O que ficou de fora, de propósito

- **Página de termos da plataforma.** A §3.5 previa uma página estática com
  os termos de operação para o portal apontar quando a empresa não tem os
  dela. Texto jurídico não se inventa em código: até existir, o link só
  aparece quando a empresa cadastra o dela.
- **E-mail ao atender o pedido de acesso.** Segue a regra dos convites: o RH
  copia o link e envia. Entra junto com a tarefa T do §5.11.
- **Preview "como a rua vê" dentro do painel.** O botão "Ver o portal" abre o
  endereço público em outra aba, que é o preview real.

## 5. Ordem de execução sugerida (cumprida em 10/09/2026)

| # | Entrega | Depende de | Tamanho |
|---|---|---|---|
| 1 | 3.1 + 3.2 — textos por seção e chaves, em `/empresa/site` | — | 1 dia |
| 2 | 3.3 — fotos próprias com selo condicional | 1 | ½ dia |
| 3 | 3.4 — decisão do bloco de contato; se opção 2, `db/048` + lista no painel | 1 | 1 dia |
| 4 | 3.5 — assinatura e links legais | 1 | ½ dia |
| 5 | 3.8 — botão na cor do portal + contraste | — | ½ dia |
| 6 | 3.6 — padrões editáveis pelo administrador | 1 | 1 dia |

Verificação em cada passo: `portal-empresa.mjs` (o portão e a varredura
anônima continuam valendo) e uma checagem nova — "campo vazio mostra o padrão;
campo preenchido mostra o texto da empresa; seção desligada não aparece nem no
rodapé".
