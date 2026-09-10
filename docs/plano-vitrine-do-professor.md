# Plano — vitrine do portal do professor (abertura, cursos e acesso)

Pedido de 09/09/2026: aprimorar o layout de três telas do **site do professor**
— a página principal, a exposição dos cursos e o "Meu acesso" —, incluindo
imagens de aluno e de uso no celular, e um banner na área de cursos, com capa em
cada curso.

> **As quatro capturas citadas no pedido não chegaram ao lado do agente.** O
> levantamento abaixo foi feito lendo o código das telas (`app/PaginaPortal.tsx`,
> `app/catalogo/`, `app/entrar/`, `app/painel/`) e comparando com a home da
> plataforma (`app/page.tsx`), que já tem o vocabulário visual que falta no
> portal. O §11 lista o que muda se as capturas contradisserem o que está aqui —
> em especial **D1**, que é a leitura de "Meu acesso".

---

> ## Estado em 09/09/2026: fases 1, 2 e 3a entregues
>
> **Fase 1** — a abertura do portal é o `.hero`, com o app no celular à direita,
> a contagem do acervo nos chips e o professor no selo sobre a mídia; nova seção
> "Estude do jeito que a memória funciona"; o retrato ganhou tamanho de gente em
> "Quem ensina". **Fase 2** — a página de cursos abre com banner de marca, na cor
> de cada portal, com mosaico de três capas do próprio acervo; a caixa de "ondas"
> saiu do portal do professor. **Fase 3a** — o professor envia a capa do curso
> pelo painel, e ela passa na frente do quadro tirado do vídeo; a tabela de
> cursos ganhou miniatura.
>
> Verificado contra o container reconstruído: `npm run contraste`, `npm test`
> (394, `skipped 0`), `npm run build`, `portal-professor.mjs`,
> `portal-empresa.mjs` e os e2e `painel-professor`, `comercial`,
> `portal-vitrine`, `portal-professor` e `autenticacao`. `administracao.mjs` não
> rodou: exige `SENHA_ADMIN`, que não está neste ambiente.
>
> **Fase 1b** (captura real no lugar da figura encenada), **3b**, **3c** e a
> **fase 4** ("Meu acesso") continuam abertas — a 4 por causa de **D1**. Duas
> coisas apareceram durante a execução e estão no §10, itens 5 e 6.

---

> ## O layout chegou (D5), e a abertura foi refeita — 09/09/2026, à tarde
>
> O dono do projeto entregou o layout da página principal (arte + `code.html`),
> que é a "imagem 1" que faltava. Ele **confirma** a fase 1 no essencial (hero
> com mídia à direita, acervo em cartões, método, oferta, quem ensina) e muda
> quatro coisas, todas implementadas em `app/PaginaPortal.tsx`:
>
> 1. **A mídia da abertura é uma foto de estudo em grupo**, e o celular desceu
>    para a seção do método, ao lado das quatro caixas (`.vitrine-app.espelhada`).
>    Isso responde **D3 no sentido "sim, com selo"** — ver
>    `public/imagens/LEIA-ME.md`, que registra procedência, o que a imagem é e o
>    que o texto ao redor **não** pode afirmar.
> 2. **A contagem do acervo saiu dos chips flutuantes** e virou a linha de
>    números embaixo dos botões (`.hero-numeros`), presa por um filete. Some
>    inteira em portal sem curso publicado.
> 3. **O acervo ganhou cartão grande** (`app/catalogo/CartaoVitrine.tsx`), dois
>    por linha, com a capa em tamanho de cartaz e, sobre ela, onda, contagem de
>    aulas, duração e o selo de aula aberta — este último a partir do campo novo
>    `amostras` (`lib/catalogo-campos.ts`). O cartão de fila (`CartaoCurso`)
>    continua sendo o da página de cursos: lá se compara, aqui se descobre.
> 4. **A oferta passou a ser o cartão de plano da plataforma** (`.plano`), com o
>    que cada licença inclui item a item, em vez de três preços soltos.
>
> **O que o layout trazia e não entrou**, por ser número ou promessa que este
> sistema não tem como sustentar sob a marca de outra pessoa: nota de avaliação
> ("4,9 ★"), "+5.000 alunos aprovados", "+10 anos de magistério", "atualizado
> semanalmente", o selo "AO VIVO" e a legenda "Comunidade ativa & debates reais"
> sobre a foto do hero. Vale a mesma regra do cabeçalho de `app/page.tsx`
> (CDC, art. 37). As duas capas de curso do layout também ficaram de fora: elas
> trazem o nome de outro professor gravado na arte, e capa de curso é conteúdo
> do professor, não peça de layout (fase 3a).
>
> **D6 continua aberto e ficou mais visível ainda:** com o layout novo, o botão
> "Ver as aulas" (roxo de `--grad-cta`) encosta em título, chip e preço na cor
> verde do portal de demonstração. Segue sendo decisão de identidade, não de
> tela — ver §10, item 6.
>
> Verificado: `npm run contraste` (com três pares novos), `npm test` (394,
> `skipped 0`), `npm run build`, `docker compose up -d --build` e uma passagem
> de leitura no portal `otaviolins` em 1440px e 390px — abertura, acervo,
> método, oferta e contato, sem rolagem horizontal em nenhuma das duas.

