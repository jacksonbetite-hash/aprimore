# Plano — painel do colaborador com menu fixo, submenus e Biblioteca da empresa

Pedido de 09/09/2026, do teste com a conta de colaboradora no portal `aurora`
(`http://aurora.localhost:3010/painel`):

1. "Minha Jornada" abre os submenus **Minhas trilhas** e **Todas as trilhas**;
2. cada submenu mostra a sua tela **à direita, sem sair da página e sem
   trocar o menu**;
3. remover o item que leva à mesma página de `/painel`;
4. **Catálogo**, **Biblioteca** e **Planos** com o mesmo comportamento;
5. a Biblioteca é o **acervo que a empresa disponibiliza** (livros e
   conteúdos), com seleção por **assunto, autor** e outros critérios;
6. o painel administrativo da empresa ganha **upload** desse acervo.

Levantamento feito lendo `app/painel/page.tsx`, `app/painel/PainelEmpresa.tsx`,
`app/LateralAluno.tsx`, `app/BarraLateral.tsx`, `app/conta/page.tsx`,
`app/catalogo/page.tsx`, `app/planos/page.tsx`, `app/vademecum/page.tsx`,
`app/guarda-empresa.ts`, `app/empresa/layout.tsx`, `lib/upload.ts`,
`app/api/upload/route.ts`, `app/api/imagem/[id]/route.ts`,
`lib/empresa-relatorio.ts`, `lib/navegacao.ts`, `db/034_portal_empresa.sql`
e o §5.11 de `discovery.md`.

> **Estado em 09/09/2026: fases 1, 2 e 3 entregues.** O menu do
> colaborador virou layout, "Minha Jornada" abre os dois submenus, as
> cinco telas trocam sem o menu ir junto, e a Biblioteca da empresa está
> no ar com envio pelo painel do RH e entrega privada do PDF. `npm test`
> (394, `skipped 0`), `npm run build`, `npm run contraste`, o roteiro
> `portal-empresa.mjs` (66 passos) e `e2e:empresa` passam contra o
> container reconstruído. As decisões em aberto do §9 foram resolvidas
> como recomendado — **D1** sem item "Catálogo", **D2** "Meu acesso",
> **D3** só PDF e link, **D4** etiquetas livres, **D6** 50 MB. **D5** ficou
> como está: o vade-mécum saiu do menu da empresa e ainda não ganhou
> cartão no rodapé da Biblioteca. A **fase 4 (leituras)** foi entregue
> junto: a tabela `acervo_leitura` e a coluna "Aberturas" no painel do RH.
> O que mudou em relação ao planejado está no §10.

---

## 1. O que existe hoje, e de onde vem o incômodo

O colaborador vê **dois menus diferentes** conforme a página, e três dos
itens levam para fora do painel:

| Rota no portal da empresa | Quem desenha a barra | Itens | O que acontece ao clicar |
|---|---|---|---|
| `/painel` | `PainelEmpresa.tsx` | Minhas trilhas (`/painel`) · Minha conta (`/conta`) · **No portal:** Todas as trilhas (`/catalogo`, com seta de saída) | "Todas as trilhas" abre o catálogo **com cabeçalho e rodapé do site**; a barra some |
| `/conta` | `LateralAluno.tsx` (o menu **da plataforma**) | Minha jornada (`/painel`) · Caderno de erros (`/painel#caderno`) · Minha conta · **No site:** Catálogo · Biblioteca (`/vademecum`) · Planos (`/planos`) | é aqui que aparece o "Minha Jornada" do pedido. "Caderno de erros" não existe na empresa; "Biblioteca" é o vade-mécum de leis; "Planos" cai em `/` sem aviso (`recusarNoPortalDeEmpresa`) |
| `/catalogo` | `Pagina` (site público) | menu do site | a barra lateral não existe |

Os defeitos, na ordem do pedido:

- **Menu troca entre `/painel` e `/conta`.** São dois componentes: o
  colaborador vê um menu de plataforma (com caderno de erros e planos de
  venda) ao abrir a própria conta.
- **Dois itens para `/painel`**: "Minha jornada" (em `/conta`) e "Minhas
  trilhas" (em `/painel`). É o item duplicado que o pedido manda remover.
- **Catálogo, Biblioteca e Planos saem do painel** por decisão antiga
  (`BarraLateral.tsx`, comentário do topo): na *plataforma* são páginas de
  venda e de SEO e precisam de cabeçalho e rodapé. **No portal de empresa o
  argumento não vale**: não há venda, não há SEO (o portal é fechado, §5.11),
  e a única pessoa que vê essas telas é o colaborador logado. Trazê-las para
  dentro do painel é o certo *aqui*, e continua errado na plataforma — por
  isso `LateralAluno.tsx` não muda.
