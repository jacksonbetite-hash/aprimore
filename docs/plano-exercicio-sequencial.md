# Plano — exercício sequencial, em aba própria

Pedido de 09/09/2026, do teste com conta de aluno no portal do professor:
"a tela de exercício precisa ser sequencial — respondida a primeira questão,
navegar para a próxima em vez de rolar a tela — e avaliar se o exercício
deve virar uma aba entre Resumo e Materiais".

Levantamento feito lendo `app/Exercicio.tsx`, `app/AbasAula.tsx`,
`app/aula/[slug]/ConteudoAula.tsx`, `app/prova/[slug]/Prova.tsx` (a prova
da empresa, para não inventar um segundo padrão) e os três roteiros de
demonstração que respondem exercício pelo navegador.

---

## 1. O que existe hoje, e por que incomoda

| Hoje | Consequência |
|---|---|
| As N questões vêm **todas empilhadas** numa seção abaixo das abas (`#exercicio`) | Numa aula com 6 questões a página passa de 8 mil px; o aluno responde a 1ª e precisa **rolar** até achar a 2ª, passando pelo comentário inteiro da anterior |
| O exercício fica **fora das abas**, alcançado por um bloco "Pronto para testar?" com âncora | Quem está na aba Resumo não vê que o exercício existe até rolar; e a aba Materiais, que quase nunca tem conteúdo, tem lugar de honra que o exercício não tem |
| O resultado ("Exercício concluído — 4 de 6") aparece no rodapé da pilha | Só quem rolou tudo vê; e não há caminho para a **próxima aula** dali |
| A prova da empresa (`Prova.tsx`) já é outra tela, sem correção imediata | Não é modelo para copiar: aqui a correção é imediata (§5.3), o que pede um passo por questão |

## 2. Decisão: aba "Exercício" entre Resumo e Materiais — **sim**

Argumentos a favor, que pesaram mais:

- **Ordem de estudo é a ordem das abas**: Resumo → Exercício → Materiais →
  Artigos citados. "Toda aula termina em exercício" (§5.3) fica visível no
  próprio menu, e não escondido abaixo da dobra.
- **O rótulo da aba carrega o estado**: `Exercício · 5/6` diz de longe que
  o exercício já foi feito, e quanto falta — a mesma informação que hoje só
  aparece depois de rolar.
- **Um passo por questão cabe numa aba**; empilhado, não caberia — é o
  motivo de a pilha existir hoje.
- A lateral (módulo + biblioteca) continua ao lado, como na aba Resumo.

O que poderia pesar contra, e como se resolve:

| Risco | Resposta |
|---|---|
| Aba é estado de cliente: o link `#exercicio` (botão "Fazer o exercício", roteiros de demonstração) deixaria de chegar lá | `AbasAula` passa a abrir a aba pela **âncora** (`#exercicio`) no carregamento e no `hashchange`. Link continua funcionando; o roteiro que navega para `/aula/x#exercicio` cai na aba certa |
| Conteúdo de aba inativa fica `display: none` — clique do Playwright em elemento invisível falha | Os roteiros passam a abrir a aba (pela âncora) antes de responder; e o helper que responde passa a clicar em **"Próxima questão"** entre uma e outra, que é o que o aluno faz |
| Aula bloqueada (sem licença) mostraria uma aba vazia | A aba existe também na aula bloqueada, com o mesmo texto de oferta de hoje ("Exercício com N questões comentadas — abre junto com a aula") |
| O bloco "Pronto para testar seus conhecimentos?" abaixo das abas perde o sentido | Sai. Em seu lugar, o **fim do Resumo** ganha o chamado "Terminou o resumo? Fazer o exercício →", que abre a aba |

## 3. O exercício, passo a passo

Componente: `app/Exercicio.tsx` (cliente). Continua recebendo as questões
com gabarito e comentários (§5.3: correção imediata) e as respostas já dadas
(`respostasDaAula`).