---

## 1. As três telas, como estão hoje

| Imagem | Tela | Arquivo | O que ela é hoje |
|---|---|---|---|
| 1 | Página principal do portal | `app/PaginaPortal.tsx` | Abertura em `.cabeca-materia` (faixa cinza-claro): chip com o nome, `h1`, subtítulo, dois botões, contagem em `caption`, e a foto do professor em 220×220 à direita. Depois: acervo em prateleiras, oferta em `.grade-3`, "Quem ensina" e contato. |
| 2 | Cursos | `app/catalogo/page.tsx` | Cabeça idêntica à de qualquer página interna (`.cabeca-materia`: trilha, `h1` em duas cores, `sub`). Em seguida a caixa `.sabia` de "lançamento em ondas", `FiltroCursos` e as prateleiras. |
| 3 | "Meu acesso" | `app/entrar/page.tsx` → `lib/navegacao.ts:paginaInicial()` → `/painel`, `/professor`, `/admin` | Um cartão branco centralizado (`.cartao-auth`) com título, uma linha de subtítulo e o formulário. Nada da marca do portal, nada do que existe atrás da porta. |

**O diagnóstico em uma frase:** a home da plataforma (`app/page.tsx`, 531 linhas)
tem hero com vídeo, `.vitrine-app` com o app no celular, grade de áreas, quadro
docente, depoimentos e chamada final. O portal do professor herdou o **esqueleto**
desse padrão sem herdar **nenhuma imagem** — a única figura da página é o retrato
220×220 do professor, e ele fica na abertura, no lugar onde a referência põe o
produto em uso.

E o CSS já está pronto e ocioso: `.hero`, `.hero-grade`, `.hero-figura`,
`.hero-chips`, `.hero-selo`, `.vitrine-app`, `.lista-check`, `.chamada-lado` estão
todos em `app/globals.css` e **nenhum deles é usado por `PaginaPortal.tsx`**. Boa
parte deste plano é ligar o que já existe, não escrever CSS novo.

---

## 2. A regra que decide tudo o que vem abaixo

O portal é white-label: ele tem de ter a **qualidade** da home da plataforma sem
carregar o **marketing** dela nem o rosto de outra pessoa. Isso separa as imagens
em duas categorias, e a categoria decide quem fornece o arquivo:

| Categoria | Exemplo | De quem é | Pode ser padrão em todo portal? |
|---|---|---|---|
| **Imagem de produto** | o app aberto no celular, a tela da aula, o exercício | da plataforma | **Sim.** É o mesmo aplicativo que o aluno do professor usa. |
| **Imagem de pessoa** | retrato, depoimento, foto de aluno identificável | do professor | **Não.** Ou ele envia, ou a seção não existe naquele portal. |

