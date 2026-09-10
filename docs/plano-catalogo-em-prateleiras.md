# Plano — catálogo em prateleiras (padrão Netflix)

Referência: captura do Twygo enviada em 08/09/2026 — o tablet (o celular com o
ranking fica fora do escopo). Levantamento feito lendo as telas que hoje listam
curso, trilha e aula: `app/catalogo/`, `app/PaginaPortal.tsx`,
`app/painel/PainelEmpresa.tsx`, `app/professor/cursos/` e `app/empresa/trilhas/`.

> **Estado em 08/09/2026: fases 1 e 2 entregues.** Catálogo, página do portal e
> cartão em prateleiras, com **capa tirada de um quadro do vídeo da aula**.
> `npm test` (350, `skipped 0`), `npm run contraste`, `npm run build` e os
> roteiros `portal-professor`, `portal-empresa`, `portal-vitrine` e
> `painel-professor` passam contra o container reconstruído. O que mudou em
> relação ao planejado está nos §7.1 a §7.4. `administracao.mjs` não rodou:
> exige `SENHA_ADMIN`, que não está neste ambiente. Fases 3 e 4 continuam
> abertas, e o envio de capa própria pelo painel também (§7.2).

---

## 1. O que a referência é, de fato

| Elemento da captura | O que ela mostra | O que temos hoje |
|---|---|---|
| Fila horizontal com título | "Mais visualizados", "Equidade e Inclusão" | seções por área, em grade de 3 (`.grade-3`) |
| Cartão | **capa 16:9 ocupando ~70% da altura** | cartão só de texto |
| Etiqueta sobre a capa | "CURSO", "MICROLEARNING", "Artigo" | chip de onda, acima do título |
| Rolagem lateral | a fila corre para o lado e sangra na borda | **não seguimos nisto** — a fila quebra de linha (§7.4) |
| Preço | não existe (catálogo corporativo interno) | preço e "Ver detalhes" — **ficam**, por pedido |

A conclusão que orienta o resto do plano: **o que faz a referência parecer Netflix
é a capa, não a rolagem.** Prateleira sem imagem é uma fila de caixas cinzas
correndo para o lado — fica pior que a grade atual. Por isso o §3 (capa) é o
coração deste plano, não acabamento.

---

## 2. Onde entra — e onde não entra

"Área do professor" tem duas leituras no sistema, e elas levam a trabalhos
diferentes. A que o pedido descreve é a segunda: **preço e "Ver detalhes" só
existem no cartão do catálogo**, a tela que o aluno vê.

| Tela | Arquivo | Hoje | Proposta |
|---|---|---|---|
| Catálogo (plataforma, portal do professor **e** portal da empresa — é a mesma rota, decidida por `portalIdAtual()`) | `app/catalogo/page.tsx` + `FiltroCursos.tsx` | grade de 3 por área | **prateleira por área**, com o cartão novo |
| Página única do portal do professor | `app/PaginaPortal.tsx` | grade de 2, com as 4 primeiras aulas listadas dentro do cartão | **prateleira por área**, mesmo cartão |
| Painel do colaborador (empresa) | `app/painel/PainelEmpresa.tsx` | pilha vertical de cartões com anel de progresso | **prateleiras por situação**: Obrigatórias · Em andamento · Concluídas |
| Painel de gestão do professor | `app/professor/cursos/page.tsx` | tabela (situação, aulas no ar, vitrine, publicar/despublicar) | **continua tabela** + miniatura da capa na 1ª coluna e botão "Ver como aluno" |
| Painel de gestão da empresa | `app/empresa/trilhas/page.tsx` | tabela | idem |

**Por que a tabela de gestão não vira catálogo:** ali o professor não escolhe o
que assistir — ele confere o que está no ar e publica. Sete colunas de estado
(aulas publicadas, situação, no portal, vitrine, ações) não cabem num cartão de
capa, e trocar a tabela por vitrine tiraria dele justamente o que o alerta de
"curso publicado que ainda não aparece" existe para resolver. O caminho é o
inverso: a tabela ganha a miniatura e um botão que abre a vitrine real. Se a
intenção era mesmo trocar as tabelas, é a decisão D1 do §9.

---

## 3. A capa não existe no banco — é o item que decide o prazo

`materia` tem `nome`, `ementa`, `onda`, `professor`, `ordem`. **Não tem imagem.**
A única capa do sistema é a do blog (`post.capa`, `db/017`), e o padrão de lá
serve inteiro aqui:

