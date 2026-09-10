# A página de cursos como vitrine — layout de 09/09/2026

O dono do projeto entregou um layout novo para `/catalogo` dentro do portal de
um professor (`http://otaviolins.localhost:3010/catalogo`): uma vitrine no
formato de plataforma de streaming — banner de um curso em destaque, barra de
busca com filtros, grade de cartões com prévia ao passar o mouse, seção do
celular, faixa do passe completo e dúvidas frequentes.

Este documento registra **o que foi adotado, o que foi recusado e por quê** —
como os planos anteriores (`plano-catalogo-em-prateleiras.md`,
`plano-vitrine-do-professor.md`), que continuam valendo no que não foi mudado
aqui.

---

## 1. O que a página era, e o que passou a ser

| Antes | Agora |
|---|---|
| `.banner-catalogo`: faixa de marca com o título "Todos os cursos de X" e um mosaico decorativo de três capas | `.destaque-catalogo`: **um curso**, com a capa dele em tamanho de cartaz, ementa, números e o botão que abre a aula aberta |
| Barra de filtros: busca, área, situação, professor, ordem | A mesma barra, mais **nível**, com "situação" virando **disponibilidade** em três estados e pílulas do que está ligado |
| Cartão: capa, título, ementa, "N aulas · duração" e preço na mesma linha | Cartão com **duas pílulas** na capa, **prévia em vídeo no hover**, linha de metadados e **caixa de preço** com "incluso no passe" |
| Fim da página: faixa do passe completo | Faixa do passe (com o preço real do `CATALOGO`), **seção do celular** e **dúvidas frequentes** |

A troca do banner tem um motivo, e não é estética: a faixa antiga falava do
*catálogo* ("O catálogo, curso por curso"), e quem entra numa vitrine não quer
saber do catálogo — quer ver um curso.

---

## 2. O que o banco não sabia responder, e virou cadastro

Duas colunas novas em `materia` (`db/043_catalogo_em_destaque.sql`), com o
controle correspondente no formulário do curso — que é o mesmo no painel do
professor e na retaguarda da plataforma (`app/admin/cursos/FormMateria.tsx`):

- **`destaque`** — qual curso abre a página no banner. Marcador, não posição:
  marcar dois não quebra (ganha o de menor `ordem`), não marcar nenhum cai no
  primeiro publicado. Sem a coluna, a escolha seria "o primeiro da ordem", e
  mudar o banner exigiria reordenar o acervo inteiro.
- **`nivel`** — a quem o curso se dirige; é o filtro "Todos os níveis". **Texto
  livre, não enum:** o portal é white-label, e os três níveis do layout
  ("Graduação/Teoria", "Prática Forense", "OAB & Concursos") são de um portal de
  Direito. As opções do filtro nascem do `DISTINCT` do que o professor
  cadastrou — mesma escolha do `assuntos` do acervo da empresa (`db/042`) e do
  filtro de professor, que já funcionava assim.