E a regra de publicação que já vale no projeto (`public/retratos/LEIA-ME.md`,
`public/imagens/LEIA-ME.md`) continua valendo em cada arquivo novo:

> Toda imagem encenada, sintética ou de banco leva `.selo-ilustrativo` até ser
> substituída por conteúdo real com licença e cessão. Não existe terceira opção
> em que o selo saia e a foto fique.

Consequência prática: **a fase 1 não depende de comprar foto de aluno.** A imagem
mais forte que o pedido descreve — "uso da execução dos cursos em celular" — é
imagem de produto, e ela pode ser **capturada da própria aplicação**, o que
resolve a estética e a procedência no mesmo movimento (§3.3).

---

## 3. Fase 1 — a abertura da página principal (imagem 1)

### 3.1 O que muda

A seção 1 de `PaginaPortal.tsx` deixa de ser `.cabeca-materia` com foto ao lado e
passa a ser um `.hero` de verdade, no molde da home:

```
┌───────────────────────────────────────────────────────────────┐
│  [chip: nome do portal]                    ╭───────────────╮  │
│                                            │               │  │
│  A chamada do professor,                   │  o app aberto │  │
│  em duas cores                             │  no celular,  │  │
│                                            │  numa aula    │  │
│  O propósito, em corpo leve.               │  deste portal │  │
│                                            │               │  │
│  ✓ Aula em vídeo    ✓ Lei ao lado          ╰───────────────╯  │
│  ✓ Exercício ao fim ✓ No celular            [selo: foto do    │
│                                              professor + nome]│
│  [Ver as aulas]  [Criar conta]                                │
│  12 cursos · 148 aulas · 31 horas                             │
└───────────────────────────────────────────────────────────────┘
```

- **A figura da direita passa a ser o produto, não o retrato.** É a inversão que
  o pedido descreve: o aluno chega e vê o que vai receber.
- **O retrato do professor não some — muda de papel.** Vira o `.hero-selo` que já
  existe no CSS (avatar redondo + nome + linha de contexto), ancorado no canto da
  mídia, e continua em tamanho grande na seção "Quem ensina", lá embaixo. Portal
  sem foto cadastrada simplesmente não mostra o selo; a mídia ocupa a coluna
  inteira, e nada fica quebrado.
- **`.lista-check` entra no lugar de nada.** Hoje, entre o subtítulo e os botões,
  não há prova nenhuma. Quatro itens de check roxo são o elemento mais repetido
  do sistema (§ identidade visual) e custam quatro `<li>`.
- **A contagem sobe de `caption` para `.hero-chips`** — as pílulas flutuantes
  sobre a mídia, que já existem: "12 cursos", "148 aulas", "31 horas de vídeo".
  O dado já está calculado no arquivo; só muda onde ele aparece.
- **A cor do portal é respeitada.** `corPrimaria` já vira `--primary` no portal;
  o hero é branco com tinta de marca, então ele acompanha sozinho.

### 3.2 Uma seção nova: o estudo no celular

Abaixo do acervo e antes da oferta, entra o equivalente da `.vitrine-app` da
home — texto à esquerda, figura do celular à direita, `chip` de "no computador,
no celular, no tablet", e quatro pílulas de recurso. É a seção que o pedido chama
de "uso da execução dos cursos em celular", e é a mesma classe CSS da plataforma,
sem uma linha nova de estilo.

Diferença de conteúdo em relação à plataforma: aqui o texto fala do **acervo deste
professor**, não do catálogo geral, e o CTA aponta para `#acervo` e para `/planos`
do próprio portal.

### 3.3 A imagem — e por que ela é o item que decide o prazo

Existe hoje `public/imagens/app-no-celular.jpg` (765×1374), derivada de
`midia/Celular.png`. Ela funciona, **e carrega dois problemas registrados no
próprio `LEIA-ME.md`**: procedência não apurada, e a tela dentro do celular é
simulada — aula, professora e nome inventados, barra de navegação em inglês com
palavras truncadas. Por isso ela leva `.selo-ilustrativo` na home.

