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

Os três roteiros são **destrutivos e idempotentes**: cada um apaga o que
criou antes de recomeçar. A ordem importa, porque o aluno compra o curso
do professor:

```
node scripts/demo/portal-professor.mjs      # 1º — o portal do Prof. Otávio Lins
node scripts/demo/portal-empresa.mjs        # 2º — a Universidade Aurora
node scripts/demo/alunos-da-plataforma.mjs  # 3º — quem compra na vitrine da casa
```

Com o ambiente montado:

```
BASE_URL=http://localhost:3010 \
DATABASE_URL=postgres://aprimore:aprimore@localhost:5433/aprimoreosaber \
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
```

`midia/` está no .gitignore — vídeo não se versiona. Numa máquina nova,
esses arquivos precisam ser repostos antes de rodar os roteiros.

## O que cada um cria

| Roteiro | Deixa no ar |
|---|---|
| `portal-professor.mjs` | Portal `otaviolins` ATIVO, com foto, chamada, propósito, "quem ensina", contato, cor própria e CNPJ no rodapé. Dois cursos (Penal e Administrativo), quatro aulas com vídeo e 23 questões comentadas. O curso de Administrativo vai à vitrine da plataforma. |
| `portal-empresa.mjs` | Portal `aurora` (EMPRESA) ATIVO no plano Pro, com logo, marca e autocadastro por domínio. Seis trilhas, oito aulas, seis avaliações finais, três setores, convites por link, importação por CSV, seis atribuições — e uma colaboradora que assistiu, fez a prova e tirou o certificado. |
| `alunos-da-plataforma.mjs` | Quatro alunos em estágios diferentes: compra anual de um curso, passe completo mensal, teste de 7 dias, e a compra do curso do professor parceiro pela nossa vitrine (venda nossa, com comissão a ele). |

## Contas criadas

Senhas de demonstração, em ambiente local. **Não use nada disto em
produção.**

| Papel | E-mail | Senha |
|---|---|---|
| Professor (portal `otaviolins`) | `otavio.lins@exemplo.com.br` | `aulas-de-penal-2026` |
| RH (portal `aurora`) | `treinamento@grupoaurora.com.br` | `universidade-aurora-2026` |
| Colaboradora (dentro de `aurora`) | `tereza.souza@grupoaurora.com.br` | `minha-senha-aurora` |
| Aluna da plataforma | `camila.ferraz@exemplo.com.br` | `estudar-todo-dia-2026` |

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