O que **não** virou coluna: a disponibilidade ("Disponível", "Em gravação", "Em
breve"). Ela é derivada do que já existe — publicado com aula no ar, publicado
sem aula, e sem onda marcada (`disponibilidadeDe`, em `CartaoCurso.tsx`). Coluna
para isso seria um segundo lugar para dizer a mesma coisa, e os dois divergiriam
na primeira vez que alguém publicasse pelo outro caminho.

---

## 3. A prévia no hover

**O pedido:** passar o mouse sobre a imagem do curso permite "a execução do
curso sem realmente entrar no curso".

**Como foi feito:** `app/catalogo/PreviaCapa.tsx` cobre a capa com uma camada que
carrega o vídeo no primeiro hover e o roda mudo por até 20 segundos.

As guardas, e por que cada uma existe:

| Guarda | Porque |
|---|---|
| Só **amostra gratuita** publicada, com vídeo | É a única aula que §6.1 abre a quem não assinou. Sem isso, o cartão entregaria aula paga a qualquer visitante e a licença de §6.3 viraria decoração |
| Endereço **assinado no servidor**, visitante 0, prazo de 30 min | Mesmo caminho da página da aula (`lib/video.ts`); prazo curto porque a prévia se vê no minuto em que a página abre |
| `preload="none"` e `src` só no primeiro hover | Tráfego de vídeo é cota faturada do portal (§5.10) — uma prateleira de doze cursos não pode começar doze downloads porque a página abriu |
| Vinte segundos e volta ao começo | É prévia, não sessão de estudo |
| `prefers-reduced-motion` desliga | Quem pediu menos movimento não recebe vídeo começando sozinho — e as capturas do roteiro de demonstração continuam estáveis |
| A camada **não** intercepta o clique | O cartão inteiro continua sendo o link para o curso; no toque, onde não há hover, nada se perde |

**O controle disso na retaguarda já existia:** é o marcador "amostra gratuita"
da aula. O que faltava era o professor saber qual aula ele escolheu — a tela do
curso ganhou o bloco "Prévia do cartão", que diz o título da aula que está
rodando (ou avisa que não há nenhuma).

---

## 4. O que do layout NÃO entrou

O layout de referência traz, e a página não copiou:

| No layout | Por que ficou de fora |
|---|---|
| "5.0 (1.420 avaliações)", "4.9" nos cartões | Não existe avaliação de curso neste banco. Nota inventada sob a marca de um professor é publicidade enganosa (CDC, art. 37) — a mesma régua que derrubou o "4,9" na vitrine do portal |
| "Gravação 4K HDR · Atualizado 2025" | A resolução não é cadastrada, e a data era fixa. No lugar entrou "atualizado em ⟨mês/ano⟩", tirado da última aula publicada |
| "184 inscritos" na lista de espera | Não há lista de espera com contagem |
| "Modo Offline — baixe módulos no app" | A plataforma não baixa aula para ver sem rede |
| "Velocidade ajustável até 2.0x sem distorção" | A velocidade é a do player do navegador, não um recurso nosso |
| "Previsto p/ Março 2025" no curso em breve | Data de lançamento não é cadastrada; o que existe é a onda |
| "Lançamento Modular em Ondas · novos módulos a cada 15 dias" | Cadência é promessa do professor, e o suporte que responderia por ela é o nosso. Aquela caixa continua **só na plataforma** — e há passo de roteiro cravando que ela não aparece no portal |
| As capas "Direito Penal Descomplicado" e "Prática Processual Penal" | Trazem o nome de outro professor gravado na arte e um selo "AO VIVO" de recurso inexistente. Capa é conteúdo: sai do vídeo ou do arquivo que o professor envia (ver `public/imagens/LEIA-ME.md`) |
| A foto do celular | A que já estava no repositório mostra a mesma coisa com quase cinco vezes mais resolução |

No lugar da faixa de ondas, dentro do portal do professor, entrou a **faixa de
garantias**: sete dias para desistir (CDC, art. 49), cobrança e suporte pela
plataforma, cancelamento em dois cliques. As três são verificáveis e valem em
qualquer portal.

A imagem de estúdio do layout **foi** adotada, como reserva: ela só aparece no
portal cujo curso em destaque ainda não tem capa, e leva o selo de imagem
ilustrativa enquanto aparece (`public/imagens/LEIA-ME.md`).

---

## 5. A lâmpada como marca da plataforma

O símbolo do topo do layout — ladrilho roxo de canto arredondado, lâmpada em
traço branco, halo roxo embaixo — virou **a** marca, em `Marca` (`app/ui.tsx`) e
no favicon (`app/icon.svg`, o mesmo desenho). Onde a marca aparece, é ela: topo,
rodapé e aba do navegador.

Continua em SVG embutido, e não em imagem, pela razão de sempre: assim a cor sai
de `--primary-container`, que o portal de cada professor sobrescreve com a cor
dele, e a marca nunca depende de uma requisição de rede para aparecer.

A linha miúda embaixo do nome ("por Aprimore o Saber") é do layout e ficou —
mas só no portal de um **professor**. Ela é a mesma informação do rodapé legal
(§5.10), agora onde a pessoa olha primeiro. No portal de uma **empresa** não
aparece: ali o portal é interno, e o nome do fornecedor no alto da tela do
colaborador não acrescenta nada a ele.

---

## 6. Contraste

Os pares novos entraram em `scripts/contraste.mjs`. O pior caso do banner é o
portal de cor **branca** com capa **branca**, no ponto mais claro por onde o
texto passa: `#545060`, que dá 7,80:1 com branco. Quem mexer nas opacidades da
`.destaque-cortina` refaz aqueles hexes antes de commitar — o script é o portão,
e nada de identidade entra com ele vermelho.