- **"Biblioteca" hoje é o vade-mécum** (`/vademecum`): consulta a leis, um
  produto da plataforma jurídica. Uma empresa como a Aurora (integração,
  LGPD, liderança, IA) precisa de outra coisa: o acervo *dela*. Não existe
  nada no banco para isso — `material_apoio` (db/001) só tem semente, sem
  rota de envio nem de entrega.

---

## 2. Decisão de arquitetura: um layout, cinco telas

**"Sem navegação para outra página" vira `app/painel/layout.tsx`.** O
App Router faz exatamente o que o pedido descreve: *"on navigation, layouts
preserve state, remain interactive, and do not rerender"*
(`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`).
A barra lateral mora no layout; cada submenu é uma rota filha; ao clicar,
o Next troca **só o segmento da direita**, sem recarregar e sem remontar o
menu. O endereço muda na barra do navegador — e isso é vantagem, não
efeito colateral: F5, favorito, botão voltar e o `destino=` do login
continuam funcionando, e `itemAtivo` (lib/navegacao.ts) continua acendendo
o item certo.

| Alternativa | Por que não |
|---|---|
| Abas em estado de cliente numa página só (`useState`, tudo pré-carregado) | Carrega Biblioteca, catálogo e conta a cada abertura do painel; perde F5, voltar e link direto; `itemAtivo` deixa de funcionar; o `destino=/painel` do login não sabe abrir "Biblioteca" |
| `?aba=` na mesma rota | Mesmo custo de carregar tudo, e cada aba passa a ser `searchParams` numa página já grande |

### 2.1 As rotas

| Menu | Rota | Conteúdo | De onde vem |
|---|---|---|---|
| Minha Jornada ▸ **Minhas trilhas** | `/painel` | o painel de hoje (saudação, alerta de atraso, 4 números, trilhas com anel e botão Começar/Continuar/Avaliação/Certificado) | `PainelEmpresa.tsx`, que passa a devolver **só o miolo** — a casca vai para o layout |
| Minha Jornada ▸ **Todas as trilhas** | `/painel/trilhas` | todas as trilhas publicadas no portal, em **prateleiras por área** com o andamento das liberadas (é o que `/catalogo` mostra hoje na empresa, sem cabeçalho e rodapé do site) | montagem dos cartões extraída de `app/catalogo/page.tsx` para `lib/catalogo-cartoes.ts` (função `cursosDoPortal(portal, aluno)`), reaproveitando `FiltroCursos`, `Prateleira` e `CartaoCurso` |
| **Catálogo** | ver **D1** (§9) | | |
| **Biblioteca** | `/painel/biblioteca` | o acervo da empresa, com filtros (§4) | novo |
| **Planos** | `/painel/planos` | "Seu acesso": o que está liberado, até quando, e quem libera — sem preço (ver **D2**) | `licencasDo` + `trilhasDoColaborador`, que já existem |
| **Minha conta** | `/painel/conta` | dados de acesso, assinaturas, pedidos, LGPD | conteúdo de `app/conta/page.tsx` extraído para `app/conta/ConteudoConta.tsx`; a página da plataforma continua em `/conta` com a casca dela |

Sem "grupo de saída" e sem seta `ico-sai`: nenhum item do menu do
colaborador sai do painel. Assistir aula (`/aula/<slug>`) e abrir a trilha
(`/materia/<slug>`) continuam no site do portal, como hoje — está fora do
pedido e é outro plano.

### 2.2 Redirecionamentos, para nenhum endereço antigo morrer

| Onde | Hoje | Passa a |
|---|---|---|
| `/catalogo` no portal de empresa | catálogo com casca do site | `redirect('/painel/trilhas')` — os cartões, o e2e e qualquer link antigo continuam valendo |
| `/conta` no portal de empresa | página com o menu da plataforma | `redirect('/painel/conta')` |
| `/planos` no portal de empresa | `redirect('/')`, silencioso | `redirect('/painel/planos')` (em `recusarNoPortalDeEmpresa`, só para esta rota; `/cadastrar` e `/checkout` continuam indo para `/`) |
| `/painel/trilhas`, `/painel/biblioteca`, `/painel/planos`, `/painel/conta` na **plataforma** (portal 0) ou em portal de professor | não existem | `redirect` para `/catalogo`, `/vademecum`, `/planos`, `/conta` — a guarda fica numa função só, `exigirColaborador()` em `app/guarda-empresa.ts` |