Colocá-la também no portal do professor multiplica o problema por N portais.

**O caminho recomendado: capturar a tela de verdade.** Um script
`scripts/gerar-vitrine.mjs`, no molde do que os testes e2e já fazem:

1. Sobe o portal de demonstração (`scripts/demo/portal-professor.mjs` já cria o
   acervo com vídeo real).
2. Abre o Chromium com viewport de celular (390×844, `deviceScaleFactor: 2`) numa
   aula publicada.
3. **`reducedMotion: 'reduce'` obrigatório** — sem isso a página inteira abaixo da
   dobra sai em branco (`animation-timeline: view()`).
4. Salva o recorte e o compõe na moldura de celular.

O que se ganha: a figura passa a ser uma captura verdadeira da interface, **o
`.selo-ilustrativo` sai junto** — na home da plataforma também —, e a imagem se
atualiza sozinha quando a interface mudar. O que se perde: a mão segurando o
aparelho, que é o que dá calor à foto atual. Se a mão fizer falta, a composição é
"captura real dentro de moldura desenhada", que continua sendo interface real.

**Foto de aluno de verdade (pessoa identificável) fica fora da fase 1.** Ela é
imagem de pessoa (§2): exige banco com licença comercial *e* cessão de uso de
imagem, e enquanto não existir carrega selo. O item entra como **D3**.

### 3.4 Arquivos

| Arquivo | Mudança |
|---|---|
| `app/PaginaPortal.tsx` | seção 1 vira `.hero` + `.hero-grade` + `.hero-figura`; nova seção `.vitrine-app` antes da oferta |
| `app/globals.css` | nada de estrutura nova; no máximo ajuste de `.hero-grade` quando não há foto do professor |
| `scripts/gerar-vitrine.mjs` | **novo** — captura a figura do celular |
| `public/imagens/LEIA-ME.md` | registra o arquivo novo e retira as ressalvas resolvidas |

---

## 4. Fase 2 — o banner da página de cursos (imagem 4)

### 4.1 O que muda

`.cabeca-materia` (faixa cinza de 40px, igual à de toda página interna) dá lugar a
um banner de largura cheia, alinhado ao propósito da página: **escolher um curso.**

```
┌───────────────────────────────────────────────────────────────┐
│▓▓ gradiente da marca do portal ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓ Início › Cursos                                    ╭───────╮ ▓│
│▓ Todos os cursos de <Nome>,                         │ arte  │ ▓│
│▓ curso por curso                                    │ ou    │ ▓│
│▓                                                    │ foto  │ ▓│
│▓ 12 cursos · 148 aulas · 7 dias grátis              ╰───────╯ ▓│
│▓ [Começar pelo gratuito]                                      ▓│
└───────────────────────────────────────────────────────────────┘
```

Duas opções para o fundo, e a escolha muda o prazo:

| | Custo | Resultado |
|---|---|---|
| **A. Banner de marca desenhado** | zero arquivo; reaproveita `.chamada` + `.bolha` que já existem | funciona no mesmo dia, em **todos** os portais, e acompanha a `corPrimaria` de cada um |
| B. Banner com foto de fundo | uma imagem por portal, enviada pelo professor, com fallback | mais quente, mas portal sem banner cai no A de qualquer jeito |

**Recomendação: A agora, B como campo opcional na fase 4.** É o mesmo raciocínio
que o plano das prateleiras aplicou à capa (D2 de lá): a tela nasce inteira e
nunca aparece quebrada; a foto entra depois, por cima, sem refazer nada.

Cuidado obrigatório: texto branco sobre o gradiente de marca precisa passar em
`npm run contraste`. O gradiente `--grad-cta` (`#7c3aed → #8a63ff`) já é usado com
texto branco em `.chamada` e passa; um portal com `corPrimaria` clara **não** passa
— o banner tem de escurecer a cor do portal para o fundo, como `.capa-tom-*` já
faz com `color-mix(... , #150f2e)`, em vez de usá-la crua.

### 4.2 Onde mais isso aparece

