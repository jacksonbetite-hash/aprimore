# Entrega de vídeo

Como a gravação de uma aula sai do disco e chega ao aluno — e o que impede
que chegue a quem não pagou.

## O desenho em uma frase

O servidor **decide** quem assiste; outra coisa **transporta** os bytes.

Separar as duas metades é a decisão central deste subsistema, e é o que
permite trocar o transporte (Node → nginx → CDN) sem mexer em nada acima.

```
página da aula                    /api/video/[id]                  disco
─────────────                     ───────────────                  ─────
podeAcessar()  ──libera──▶  urlDeReproducao()
  (§6.3, caro,                 assina HMAC
   uma vez por                      │
   carregamento)                    ▼
                            <video src="...?e=&u=&t=">
                                    │
                                    ▼
                            confere HMAC (barato,
                            centenas de vezes)  ────────▶  bytes
                            sem banco, sem sessão
```

A metade de baixo não abre o banco nem resolve sessão. É por isso que ela
pode um dia sair daqui e virar um CDN: é exatamente o que a autenticação
por token de Bunny e Cloudflare faz.

## Os arquivos

| Arquivo | Papel |
|---|---|
| [`lib/video.ts`](../lib/video.ts) | Assina e confere o token; faixa de bytes; marca d'água |
| [`lib/video.test.ts`](../lib/video.test.ts) | A matriz de ataque: token trocado, esticado, vencido, travessia de diretório |
| [`app/api/video/[id]/route.ts`](../app/api/video/%5Bid%5D/route.ts) | Entrega os bytes (ou delega ao nginx) |
| [`app/PlayerAula.tsx`](../app/PlayerAula.tsx) | Player, marca d'água itinerante, retomada |
| [`nginx/aprimoreosaber.conf`](../nginx/aprimoreosaber.conf) | `X-Accel-Redirect` e a location interna |
| [`db/013_video.sql`](../db/013_video.sql) | `aula.(video_provedor, video_id)` |

## Onde os arquivos moram

Em `VIDEO_RAIZ` — `./midia/video` local, o volume `midia` no Compose.

Três lugares onde eles **não** podem estar, e o motivo:

- **`public/`** — o Dockerfile faz `COPY public ./public`. Cem gigabytes de
  aula entrariam na imagem e todo `docker build` viraria uma operação de
  dezenas de minutos.
- **git** — um clone do repositório passaria a ser inviável. `/midia` está
  no `.gitignore`.
- **junto do backup do Postgres** — o volume `midia` **não** entra no dump
  do banco. Ele precisa de rotina própria. Esta é a frase mais fácil de
  esquecer deste documento.

## Rodando localmente

```bash
docker compose up -d db          # banco
npm run migrate                  # aplica 013_video.sql
npm run video                    # gera o vídeo do hero (precisa de ffmpeg)
npm run video:local              # copia o hero para as aulas publicadas
npm run dev
```

`npm run video:local` não gera conteúdo: ele copia
`public/video/apresentacao.mp4` com o nome de cada aula e aponta
`(video_provedor, video_id)` para lá. Serve para exercitar o caminho
inteiro — URL assinada, faixa de bytes, marca d'água, retomada — sem
depender de gravação nenhuma. `--limpar` desfaz.

Sem `VIDEO_SEGREDO` no ambiente, o desenvolvimento usa um segredo fixo
conhecido. Em produção o sistema **recusa subir** sem ele.

## Na VPS

O Node entregando vídeo aguenta desenvolvimento e pouca gente. Numa turma
assistindo à noite, ele não aguenta: centenas de megabytes atravessando o
event loop deixam o site inteiro lento, inclusive para quem só está
fazendo exercício. Por isso, na VPS, o nginx é obrigatório.

```bash
./scripts/vps/subir.sh
```

O `docker-compose.vps.yml` liga `VIDEO_ACCEL_REDIRECT=/midia-interna` e
fecha a porta 3000; o perfil `vps` sobe o nginx e o Caddy (HTTPS). O
passo a passo completo — `.env`, segredos, modo IP e domínio — está em
[`implantacao-vps.md`](implantacao-vps.md).