O layout decide pelo tipo do portal: em `EMPRESA` desenha a casca do
colaborador; fora dela devolve `children` sem tocar — a "Minha jornada" da
plataforma (`app/painel/page.tsx`) continua desenhando a própria casca com
`LateralAluno`, sem mudança. Layout não lê `searchParams`; os avisos
`?sem-acesso=1` e `?bemvindo=1` continuam na página.

---

## 3. Menu com submenu — o que muda em `BarraLateral.tsx`

`ItemLateral` ganha uma variante **pai**, sem `href`, com `filhos`:

```ts
export interface ItemPai { icone: string; texto: string; filhos: ItemLateral[] }
export interface GrupoLateral { titulo?: string; itens: (ItemLateral | ItemPai)[] }
```

Comportamento, no mesmo espírito de `MenuFerramentas.tsx` (abre no clique,
nunca no hover):

- o pai é um `<button aria-expanded>` com `expand_more` girando 180° quando
  aberto (o ícone já existe em `app/ui.tsx`; ícone fora da lista some sem
  erro — conferir antes de usar qualquer outro);
- **começa aberto se um filho está aceso** (`itemAtivo` sobre a lista
  achatada) e **fica aberto** enquanto se navega entre os filhos — o estado
  vive no componente de cliente, que vive no layout, que não remonta;
- filhos indentados: `.lateral-filhos { padding-left: 30px }` e
  `.item-lateral.filho { font-size: 14px; padding: 10px 14px }`;
- no ponto de quebra em que `.lateral` vira linha horizontal
  (`globals.css` ~2543), os filhos aparecem **em linha, achatados**, ao lado
  do pai — não há altura para submenu numa barra de uma linha;
- `enderecosDe(grupos)` — função pura que achata pais e filhos — entra em
  `lib/navegacao.ts` com teste em `navegacao.test.ts`. `itemAtivo` não muda.

O menu final do colaborador (montado em `app/painel/layout.tsx`):

```
[Nome da empresa]
Treinamento

Minha Jornada            ▾
   Minhas trilhas
   Todas as trilhas
Biblioteca
Planos
Minha conta
─────────────
Sair
```

**O item duplicado sai assim:** "Minha Jornada" vira o pai — não é link —
e o único item que aponta para `/painel` é "Minhas trilhas". `/painel` é
mantido como raiz porque `paginaInicial()` manda o colaborador para lá ao
entrar, e o e2e e a demo dependem disso.

---

## 4. A Biblioteca da empresa

### 4.1 O que é

O acervo que o RH publica para a equipe: livro em PDF, apostila, artigo,
política interna, ou **link** para algo que já está hospedado (e-book na
intranet, vídeo no YouTube da empresa). Cada item tem título, autor,
assuntos, formato, descrição e, opcionalmente, capa e setor. O colaborador
folheia por assunto e autor, busca por título, e abre o arquivo no próprio
navegador (PDF abre na aba nova, com o visualizador do navegador — sem
biblioteca de PDF no servidor, a mesma regra do certificado, §5.11).

### 4.2 Modelo — migração `db/042_acervo_da_empresa.sql`

```
CREATE TYPE acervo_formato AS ENUM ('PDF', 'LINK');
CREATE TYPE acervo_status  AS ENUM ('RASCUNHO', 'PUBLICADO');

CREATE TABLE acervo (
  id           BIGSERIAL PRIMARY KEY,
  portal_id    BIGINT NOT NULL REFERENCES portal(id) ON DELETE CASCADE,
  titulo       TEXT NOT NULL,
  autor        TEXT,
  assuntos     TEXT[] NOT NULL DEFAULT '{}',   -- etiquetas livres: 'LGPD', 'Liderança'
  descricao    TEXT,
  formato      acervo_formato NOT NULL,
  arquivo      TEXT,                            -- nome no volume: p<portal>-acervo<id>-<aleatório>.pdf
  bytes        BIGINT,                          -- entra na cota de GB do plano
  url          TEXT,                            -- formato LINK
  capa         TEXT,                            -- imagem do volume, opcional (mesma rota /api/imagem)
  ano          INT,
  editora      TEXT,
  setor_id     BIGINT,                          -- NULL = toda a empresa
  status       acervo_status NOT NULL DEFAULT 'RASCUNHO',
  criado_por   BIGINT REFERENCES usuario(id),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT acervo_tem_conteudo CHECK (
    (formato = 'PDF'  AND arquivo IS NOT NULL) OR
    (formato = 'LINK' AND url IS NOT NULL)),
  -- setor de OUTRO portal seria o vazamento do §15.14 pela porta dos fundos
  CONSTRAINT acervo_setor_mesmo_portal FOREIGN KEY (setor_id, portal_id)
    REFERENCES setor (id, portal_id) ON DELETE SET NULL (setor_id)
    -- `SET NULL (coluna)` existe desde o Postgres 15; o compose usa o 16.
    -- Sem a lista de colunas, apagar o setor zeraria também o portal_id.
);
CREATE INDEX acervo_portal_status ON acervo (portal_id, status);
CREATE INDEX acervo_assuntos ON acervo USING GIN (assuntos);
CREATE INDEX acervo_busca ON acervo (normaliza_busca(titulo || ' ' || coalesce(autor, '')));
```