A rota `/catalogo` é a mesma para plataforma, portal do professor e — via
redirecionamento — portal de empresa. O banner tem de ler `portalAtual()` e mudar
de texto:

- **plataforma**: como está hoje ("O catálogo, curso por curso").
- **professor**: o nome do portal no título, a contagem do acervo dele, CTA para
  a amostra gratuita.
- **empresa**: não passa por aqui (`redirect('/painel/trilhas')`), mas
  `app/painel/trilhas/` merece o mesmo banner, sem preço e sem "grátis" — lá o
  propósito é cumprir trilha, não comprar.

E a caixa `.sabia` de "lançamento em ondas" **só faz sentido na plataforma**. No
portal de um professor com quatro cursos, prometer "novas ondas a cada duas a
quatro semanas" é promessa que não é dele. Ela sai do portal e fica na plataforma.

### 4.3 Arquivos

| Arquivo | Mudança |
|---|---|
| `app/catalogo/page.tsx` | `.cabeca-materia` → banner; `.sabia` condicionada a `portalId === 0` |
| `app/globals.css` | `.banner-catalogo` (reaproveita `.chamada-lado`) |
| `app/painel/trilhas/page.tsx` | mesmo banner, texto de empresa |

---

## 5. Fase 3 — imagem em todo curso (o buraco real do pedido)

"Os cursos representados precisam ter imagens representando eles" é o item que
**já está desenhado e ainda não está inteiro**. Como está hoje:

1. `materia.capa` existe (`db/041_capa_da_materia.sql`).
2. A capa é gerada de um **quadro do vídeo** da aula, no envio
   (`lib/capa-video.ts`, chamado por `app/api/upload/route.ts`) ou em lote
   (`scripts/gerar-capas.mjs`).
3. Sem capa, o cartão cai no gradiente por área + ícone `play_circle`
   (`.capa-tom-1..6`, sorteado por hash do slug).

Três buracos, em ordem de impacto:

**3a — o professor não consegue enviar a capa dele.** É a opção A do §3 do
`plano-catalogo-em-prateleiras.md`, listada lá como aberta. O quadro de vídeo
acerta na média e erra feio no caso ruim: slide preto, rosto no meio de uma
palavra, transição. Hoje não há como corrigir pela interface. O trabalho já está
especificado, item por item:

- `app/api/upload/route.ts` — aceitar `?materiaId=`, espelho exato do `?aulaId=`
  que o vídeo já usa: confere que a matéria é **deste portal**, grava a coluna,
  apaga o arquivo anterior se era nosso, remede a cota.
- `lib/upload.ts` — `nomeNoVolume` ganha o meio `capa<materiaId>`, hoje fixo em
  `foto`, para o dono do arquivo seguir legível pelo nome sem ir ao banco.
- `app/professor/Enviar.tsx` — aceita `materiaId` como já aceita `aulaId`.
- `app/professor/cursos/` — o botão "Enviar capa" com a miniatura atual ao lado,
  na tela do curso.

**3b — escolher o quadro.** Extraídos 4 ou 5 quadros do vídeo em vez de um, o
professor clica no melhor. Bom, mas depende de 3a estar de pé, e o ganho é menor
que o de poder enviar arte própria. Fica para depois.

**3c — a reserva desenhada podia dizer mais.** Gradiente + `play_circle` é o mesmo
desenho para todos os cursos sem vídeo. Com a inicial da área ou o ícone dela por
cima do gradiente, a fila deixa de ter seis caixas iguais. Custo: CSS, e o campo
de ícone da área, que já existe no cadastro.

---

## 6. Fase 4 — "Meu acesso" (imagem 3)