| Peça | Comportamento |
|---|---|
| **Passos** | Uma fila de marcadores numerados (1…N), clicáveis: verde = acertou, vermelho = errou, contorno = pendente, cheio = a atual. Navegação livre — o aluno pode voltar a qualquer questão respondida para reler o comentário |
| **Uma questão por vez** | Só a questão atual renderiza. Enunciado, alternativas, e — depois de marcar — o comentário do professor, como hoje |
| **Início** | Na primeira questão **não respondida**. Se todas já foram respondidas em visita anterior, abre direto no **resultado** |
| **Depois de responder** | Aparecem "← Anterior" e **"Próxima questão →"** (na última: **"Ver resultado"**). Antes de responder, "Próxima" não aparece: a sequência é o método |
| **Resultado** | Nota (acertos/N e %), lista das questões com acerto/erro (clicar volta à questão), "Refazer as que errei" e **"Próxima aula →"** quando existe — o caminho natural que hoje não existe |
| **Refazer** | Continua por questão ("Refazer esta questão"), porque é o que tira a questão do caderno de erros (§5.2). "Refazer as que errei" no resultado leva à primeira errada com ela liberada |
| **Rótulo da aba** | `Exercício` sem resposta; `Exercício · 3/6` em andamento; `Exercício ✓ 5/6` concluído (acertos/total). Vem do servidor, calculado sobre as respostas do banco |
| **Rolagem** | Ao trocar de questão, a tela sobe até o topo do exercício — sem isso, a próxima questão nasce fora da vista quando o comentário era longo |
| **Acessibilidade** | Passos são `<button>` com `aria-current`; a região da questão é `aria-live="polite"` para o leitor de tela anunciar a troca |

Fora do escopo desta rodada: cronômetro, embaralhar alternativas, refazer o
exercício inteiro de uma vez (o "Refazer as que errei" cobre o caso de uso).

## 4. Ordem de execução

1. `AbasAula` — abertura por âncora e `hashchange`; aba com `contador`
   opcional ao lado do rótulo.
2. `Exercicio` — reescrita para o passo a passo (estado: `atual`,
   `respostas`, `antigas`, `resultado`).
3. `ConteudoAula` — aba "Exercício" entre Resumo e Materiais (liberada e
   bloqueada), chamada no fim do Resumo, remoção do bloco abaixo das abas,
   `proxima` passada ao exercício.
4. CSS — `.passos-exercicio`, `.nav-exercicio`, `.resultado-exercicio` (já
   existe; ganha a lista).
5. Roteiros de demonstração — `alunos-da-plataforma`, `alunos-do-professor`,
   `portal-empresa`: abrir a aba e avançar entre questões.
6. Verificação — `tsc`, `npm test`, container reconstruído, conferência no
   navegador com a Ana (5/6 respondidas → abre na 6ª; resultado; refazer) e
   com a Carla (aula sem resposta → começa na 1ª), e um roteiro de
   demonstração rodado de novo.

## 5. Estado

> **Entregue em 09/09/2026**, na ordem do §4, sem desvio do plano. O que
> apareceu pelo caminho:
>
> - **Quatro ícones não existiam** no conjunto desenhado à mão de
>   `app/ui.tsx` (`cancel`, `pause_circle`, `radio_button_unchecked`,
>   `flag`) — `Icone` devolve nada em silêncio para nome desconhecido, então
>   o marcador do resultado e o "errou" saíam como círculo vazio. Entraram
>   no mesmo traço. Vale lembrar: ícone novo, conferir a lista antes.
> - **Dois e2e** (`comercial.mjs`, `autenticacao.mjs`) usavam a visibilidade
>   de `.alternativa` como prova de que a aula abriu; com o exercício na
>   aba, passaram a navegar para `#exercicio`, e as asserções de "não
>   abriu" ficaram mais fortes — contam alternativas em vez de olhar
>   visibilidade (aula bloqueada não recebe gabarito nem escondido).
> - Verificado no navegador com a Ana (5/6 respondidas → abre na 6ª; passo
>   1 relê o comentário antigo; responder a 6ª → "Ver resultado" → resultado
>   com as 6 e "Próxima aula"; "Refazer as que errei" libera a errada) e na
>   parte 2 (sem resposta → começa na 1ª, marcador do resultado desligado).
>   `npm test` 370/370, `tsc` limpo, `comercial`, `autenticacao`,
>   `alunos-do-professor` e `portal-empresa` passando contra o container
>   reconstruído.