Decisões embutidas, e por quê:

| Decisão | Por quê |
|---|---|
| **Assunto e autor são texto**, não tabelas | O filtro nasce do `SELECT DISTINCT` do que foi publicado; uma tabela de assuntos obrigaria o RH a cadastrar taxonomia antes do primeiro livro. Se um dia precisar de ordem ou de ícone por assunto, migra-se sem perder dado (ver **D4**) |
| **Só PDF e link** na primeira entrega | PDF abre em qualquer navegador sem código nosso. EPUB/DOCX exigiriam conversão ou download cego (ver **D3**) |
| **Setor opcional** | É a mesma unidade que `atribuicao` já usa para liberar trilha; um manual de vendas não precisa aparecer para o financeiro |
| **`bytes` gravado no insert** | `medirArmazenamento` (lib/portal-financeiro.ts) soma vídeo e `material_apoio`; passa a somar `acervo.bytes` — o acervo ocupa o mesmo volume e conta na mesma cota |
| `status` com rascunho | O RH sobe o arquivo, revisa a ficha, e só então a equipe vê — o mesmo fluxo da aula |

### 4.3 O arquivo: envio e entrega

**Envio.** `lib/upload.ts` ganha o tipo `'documento'`:

```ts
export type TipoEnvio = 'video' | 'imagem' | 'documento';
documento: { pdf: 'application/pdf' }          // extensões aceitas
LIMITE_BYTES.documento = Number(process.env.DOCUMENTO_MAX_BYTES ?? 50 * 1024 ** 2)
export function nomeDeAcervo(portalId, itemId, ext)  // p<portal>-acervo<id>-<aleatório>.pdf
```

`app/api/upload/route.ts` aceita `tipo=documento` para **gestor** (o portal
vem do vínculo em `portal_gestor`, nunca da requisição — a regra que já
está lá) e para admin com `?portalId=`. O destino é `DOCUMENTO_RAIZ`
(`/midia/documento`, ao lado de `video` e `imagem`); o entrypoint do
Docker, que hoje prepara o volume, cria o diretório novo. O envio é em
stream com o mesmo contador de teto — o cliente é o `Enviar.tsx` do
professor com `tipo="documento"` e `aceita="application/pdf"`.