> foto quando existe (`/capas/<slug>.jpg`), e **desenho como reserva** — gradiente
> da categoria com o ícone por cima (`.capa-arte.c-<categoria>`, em `globals.css`).

| Opção | Custo | Resultado |
|---|---|---|
| A. Envio pelo professor/RH + reserva desenhada | migração + 1 ramo na rota de upload + campo no formulário | capa real onde houver, desenho onde não houver |
| B. Só a reserva desenhada | zero banco, só CSS | entrega no mesmo dia, mas todas as filas ficam com a mesma cara |
| **C. Quadro extraído do vídeo** | ffmpeg na imagem Docker | **foi esta.** Capa em todo curso com aula gravada, sem ninguém produzir arte |

**Como ficou: B na fase 1** (a tela nasce inteira, sem esperar nada) **e C na
fase 2** — ver §7.2. A opção A vira a 2b: trocar à mão o que o vídeo deu.

A infraestrutura descrita abaixo, escrita para a opção A, é a mesma que a C usa —
só muda quem produz a imagem:

- `db/041_capa_da_materia.sql` — `ALTER TABLE materia ADD COLUMN capa TEXT;`
  guardando `/api/imagem/<id>`, como `personalizacao->>'foto'` já faz.
- `lib/catalogo-campos.ts` — `m.capa` entra em `MATERIA_CAMPOS`; a projeção é uma
  só e alimenta catálogo e vitrine compartilhada de uma vez.
- `app/api/upload/route.ts` — hoje `tipo=imagem` grava **sempre** em
  `portal.personalizacao.foto`. Passa a aceitar `?materiaId=`, no espelho exato do
  que `?aulaId=` já faz para vídeo: confere que a matéria é **deste portal**, grava
  a coluna, apaga o arquivo anterior se era nosso, remede a cota.
- `lib/upload.ts` — `nomeNoVolume` ganha o meio `capa<materiaId>`, hoje fixo em
  `foto`; assim o dono do arquivo continua legível pelo nome, sem ir ao banco.
- Formulário: `Enviar tipo="imagem" materiaId={...}` em `/professor/cursos/[id]` e
  `/empresa/trilhas/[id]`. Proporção **16:9** (a foto do portal é 1:1), sugerido
  1280×720; o teto de 5 MB por imagem já vale.
- Cota: 40 capas de 300 KB dão 12 MB contra 100 GB inclusos — irrelevante no
  faturamento, mas passa por `medirArmazenamento` do mesmo jeito.

---

## 4. Quais prateleiras

| Prateleira | Dado necessário | Existe? |
|---|---|---|
| Por área ("Direito Civil", "Conformidade") | `area` + `materia.area_id` | **sim** — é o agrupamento atual |
| Continue assistindo | `progresso_aula` | **sim** — `continuarDeOndeParou()` já faz isso no painel |
| Novidades no catálogo | `materia.atualizada_em` (`db/019`) | **sim** |
| Mais assistidos | alunos distintos por matéria em `progresso_aula` | consulta nova, barata; **em portal novo vem vazia** — só ligar acima de um mínimo de alunos, senão vira "mais assistido: 1 pessoa" |
| Empresa: Obrigatórias · Em andamento · Concluídas · Prazo vencido | `atribuicao`, `conclusao` | **sim** — `trilhasDoColaborador()` já devolve `situacao` |

Ordem proposta no catálogo do aluno: *Continue assistindo* (só com sessão e
progresso) → *Novidades* (só se houver curso dos últimos 30 dias) → uma prateleira
por área. Fila vazia não aparece: prateleira vazia é pior que prateleira ausente.

---

## 5. O cartão — preço e "Ver detalhes" ficam onde estão

```
┌──────────────────────────────┐
│  ██████ capa 16:9 ██████     │  ← imagem enviada, ou gradiente da área
│  [1ª onda]                   │  ← chip sobre a capa, com véu escuro atrás
├──────────────────────────────┤
│  Direito Civil — Parte Geral │  ← h3
│  Otávio Lins                 │  ← .autor
│  Personalidade, capacidade…  │  ← .ementa, 2 linhas com reticências
│ ─────────────────────────────│
│  12 aulas · 4h20   R$ 39/mês │  ← .linha-preco (inalterada)
│  [     Ver detalhes      ]   │  ← botão inalterado, SEMPRE visível
└──────────────────────────────┘
```