A linha mais importante do `nginx/aprimoreosaber.conf` é o `internal`
da location `/midia-interna/`: ela não responde a requisição vinda da rua.
Só o próprio nginx chega nela, e só depois que a aplicação conferiu a
assinatura. Tirar essa palavra publica o acervo inteiro.

### Subindo as aulas

O volume é nomeado, então o caminho no host sai de
`docker volume inspect aprimoreosaber_midia`. Ou, mais simples:

```bash
docker compose cp aula-01.mp4 web:/midia/video/aula-01.mp4
```

E no banco:

```sql
UPDATE aula SET video_provedor = 'LOCAL', video_id = 'aula-01.mp4'
 WHERE slug = 'nome-da-aula';
```

## Quando migrar para CDN

Os sinais, em ordem de chegada:

1. A banda da VPS encosta em **60% do link** no horário de pico.
2. Alunos relatam travamento à noite.
3. A cota mensal do plano começa a ser um número que você olha.

O caminho é um *pull zone* (BunnyCDN é o melhor custo para este porte): os
arquivos continuam na VPS, o CDN puxa na primeira requisição e serve todas
as seguintes do edge. Sua VPS passa a entregar cada aula **uma vez**, não
mil — e alunos no Brasil deixam de buscar bytes na Europa.

No código, isso é **uma função**: o `case 'BUNNY'` de `urlDeReproducao`,
que hoje lança um erro explicando isso. O resto do sistema não muda uma
linha, porque nada acima dele conhece endereço de vídeo.

## O que isto protege, e o que não protege

Vale ser honesto, porque a alternativa é confiar em algo que não existe.

**Protege:**

- Assistir sem licença — a URL só é gerada depois que `podeAcessar` libera.
  Numa aula bloqueada, o HTML não contém endereço de vídeo nenhum.
- Link compartilhado — expira em 6 horas e é assinado com o id do aluno.
- Reaproveitar o token de uma aula em outra, ou de um aluno em outro.
- Travessia de diretório, mesmo com token válido.

**Não protege** — e nada protege, fora DRM:

- O aluno logado baixar o próprio arquivo. `controlsList="nodownload"` e o
  menu de contexto bloqueado são lombadas, não muros: escondem o botão de
  quem não pensou em baixar. Quem abre o DevTools acha a URL.

Contra isso vale a **marca d'água**: nome e e-mail parcial do aluno
flutuando por cima da imagem, trocando de canto a cada 40 s. Fixa no
canto, bastaria cortar a borda; andando, sai junto com metade da aula.
Ela não impede a cópia — dá dono a ela. Em curso jurídico é o que muda
comportamento: quem vaza sabe que a cópia aponta para ele.

O e-mail vai mascarado (`ana · an•••@exemplo.com`) de propósito: identifica
para quem investiga sem entregar o endereço a quem recebeu a cópia. CPF não
entra — identificaria melhor e vazaria muito pior.

### Cortando um vazamento

Trocar `VIDEO_SEGREDO` invalida **todos** os endereços já entregues, na
hora. Quem estava assistindo recarrega a página e continua. É a única
alavanca de emergência do subsistema, e ela é barata.

## O que ficou de fora

- **HLS.** Hoje serve-se MP4 progressivo com faixa de bytes, que funciona
  em todo navegador. HLS (com qualidade adaptativa, e opcionalmente chave
  AES) é o próximo degrau quando houver aluno em conexão ruim. O
  empacotamento seria um script com ffmpeg, como o do hero; `tipoDoArquivo`
  já conhece `.m3u8` e `.ts`.
- **DRM** (Widevine/FairPlay). Só faz sentido com escala que justifique o
  custo e a complicação no player. Antes disso, é gastar contra uma ameaça
  que ainda não chegou.
- **Legendas.** `.vtt` já é tipo conhecido; falta a coluna e a trilha no
  player.