**Entrega — e aqui a diferença que importa.** A rota de imagem é pública
porque a foto é a cara do portal. **O acervo é conteúdo interno do
cliente**: a regra do §5.11 ("seria o treinamento interno de um cliente
exposto na rua — é vazamento de dado do cliente") vale para ele inteiro.
Nasce `app/api/documento/[id]/route.ts`:

1. `idDeImagemValido(id)` (mesma regra: sem barra, sem `..`) e extensão
   aceita para `documento`;
2. **sessão obrigatória** (`alunoAtual()`), no portal da requisição;
3. `pertenceAoPortal(id, portalId)` — o prefixo diz de quem é, sem banco;
4. o item existe em `acervo`, está `PUBLICADO` e o setor bate (ou é nulo);
   o gestor do portal (na plataforma, via `portalDaEmpresa`) também
   passa, para conferir o rascunho;
5. `Content-Type: application/pdf`, `Content-Disposition: inline;
   filename="<titulo>.pdf"`, `Cache-Control: private, no-store`,
   `X-Content-Type-Options: nosniff`.

Na VPS o nginx monta `midia` só-leitura para entregar vídeo
(`docker-compose.yml`, perfil `vps`). Conferido em `nginx/aprimoreosaber.conf`:
a única `location` de mídia é `/midia-interna/`, marcada `internal`, com
`alias /midia/video/` — **nada serve `/midia/documento` direto**, então o
PDF passa obrigatoriamente pelo Next e o passo 2 vale também na VPS. Se um
dia o volume de leitura justificar, o PDF pode sair pelo mesmo
`X-Accel-Redirect` do vídeo, com uma segunda `location` interna.

### 4.4 Retaguarda — `/empresa/biblioteca`

Item novo no grupo "Treinamento" de `app/empresa/layout.tsx`:
`{ href: '/empresa/biblioteca', icone: 'library_books', texto: 'Biblioteca' }`.

A tela, no molde de `app/empresa/trilhas/page.tsx`:

- **cabeçalho** com contagem ("12 itens · 9 publicados") e o aviso de
  "publicado sem arquivo" não existe — o CHECK do banco impede;
- **tabela**: capa (ou ícone do formato) · título e autor · assuntos (chips)
  · formato · setor · situação · ações (Publicar/Despublicar, Editar,
  Excluir), com `EdicaoNaLinha` para título e autor como já se faz nas áreas;
- **formulário "Novo item"** (e o mesmo para editar, em `/empresa/biblioteca/[id]`):
  título*, autor, assuntos (texto separado por vírgula → `TEXT[]`),
  descrição, formato (PDF | Link), **arquivo** (`Enviar` com
  `tipo="documento"`) *ou* URL, capa (`Enviar` com `tipo="imagem"`,
  opcional), setor (select), ano, editora. `onSubmit` + `startTransition`,
  não `<form action>`: no erro o RH não perde a ficha que digitou;
- ações em `app/empresa/acoes.ts`, atrás de `gestor()`:
  `acaoSalvarItemAcervo`, `acaoStatusItemAcervo`, `acaoExcluirItemAcervo`
  (exclui a linha e apaga o arquivo do volume — `unlink` só depois do
  commit, como a troca de vídeo faz);
- `lib/acervo.ts`: `listarAcervo(portalId)`, `salvarItem`, `mudarStatus`,
  `excluirItem`, e as partes **puras** com teste em `lib/acervo.test.ts`:
  `partirAssuntos('LGPD, liderança ,')` → `['LGPD', 'liderança']`,
  `validarItem` (título obrigatório, URL só `http(s)`, ano entre 1900 e o
  ano que vem, PDF exige arquivo), `montarFiltro` (§4.5).

### 4.5 A tela do colaborador — `/painel/biblioteca`

Renderizada no servidor, com filtros na query string, como o vade-mécum:
`?q=&assunto=&autor=&formato=`. Nada de estado de cliente para filtrar —
a lista é pequena e o link é compartilhável ("veja os materiais de LGPD").

```
Biblioteca
Materiais que a [empresa] disponibiliza para a equipe.

[ buscar por título ou autor ______ ] [Assunto ▾] [Autor ▾] [Formato ▾]

Assuntos:  (LGPD) (Liderança) (Integração) (IA)        ← chips, um clique filtra

┌──────────┐ ┌──────────┐ ┌──────────┐
│  capa    │ │  capa    │ │  capa    │      grade de cartões, `.grade-3`
│          │ │          │ │          │      capa = imagem enviada, ou a
│ Título   │ │ Título   │ │ Título   │      arte desenhada por formato
│ Autor    │ │ Autor    │ │ Autor    │      (`.capa-arte`, como no blog)
│ [LGPD]   │ │ [IA]     │ │ [Vendas] │
│ Abrir ↗  │ │ Acessar ↗│ │ Abrir ↗  │      PDF: aba nova em /api/documento/<id>
└──────────┘ └──────────┘ └──────────┘      LINK: aba nova, rel="noopener"
```

- **Só o que é dele:** `status = 'PUBLICADO'` e `(setor_id IS NULL OR
  setor_id = <setor do usuário>)`, sempre com `portal_id` da requisição.
- Os selects de assunto e autor vêm de `SELECT DISTINCT` **já filtrado pela
  visibilidade** — um assunto que só existe num item de outro setor não
  aparece nem como opção.
- Busca com `normaliza_busca` (db/008), sem acento.
- **Vazio:** "A empresa ainda não disponibilizou materiais. Quem publica é o
  setor responsável pelo treinamento — {contato}." (o mesmo texto de
  autoria da tela de trilhas).
- Cartão opcional no rodapé, "Legislação — consulte leis e códigos", para
  `/vademecum`: o vade-mécum continua existindo no portal, só deixa de se
  chamar Biblioteca. Entra se **D5** disser que sim.

### 4.6 Leituras no acompanhamento (fase 4, opcional)