O pé do cartão (`.rodape-cartao`, `.linha-preco`, o botão) não muda. O que entra é
a capa no topo e o corte da ementa em duas linhas, porque numa fila os cartões
precisam ter a mesma altura. **"Ver detalhes" não vira ação de `:hover`** — no
toque não há hover, e um botão que só aparece com o mouse some para metade dos
alunos.

**Ponto a decidir (D3):** no portal de **empresa** o cartão hoje mostra "R$ x/mês",
herdado de `tabelaVigente()`. A empresa não vende nada ao colaborador — ali o
lugar do preço é o progresso ou o prazo.

---

## 6. Mecânica da prateleira

- **A fila quebra, não rola** (decidido em 08/09/2026 — ver §7.4):
  `grid-template-columns: repeat(auto-fill, minmax(264px, 1fr))`. Cabem quantas
  colunas couberem na largura, e o cartão seguinte desce de linha. Nenhuma barra
  de rolagem horizontal, nenhum JavaScript, nenhuma consulta de largura: quem
  conta as colunas é o navegador. Por isso `Prateleira.tsx` é componente de
  servidor e não tem setas.
- **Movimento:** nada de `animation-timeline: view()` — ele apaga a página abaixo
  da dobra nas capturas feitas com `reducedMotion`.
- **Imagens:** `loading="lazy"`, `decoding="async"`, `width`/`height` fixos para não
  deslocar o layout; o `Cache-Control` de 24 h já vem de `/api/imagem/[id]`.
- **Filtro ativo:** com busca ou filtro aplicado o resultado volta a ser **grade**
  (`.grade-3`), não prateleira. Fila é para navegar; grade é para comparar
  resultado de busca. Área sem resultado continua saindo da tela.
- **Contraste (WCAG AA, `npm run contraste`):** nenhum texto de informação vai sobre
  a foto. O chip sobre a capa recebe véu escuro fixo atrás; título, preço e botão
  ficam na superfície branca do cartão, com os tokens de hoje.
- `.grade-3` é usada em outras 10 telas (planos, blog, home, financeiro). A
  prateleira é **classe nova** (`.prateleira`), não uma redefinição da grade.

---

## 7. Fases

| Fase | Entrega | Arquivos | Migração |
|---|---|---|---|
| **1** ✔ | Cartão com capa + prateleira, com capa **desenhada** por área. Catálogo e página do portal. | `app/globals.css` (`.prateleira`, `.capa-curso`, `.cartao-curso`), `app/catalogo/Prateleira.tsx` (novo), `app/catalogo/FiltroCursos.tsx`, `app/PaginaPortal.tsx` | não |
| **2** ✔ | Capa de verdade: um quadro do vídeo da aula, no envio e em lote (§7.2) | `db/041_capa_da_materia.sql`, `lib/capa-video.ts`, `lib/catalogo-campos.ts`, `lib/upload.ts`, `app/api/upload/route.ts`, `scripts/gerar-capas.mjs`, `Dockerfile` | **sim** |
| **2b** | Trocar a capa à mão pelo painel, e miniatura nas tabelas de gestão | `app/professor/Enviar.tsx`, `app/professor/cursos/[id]`, `app/empresa/trilhas/[id]`, as duas tabelas de gestão | não |
| **3** | Prateleiras dinâmicas (continue assistindo, novidades) e painel do colaborador em prateleiras. | `lib/catalogo.ts`, `app/painel/PainelEmpresa.tsx` | não |
| **4** | Capas do acervo de demonstração, para os três roteiros nascerem com a tela cheia. | `scripts/demo/*` | não |

Fecho de cada fase: `npm test` com `DATABASE_URL` na mesma linha (sem ela, 55
testes são pulados em silêncio), `npm run contraste`, `npm run build`, os roteiros
`portal-professor`, `portal-empresa` e `portal-vitrine`, e `docker compose up -d
--build` — sem o `--build`, a tela nova dá 404 no site.

### 7.1 O que a fase 1 mudou em relação ao planejado

Quatro coisas só apareceram com o código de pé e o banco real na frente:

1. **O mínimo de 3 itens por prateleira caiu.** A plataforma tem 12 cursos em 7
   áreas e a Aurora 6 trilhas em 4: quase nenhuma área chega a três, e a regra
   desligaria as filas exatamente onde elas foram pedidas. Como o cartão tem
   largura fixa, uma fila de dois é visualmente igual a uma grade de dois — a
   regra não se pagava. Área com curso é sempre fila; com filtro ativo, é grade.