**Esta é a fase com a leitura mais incerta** — ver **D1**. O termo "Meu acesso"
existe no código em um lugar só: o item do menu do **portal de empresa**
(`app/painel/layout.tsx:76` → `/painel/planos`). No portal do professor, o item
equivalente do topo se chama "Meu painel". A descrição do pedido ("direciona o
usuário para o painel administrativo do sistema para aluno ou para o professor")
descreve o comportamento de `lib/navegacao.ts:paginaInicial()`, que é o que roda
**depois do login**. As duas telas na rota, então:

**A tela de entrada (`app/entrar/page.tsx`).** Hoje: um cartão branco no meio de
uma faixa vazia, sem a marca do portal, sem nada do que existe atrás da porta.
Proposta: duas colunas — formulário à esquerda; à direita a identidade do portal
(marca do professor, três linhas de `.lista-check` do que o aluno recebe, e a
mesma figura do celular da fase 1, em tamanho menor). No celular a coluna da
direita some inteira; login em tela pequena é formulário, não vitrine.

**O destino depois do login (`/painel`).** Vale conferir se ele abre com o curso
em andamento em destaque ou com uma lista fria — mas isso é outra tela e outro
plano (`docs/plano-painel-do-colaborador.md` cobre a versão de empresa).

---

## 7. O que este plano não faz

- **Não copia depoimento nem retrato da plataforma para o portal do professor.**
  Aluno com nome e rosto sob o portal de outra pessoa é a promessa falsa do §2,
  agora multiplicada por portal.
- **Não põe foto de fundo atrás do texto do hero.** O padrão da identidade é hero
  branco; texto sobre foto é onde o contraste morre, e `npm run contraste` é o
  portão.
- **Não troca a prateleira por rolagem lateral.** Decidido e justificado em
  `app/catalogo/Prateleira.tsx` e no §7.4 do plano anterior.
- **Não mexe nas tabelas de gestão** (`app/professor/cursos/page.tsx`). Decisão D1
  do plano das prateleiras: ali o professor confere o que está no ar, não escolhe
  o que assistir.
- **Não altera a home da plataforma**, exceto a troca da figura simulada pela
  captura real (§3.3), que é ganho dos dois lados.

---

## 8. Ordem de execução

| Fase | Entrega | Depende de |
|---|---|---|
| **1** | Hero da página principal + seção do celular | nada (CSS já existe) |
| **1b** | `scripts/gerar-vitrine.mjs` — captura real substitui a figura encenada | portal de demonstração de pé |
| **2** | Banner da página de cursos, por tipo de portal | nada |
| **3a** | Envio de capa própria pelo professor | migração já aplicada (041) |
| **3c** | Reserva desenhada com ícone da área | nada |
| **4** | Tela de entrada em duas colunas | fase 1b (reaproveita a figura) |

As fases 1, 2 e 3c não tocam no banco e não têm dependência entre si — podem sair
juntas. A 3a é a única com rota de API e cota envolvidas.

---

## 9. Verificação

Cada fase fecha com o mesmo conjunto, na ordem:

```
npm run contraste                                   # portão da identidade
DATABASE_URL=postgres://…@localhost:5433/… npm test # sem isso, 55 testes são pulados em silêncio
npm run build
docker compose up -d --build                        # sem --build a tela nova dá 404 no site
node scripts/demo/portal-professor.mjs
node testes-e2e/painel-professor.mjs
```

O roteiro `portal-professor.mjs` é o que prova a fase inteira: ele monta um portal
com acervo e vídeo real, que é exatamente o cenário das três telas.

---

## 10. Riscos

1. **`corPrimaria` clara quebra o banner.** Portal com roxo pálido ou amarelo põe
   texto branco sobre fundo claro. A mitigação é escurecer a cor para o fundo do
   banner (`color-mix` com `#150f2e`, como `.capa-tom-*`), nunca usá-la crua — e
   `npm run contraste` tem de cobrir o par novo.
2. **A captura automática envelhece mal.** Se `gerar-vitrine.mjs` só rodar uma
   vez, daqui a três meses a figura mostra uma interface que não existe mais —
   pior que a encenada, porque ninguém desconfia dela. Ou entra no fluxo de
   release, ou fica registrado no `LEIA-ME.md` de quando é a captura.
3. **Portal sem nada cadastrado.** Professor recém-provisionado não tem foto, nem
   chamada, nem curso. O hero tem de ficar em pé com os três ausentes — hoje o
   `p.foto ? '1fr auto' : '1fr'` cobre um caso; o novo cobre os três, e o roteiro
   de demonstração precisa de um passo que abra um portal vazio.
4. **Peso da página.** A figura do celular é a maior imagem do portal. `loading="lazy"`
   na seção de baixo, e a do hero em WebP com `width`/`height` explícitos.

### Apareceram durante a execução

5. **`.secao.marca` colidia com `.marca`, a classe do logotipo** — e trazia junto
   `display:flex`, `font-weight:700`, `overflow:hidden` e
   `color: var(--primary-texto)`. O efeito visível: o título da seção inteiro na
   cor da marca, `<em>` e tudo, em vez de preto com metade em cor. Valia também
   para a home da plataforma, onde a seção do app no celular usa a mesma classe.
   **Resolvido:** o modificador de fundo passou a se chamar `lavanda`
   (`app/globals.css`, `app/page.tsx`, `app/PaginaPortal.tsx`). Nome de fundo de
   seção e nome de componente não podem ser a mesma palavra.

6. **O CTA continua roxo no portal de cor verde.** `.btn-primario` usa
   `--grad-cta`, que é cravado em `#7c3aed → #8a63ff` — o `<style>` do portal
   troca `--primary`, `--primary-texto`, `--primary-container` e
   `--on-primary-fixed-variant`, e o gradiente não está na lista. É anterior a
   este plano, mas ficou muito mais visível: no hero novo, o botão roxo encosta
   no título e no chip em verde. **Não foi mexido, de propósito.** Derivar o
   gradiente de `--primary` exige branco legível sobre a cor CRUA do portal, e
   portal de cor clara (amarelo, rosa) reprova em AA na hora — o caminho é o
   mesmo do banner (escurecer a cor antes de usá-la como fundo), mas isso muda o
   botão de TODA a plataforma, inclusive o roxo padrão. É decisão de identidade,
   não de layout de tela. Fica como **D6**.

7. **A capa não entra na cota de armazenamento.** `medirArmazenamento` conta
   vídeo, material de apoio e acervo — imagem de portal nunca entrou. A capa
   enviada segue a mesma regra (a anterior é apagada, então o consumo é limitado
   a uma por curso). Se um dia imagem passar a pesar na fatura, entra junto com a
   foto do portal, não sozinha.

---

## 11. Decisões

- **D1 — o que é a "imagem 3"?** *Bloqueia a fase 4, e só ela.* "Meu acesso" não
  existe com esse nome no portal do professor. É (a) a tela de login `/entrar`,
  (b) o item "Meu painel" do topo, ou (c) o painel de destino? O plano assume
  **(a) + o destino**, que é o que a descrição sugere. As fases 1 a 3 não dependem
  disto.
- **D2 — banner: desenhado ou com foto?** Recomendação: desenhado agora, campo de
  foto por portal na fase 4. Espelha a decisão D2 do plano das prateleiras.
- **D3 — foto de aluno de verdade entra?** Se sim, é preciso definir a origem
  (banco com licença comercial) e aceitar que a seção fica com
  `.selo-ilustrativo` até haver cessão de uso de imagem. Se não, a "execução dos
  cursos em celular" fica sendo a captura da interface, sem pessoa em quadro —
  que é o que o §3.3 recomenda.
- **D4 — a `.sabia` de ondas sai do portal do professor?** O plano assume que sim.
- **D5 — as capturas.** Assim que as quatro imagens chegarem, conferir §1 e §6:
  se o que está no ar já for diferente do código lido aqui, o levantamento muda
  antes da primeira linha de código.
- **D6 — o CTA acompanha a cor do portal?** Ver §10, item 6. Se sim, o gradiente
  passa a ser derivado de `--primary` com escurecimento (como o banner), e o
  botão da plataforma inteira muda de tom junto. Se não, o portal continua com o
  roxo da casa no botão principal, e vale registrar isso como decisão — hoje
  parece esquecimento.