`acervo_leitura (acervo_id, usuario_id, aberto_em, PRIMARY KEY (acervo_id,
usuario_id))`, gravada pela rota de entrega no primeiro acesso. Com ela,
`/empresa/acompanhamento` ganha a coluna "materiais abertos" e o item do
acervo mostra "lido por 14 de 32". É o que transforma a Biblioteca de
prateleira em ferramenta de RH — mas não é pré-requisito de nada acima.

---

## 5. "Planos" no portal de empresa → "Seu acesso"

`/planos` não existe na empresa por decisão registrada: *"o colaborador não
contrata nada, e mostrar oferta a ele seria vender pelas costas do RH"*
(`app/planos/page.tsx`, §5.11). O item "Planos" do pedido ganha, então, o
conteúdo que **faz sentido para quem não compra** — o que já está no cartão
"Suas licenças" do painel da plataforma, dito na língua da empresa:

- lista das licenças `B2B` (`licencasDo`): "Passe completo" ou a trilha,
  vigente até `fim_em`, situação;
- as trilhas obrigatórias e o prazo de cada uma (`trilhasDoColaborador`);
- "Quem libera e renova o acesso é {contato}" e o "Sobre o programa" do
  portal, se houver.

Sem preço, sem botão de assinar, sem teste de 7 dias. Ver **D2** para o
rótulo do item.

---

## 6. Fases

| Fase | Entrega | Esforço | Verificação |
|---|---|---|---|
| **1 — menu e layout** | `app/painel/layout.tsx`; `BarraLateral` com pai/filhos e CSS; `PainelEmpresa` só miolo; `/painel/trilhas` (com `lib/catalogo-cartoes.ts`); `/painel/conta` (com `ConteudoConta.tsx`); `/painel/planos`; `exigirColaborador()`; os quatro redirecionamentos; `enderecosDe` + teste | 1 dia | `npm test`; `npm run build`; `e2e:empresa` (o roteiro já entra como colaboradora — ganha os cliques de submenu); olho no `aurora.localhost:3010/painel` e `/painel/conta` — o menu é o mesmo, "Minha Jornada" abre e fica aberto |
| **2 — acervo no banco e na retaguarda** | `db/042`; `lib/acervo.ts` + teste; `documento` em `lib/upload.ts` + teste; ramo na rota de upload; `app/api/documento/[id]`; `/empresa/biblioteca` com formulário e ações; `medirArmazenamento` somando `acervo.bytes`; diretório no entrypoint | 1 dia | `npm test` **com `DATABASE_URL`** (senão os testes de banco são pulados em silêncio); envio de um PDF pelo painel do RH; `curl` sem sessão em `/api/documento/<id>` → 401; com sessão de OUTRO portal → 403 |
| **3 — Biblioteca do colaborador** | `/painel/biblioteca` com filtros, chips e cartões; arte de capa por formato em `globals.css`; item no menu; demo (§7); e2e | ½ dia | `e2e:empresa`: RH publica 3 itens (2 PDF, 1 link), colaboradora filtra por autor e por assunto, abre o PDF (200, `application/pdf`); `npm run contraste` |
| **4 — leituras (opcional)** | `acervo_leitura`, coluna no acompanhamento, "lido por N de M" | ½ dia | e2e: abrir o PDF conta uma leitura, e só uma |
| **Fecho** | `docker compose up -d --build` — sem reconstruir, a tela nova responde 404 no site do usuário | | os quatro roteiros de `scripts/demo/` na ordem do `LEIA-ME.md` |

---

## 7. Demonstração

`scripts/demo/portal-empresa.mjs` ganha, depois das trilhas, três itens de
acervo publicados pelo RH da Aurora: um guia de LGPD em PDF (assuntos
"LGPD, Compliance", autor fictício), um manual de integração em PDF
restrito ao setor de Atendimento, e um link ("Política de uso de IA"). Os
PDFs entram em `midia/demo/documentos/` e no inventário do `LEIA-ME.md`;
podem ser gerados por script (uma página, texto) para não pesar no
repositório — o padrão de `gerar-capas.mjs`.

---

## 8. Arquivos