2. **A cor da capa vem de `--primary`, não de hexadecimais.** As seis capas
   nasceram roxas e apareceram roxas no portal do Otávio, que é verde-azulado. Os
   tons passaram a ser `color-mix` sobre `--primary`, que cada portal já
   sobrescreve: muda o quanto de tinta escura e de branco entra, nunca a matiz.
3. **O progresso da trilha não aparecia, por BIGINT.** `materia.id` chega como
   texto na projeção do catálogo e `materiaId` chega como número na consulta do
   colaborador: o `Map` nunca casava, e a trilha saía sem progresso, sem erro
   nenhum. A chave passou a ser texto dos dois lados.
4. **A fila esticava a página inteira.** `.prateleira` é item do grid `.pilha-lg`,
   e item de grid nasce com `min-width: auto` — abaixo de ~1300px o catálogo
   ganhava rolagem horizontal na PÁGINA em vez de dentro da fila, e as setas nunca
   apareciam porque, para o trilho, não havia transbordo. Resolvido com
   `min-width: 0` na prateleira e na caixa dos cursos de parceiros.

### 7.2 A fase 2, e por que ela virou "capa do vídeo"

A fase 2 estava planejada como envio de capa pelo painel. O pedido de 08/09/2026
foi outro e melhor: **a capa é um quadro do próprio vídeo**. Ninguém precisa
produzir arte, e a imagem fala da aula — não é foto de banco de imagens.

Como ficou:

- `db/041_capa_da_materia.sql` — `materia.capa`, opcional; sem ela, o desenho.
- `lib/capa-video.ts` — o extrator. Um caminho só, usado pelos dois chamadores.
- `scripts/gerar-capas.mjs` — o lote, para o acervo que já existia:
  `docker compose exec web node scripts/gerar-capas.mjs [--refazer] [--portal N]`.
- `app/api/upload/route.ts` — vídeo enviado gera a capa do curso, se ele ainda
  não tiver uma. Fora do caminho da resposta: falha de ffmpeg vira linha de log,
  nunca erro na tela de quem só queria enviar a aula.
- `Dockerfile` — `ffmpeg` na imagem (~40 MB). É o que permite gerar capa do
  acervo antigo, e não só de vídeo novo.

Quatro coisas que só o teste em container mostrou:

1. **JPEG é full-range; vídeo, quase nunca.** Sem `-pix_fmt yuvj420p`, o
   codificador MJPEG recusa o quadro com "Non full-range YUV is non-standard".
2. **A duração é digitada pelo professor.** Declarar 45 minutos e enviar um vídeo
   de três faz a busca cair além do fim, onde não há quadro. Daí a reserva no
   segundo 1 — e ela confere o ARQUIVO, não só o código de saída: nessa
   situação o ffmpeg 8 sai com erro, mas o 9 sai com zero e não grava nada.
   O teste de unidade no host (ffmpeg 9) passava; o roteiro e2e contra o
   container (ffmpeg 8) foi quem pegou.
3. **20 segundos ainda é vinheta.** O primeiro teto rendeu capa de cartela de
   abertura, com a marca de quem produziu o vídeo. Subiu para 90s: com `-ss`
   antes do `-i` a busca é por índice e custa o mesmo em qualquer posição.
4. **`spawn` com binário do ambiente faz o Turbopack rastrear o projeto inteiro**
   para dentro do standalone. Resolvido com `/*turbopackIgnore: true*/`, a mesma
   marca que as rotas de mídia já usavam.

**Continua em aberto:** trocar a capa à mão pelo painel. A coluna, a rota de
imagem e a limpeza do arquivo anterior já estão prontas para isso — falta o
campo no formulário do curso (`?materiaId=` na rota de upload) e a decisão de
não deixar o próximo vídeo enviado sobrescrever a escolha do professor (o
`substituir` de `gerarCapaDaMateria` já protege isso).

### 7.3 "Lado a lado": fila de um cartão não é fila

O portal do Otávio tem duas áreas com um curso cada, e a regra de "uma fila por
área" empilhava os dois cartões um embaixo do outro. Agora: área com dois cursos
ou mais tem fila própria; os cursos das áreas de um só entram juntos numa fila
comum, e ali cada cartão mostra a área como rótulo acima do título
(`agruparPorArea`, em `CartaoCurso.tsx`). Nada se perde e ninguém fica sozinho na
prateleira.

Um defeito de CSS apareceu junto: com `flex: 1`, a ementa esticava, o
`-webkit-line-clamp` marcava as reticências na 2ª linha e o texto continuava
pintando depois delas, cortado no meio de uma frase em cartão de altura desigual.
Quem empurra o pé do cartão para baixo é o `margin-top: auto` do rodapé — o
`flex` na ementa era indevido.

