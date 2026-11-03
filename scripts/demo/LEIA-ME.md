# Conteúdo de demonstração — como recriar

Estes roteiros povoam o sistema **pelos fluxos de verdade**: os mesmos
formulários, ações de servidor e webhooks que um cliente usaria. É de
propósito. Um seed em SQL prova que o banco aceita a linha; um roteiro
que preenche a tela prova que o produto funciona — e foi assim que
quatro defeitos apareceram (estão listados no `discovery.md`, §5.11).

O que sobra em SQL são as dezenas de questões comentadas: elas já estão
escritas, e digitá-las uma a uma no navegador não provaria nada que o
primeiro formulário já não tenha provado.

## Ordem

Os quatro roteiros são **destrutivos e idempotentes**: cada um apaga o que
criou antes de recomeçar. A ordem importa, porque o aluno compra o curso
do professor:

```
node scripts/demo/portal-professor.mjs      # 1º — o portal do Prof. Otávio Lins
node scripts/demo/portal-empresa.mjs        # 2º — a Universidade Aurora
node scripts/demo/alunos-da-plataforma.mjs  # 3º — quem compra na vitrine da casa
PORTAL=otaviolins node scripts/demo/alunos-do-professor.mjs # 4º — a base de alunos DO professor
```

O quarto roteiro é o único parametrizado: `PORTAL` é a máscara do portal
(o subdomínio), e ele povoa a base de **qualquer** portal de professor
que esteja ATIVO, com subconta APROVADA e com curso publicado. Rodado
duas vezes, com máscaras diferentes, dá dois portais com base própria —
os alunos de um não aparecem no outro, que é justamente o que se quer
conferir.

Com o ambiente montado:

```
BASE_URL=http://localhost:3010 \
DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimore \
CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" \
DEMO_MIDIA=<pasta com imagens/ e portais/> \
node scripts/demo/portal-professor.mjs
```

`DEMO_MIDIA` aponta para a pasta com os arquivos de mídia; sem ela, o
padrão é `midia/demo/` na raiz do projeto. A pasta tem duas subpastas:

```
midia/demo/imagens/otavio-lins.jpg     foto do professor
midia/demo/imagens/aurora-logo.png     logo da empresa
midia/demo/portais/*.mp4               vídeos das aulas dos dois portais
midia/demo/documentos/*.pdf            acervo da Biblioteca da empresa
```

`midia/` está no .gitignore — vídeo não se versiona. Numa máquina nova,
esses arquivos precisam ser repostos antes de rodar os roteiros.

Os PDFs são a exceção: `node scripts/gerar-pdfs-demo.mjs` os cria do
nada, sem dependência nenhuma. Rode antes de `portal-empresa.mjs` — sem
eles, o envio do acervo falha ao escolher o arquivo.

## O que cada um cria

| Roteiro | Deixa no ar |
|---|---|
| `portal-professor.mjs` | Portal `otaviolins` ATIVO, com foto, chamada, propósito, "quem ensina", contato, cor própria e CNPJ no rodapé. Dois cursos (Penal e Administrativo), quatro aulas com vídeo e 23 questões comentadas. O curso de Administrativo vai à vitrine da plataforma. O de Penal é o **curso em destaque** do catálogo (db/043), e os dois têm nível cadastrado e uma aula de amostra gratuita — é ela que roda como prévia na capa do cartão. |
| `portal-empresa.mjs` | Portal `aurora` (EMPRESA) ATIVO no plano Pro, com logo, marca e autocadastro por domínio. Seis trilhas, oito aulas, seis avaliações finais, três setores, convites por link, importação por CSV, seis atribuições — e uma colaboradora que assistiu, fez a prova e tirou o certificado. A **Biblioteca** fica com três itens publicados (dois PDF e um link; um deles restrito ao setor Lojas), e o roteiro percorre o painel do colaborador: o submenu "Minha Jornada", as telas que trocam sem o menu ir junto, o filtro por assunto e o PDF que não abre sem sessão. |
| `alunos-da-plataforma.mjs` | Quatro alunos em estágios diferentes: compra anual de um curso, passe completo mensal, teste de 7 dias, e a compra do curso do professor parceiro pela nossa vitrine (venda nossa, com comissão a ele). |
| `alunos-do-professor.mjs` | Quatro alunos **dentro do portal indicado** (`PORTAL=`), em situações que enchem as telas "Alunos" e "Financeiro" do painel do professor: curso avulso anual pago, passe completo mensal pago, compra devolvida por reembolso nos 7 dias (CDC, art. 49) e pedido aberto sem pagar. Com aulas concluídas e exercícios respondidos — com erro e acerto —, para o progresso e o caderno de erros terem lastro. |
| `professor-tecnologiaempaula-ia.sql` | Assunto e três aulas publicadas, com resumo e exercício comentado, no curso "Entendendo a IA" do portal `tecnologiaempaula`. **Sem vídeo de propósito**: quem anexa a gravação é o professor, em "Vídeos das aulas" — é o caminho que a tela existe para demonstrar. |

## Contas criadas

Senhas de demonstração, em ambiente local. **Não use nada disto em
produção.**

| Papel | E-mail | Senha |
|---|---|---|
| Professor (portal `otaviolins`) | `otavio.lins@exemplo.com.br` | `aulas-de-penal-2026` |
| RH (portal `aurora`) | `treinamento@grupoaurora.com.br` | `universidade-aurora-2026` |
| Colaboradora (dentro de `aurora`) | `tereza.souza@grupoaurora.com.br` | `minha-senha-aurora` |
| Aluna da plataforma | `camila.ferraz@exemplo.com.br` | `estudar-todo-dia-2026` |
| Alunos do portal do professor (os quatro) | `ana.prado@`, `bruno.tavares@`, `carla.mendes@`, `diego.rocha@` — todos `aluno-demo.com.br` | `aluno-demo-2026` |

Os quatro alunos do portal entram **no endereço do portal**
(`http://<mascara>.localhost:3010/entrar`), não no site principal: a base
do professor é dele, e a conta não existe fora dali.

O portal do professor responde em `http://otaviolins.localhost:3010`, o
da empresa em `http://aurora.localhost:3010` — subdomínio de `localhost`
funciona no navegador sem DNS nem arquivo de hosts.

## Os vídeos

Todo vídeo usado é publicado no YouTube sob **licença Creative Commons
Atribuição (CC BY)**, que permite a reprodução com crédito ao autor. O
crédito não é gentileza: é a condição da licença, e por isso o **último
parágrafo do resumo de cada aula** traz o título original, o canal, a
licença e o trecho usado. Apagar esse parágrafo é perder o direito de
reproduzir o vídeo.

Os arquivos vivem no volume `midia` do Compose (`/midia/video`), fora do
git e fora da imagem. Se o volume for recriado, os roteiros recopiam o
que criam; para as aulas da plataforma, os arquivos precisam ser
repostos à mão com o nome que `aula.video_id` declara.

**Uma aula publicada não tem gravação** — `poder-constituinte` — porque
não achamos vídeo em licença compatível para o tema. A página serve
resumo, dispositivos e exercício do mesmo jeito, e diz que a gravação
está em produção. É o comportamento correto, não um defeito.

## Retratos e imagens

A foto do professor vem de `public/retratos/docente-05.jpg`, um retrato
**sintético** cuja procedência e termos de uso estão em
`public/retratos/LEIA-ME.md` — e cujas ressalvas continuam valendo: é um
professor que não existe, e antes de publicar isso vira retrato de gente
real com cessão de uso, ou sai. A logo da Aurora foi gerada aqui mesmo,
como imagem de uma página HTML.