| Arquivo | Ação | Fase |
|---|---|---|
| `app/painel/layout.tsx` | novo — casca do colaborador em EMPRESA; passa `children` fora dela | 1 |
| `app/painel/PainelEmpresa.tsx` | só o miolo; grupos do menu saem daqui | 1 |
| `app/painel/trilhas/page.tsx`, `app/painel/planos/page.tsx`, `app/painel/conta/page.tsx`, `app/painel/biblioteca/page.tsx` | novos | 1 / 1 / 1 / 3 |
| `lib/catalogo-cartoes.ts` | novo — `cursosDoPortal()` extraído de `app/catalogo/page.tsx` | 1 |
| `app/conta/ConteudoConta.tsx` | novo — extraído de `app/conta/page.tsx` | 1 |
| `app/BarraLateral.tsx`, `app/globals.css` | pai/filhos, estilos, ponto de quebra | 1 |
| `lib/navegacao.ts`, `lib/navegacao.test.ts` | `enderecosDe` | 1 |
| `app/guarda-empresa.ts` | `exigirColaborador()`; `/planos` → `/painel/planos` | 1 |
| `app/catalogo/page.tsx`, `app/conta/page.tsx` | redirecionam em EMPRESA | 1 |
| `db/042_acervo_da_empresa.sql` | novo | 2 |
| `lib/acervo.ts`, `lib/acervo.test.ts` | novos | 2 |
| `lib/upload.ts`, `lib/upload.test.ts`, `app/api/upload/route.ts` | tipo `documento` | 2 |
| `app/api/documento/[id]/route.ts` | novo — entrega privada | 2 |
| `app/empresa/layout.tsx`, `app/empresa/biblioteca/page.tsx`, `app/empresa/biblioteca/[id]/page.tsx`, `app/empresa/biblioteca/FormAcervo.tsx`, `app/empresa/acoes.ts` | retaguarda | 2 |
| `lib/portal-financeiro.ts` | `medirArmazenamento` soma o acervo | 2 |
| `Dockerfile` / entrypoint, `docker-compose.yml` | `DOCUMENTO_RAIZ`, diretório no volume | 2 |
| `scripts/demo/portal-empresa.mjs`, `scripts/demo/LEIA-ME.md`, `midia/demo/documentos/` | demo | 3 |
| `testes-e2e/portal-empresa.mjs` | submenus, biblioteca, entrega privada | 1 e 3 |
| `discovery.md` | §5.11 ganha "etapa 8 — Biblioteca" e a nota do menu do colaborador | 3 |

Sem mudança: `app/LateralAluno.tsx`, `app/painel/page.tsx` (plataforma),
`app/vademecum/`, `app/planos/page.tsx` (além da guarda).

---

## 9. Decisões em aberto

**D1 — "Catálogo" e "Todas as trilhas" são a mesma tela.** No portal de
empresa o catálogo *é* o conjunto das trilhas do portal — não há outro
acervo a mostrar, e a vitrine compartilhada é proibida por CHECK
(`materia_empresa_fora_da_vitrine`). Dois itens para a mesma tela é o
mesmo defeito que o item 3 do pedido manda remover.
*Recomendação:* o submenu "Todas as trilhas" é o catálogo; **não há item
"Catálogo"** no menu do colaborador. *Alternativas:* (a) manter "Catálogo"
como segundo item apontando para `/painel/trilhas` — contradiz o item 3;
(b) dar ao "Catálogo" um sentido próprio: as trilhas publicadas que **ainda
não foram liberadas** para a pessoa, com botão "Pedir liberação" que avisa
o RH — é funcionalidade nova (tabela de pedidos + tela no acompanhamento),
mais ½ dia, e resolve uma pergunta real ("posso fazer o curso de IA?").

**D2 — o rótulo de "Planos".** O conteúdo é "Seu acesso" (§5). Chamar o
item de "Planos" mantém o nome do pedido, mas promete preço a quem não
pode comprar. *Recomendação:* item "Meu acesso" (ícone `verified_user`),
com `/painel/planos` continuando a responder por trás, para o link antigo.

**D3 — formatos além de PDF.** EPUB e DOCX não abrem no navegador: seriam
download cego. *Recomendação:* PDF e link agora; EPUB entra quando houver
leitor no cliente (biblioteca em JS, ~300 KB) — outro plano.

**D4 — assuntos livres ou amarrados às áreas das trilhas.** Amarrar à
tabela `area` faria "materiais de LGPD" aparecerem junto da trilha de LGPD
(um cartão "Leituras desta trilha" em `/materia/<slug>`). É bonito, mas
obriga o RH a escolher uma área para um livro de liderança que não tem
trilha. *Recomendação:* etiquetas livres agora, com coluna `area_id`
opcional em fase posterior.

**D5 — o vade-mécum no portal de empresa.** Continua acessível em
`/vademecum` mas some do menu. Entra como cartão "Legislação" no rodapé da
Biblioteca ou sai de vez da experiência da empresa? *Recomendação:* cartão
no rodapé, só se o portal tiver alguma aula com dispositivo citado
(`aulasQueExplicam`), o que é raro fora do direito — para a Aurora, não
aparece.