### 7.4 A fila quebra de linha, e não rola para o lado

A rolagem lateral era o gesto da referência, e durou até a primeira tela cheia:
ela põe uma **barra de rolagem horizontal dentro da página**. O cartão que ficava
fora da tela só existia para quem descobrisse que dava para arrastar, e uma
página que rola nos dois eixos é desconfortável no toque — o dedo que queria
descer a página leva a fila para o lado.

Agora `.prateleira-trilho` é
`grid-template-columns: repeat(auto-fill, minmax(264px, 1fr))`: cabem quantas
colunas couberem, e o cartão seguinte desce. Medido em 1440, 1200, 1000, 820,
640 e 390px — em todas, zero barra horizontal, na página e no trilho.

O que saiu junto: as setas, o `scroll-snap`, o respiro que existia só para o
`overflow` não cortar sombra e anel de foco, a regra de celular (o `auto-fill` já
conta as colunas sozinho em qualquer largura) e o `'use client'` de
`Prateleira.tsx` — que voltou a ser componente de servidor, sem uma linha de
JavaScript.

Fica a observação honesta: com isso a tela deixa de ser Netflix na mecânica e
continua Netflix na aparência — capa grande, fila por área, cartão uniforme. O
que se ganha é que o acervo inteiro aparece rolando a página, que é o gesto que a
pessoa já está fazendo.

E o risco 4 (SEO) se confirmou: `painel-professor.mjs` verificava o título da
**aula** na home do portal, que a prateleira não mostra mais. A verificação passou
a conferir área, curso, capa, preço, botão — e que o cartão leva ao curso, onde a
aula publicada continua listada para o leitor e para o buscador.

---

## 8. Riscos e pendências

1. **Capa é conteúdo, não código.** Entregue a fase 2, alguém precisa enviar as
   capas curso a curso. Até lá o gradiente segura a tela — mas a promessa visual
   da referência só se cumpre com imagem real.
2. ~~**Prateleira com dois itens parece defeito.**~~ **Resolvido na fase 1** (§7.1,
   item 1): cartão de largura fixa faz a fila de dois ficar igual à grade de dois.
3. ~~**Preço no portal de empresa.**~~ **Resolvido na fase 1:** no portal `EMPRESA`
   o cartão mostra o percentual concluído, a barra de progresso e o prazo da
   trilha atribuída; trilha sem atribuição mostra só aulas e duração. A pílula de
   onda também saiu de lá — dizia "Em breve" sobre trilha que já estava no ar.
4. **SEO da página do portal — decidido pela primeira opção.** A lista das 4
   primeiras aulas dentro de cada cartão saiu da home do portal; os títulos
   continuam em `/materia/[slug]`, que lista todas. Junto com ela saiu o atalho de
   tocar a aula-amostra direto da home: quem chega agora entra pelo cartão do
   curso. Se a conversão pela amostra cair, o caminho é uma fila de "aulas
   abertas" abaixo das áreas — não o retorno da lista dentro do cartão.
5. **Etiqueta de tipo.** A referência mostra "CURSO", "MICROLEARNING", "Artigo"; o
   sistema tem um tipo só de item. Ou a etiqueta some, ou passa a mostrar o que
   temos: a onda, no professor; obrigatória/prazo, na empresa.

---

## 9. Decisões

Respondidas em 08/09/2026:

- **D1 — escopo: só a vitrine.** Catálogo, página do portal e painel do
  colaborador viram prateleiras. As tabelas de gestão continuam tabelas, com
  miniatura da capa e botão "Ver como aluno".
- **D2 — capa: desenhada na fase 1, envio na fase 2.** A tela sai sem tocar no
  banco e nunca aparece quebrada.
- **D3 — preço no portal de empresa: sai.** No portal `EMPRESA` a `.linha-preco`
  passa a mostrar progresso e prazo; no portal do professor e na plataforma o
  preço continua como está. A decisão vale para o cartão inteiro, então
  `FiltroCursos` precisa saber o tipo do portal — hoje ele não sabe, e o dado sai
  de `portalAtual()` na página, não de nova consulta.

Em aberto:

- **D4 — referência de cartão.** A captura mostra o cartão do Twygo em miniatura.
  Uma captura ampliada de **um** cartão (e do estado de hover) faz o acabamento
  sair igual em vez de aproximado.