**D6 — teto por arquivo.** 50 MB cobre um livro escaneado em resolução
razoável; um PDF de 200 páginas com imagens passa disso. Ajustável por
`DOCUMENTO_MAX_BYTES` sem código; conferir o `client_max_body_size` do
nginx na VPS, que já está em 2 GB por causa do vídeo.

---

## 10. O que mudou em relação ao planejado

**10.1 A parte pura do acervo virou módulo próprio.** O plano tinha um
`lib/acervo.ts` só. O formulário do RH é componente de cliente e precisa
de `validarItem` e `partirAssuntos`; importando-as do módulo com as
consultas, o driver do Postgres ia junto para o bundle do navegador — o
build quebra pedindo `dns`, `net` e `fs`. Nasceu `lib/acervo-item.ts`
(puro, testado sem banco) ao lado de `lib/acervo.ts` (consultas), como já
acontece com `admin-cursos-form.ts` e `vademecum-texto.ts`.

**10.2 O envio da capa ganhou `uso=acervo`.** O plano dizia "capa com
`Enviar tipo=imagem`". Ao ligar, apareceu que a rota de upload SEMPRE
grava a imagem como **foto de apresentação do portal**: enviar a capa de
um livro trocaria a cara da página inteira da empresa, sem aviso. O
parâmetro `uso` separa os dois destinos, e `portal` continua o padrão.

**10.3 Sem índice para a busca por texto.** O plano previa
`CREATE INDEX ... normaliza_busca(...)`. A busca é `LIKE '%termo%'`, e
curinga à esquerda não usa índice btree — o índice seria enfeite. Um GIN
de trigrama pede `pg_trgm` por causa de uma tabela com dezenas de linhas
por portal. O comentário na migração diz onde acrescentar quando doer.

**10.4 `criado_por` ganhou `ON DELETE SET NULL`.** O item do acervo
sobrevive a quem o subiu. Sem isso, desligar um gestor que já publicou
material seria impossível sem apagar o material junto.

**10.5 `FiltroCursos` aprendeu a palavra "trilha".** A tela reaproveitada
em `/painel/trilhas` dizia "Buscar cursos…" e "6 cursos no catálogo" no
portal onde tudo se chama trilha. O componente passou a receber o
substantivo, com o gênero explícito no dado — deduzi-lo da terminação
erra na primeira exceção.

**10.6 A capa do cartão do acervo tem altura fixa, não proporção.** O
plano falava em capa de livro. Como a maioria dos itens não tem imagem, o
retrato 3/4 de gradiente vazio empurrava o título para fora da primeira
tela. Ficou uma faixa de 190 px, com `object-fit: contain` para nenhuma
capa de verdade ser recortada no título.

**10.7 O plano do menu de "Sai do painel" não existe aqui.** Estava
previsto e foi confirmado na implementação: nenhum item do menu do
colaborador leva para fora do painel, então não há grupo de saída nem
seta `ico-sai`. O e2e confere isso (`.ico-sai` com contagem zero).

**10.8 Ícones que faltavam.** Cinco itens do menu do RH usavam nomes
inexistentes em `app/ui.tsx` e renderizavam vazio, em silêncio. Foram
desenhados (`route`, `groups`, `assignment_turned_in`, `monitoring`,
`web`), mais os quatro novos (`grid_view`, `article`, `upload_file`,
`filter_list`). O e2e passou a exigir ícone em todo item do menu.

## 11. O que ficou fora, e por quê

- **D5 — o vade-mécum no rodapé da Biblioteca.** Ele saiu do menu da
  empresa (que era o defeito relatado) e continua acessível em
  `/vademecum`. O cartão "Legislação" no rodapé depende de o portal ter
  aula com dispositivo citado, o que não acontece na Aurora — entraria
  como código morto na única empresa que existe para testá-lo.
- **O botão primário não segue a cor do portal.** "Começar", "Abrir" e
  "Ver detalhes" saem roxos mesmo no portal azul da Aurora. É anterior a
  este trabalho (o mesmo acontecia no painel antigo) e vale para o
  produto inteiro, não só para estas telas — é conserto de identidade
  visual, com escopo próprio.
- **O título da aba em `/painel` ainda diz "Minha jornada"** para o
  colaborador, e o sufixo da marca é o da plataforma dentro do portal da
  empresa. O segundo é anterior e atinge todas as telas do portal.