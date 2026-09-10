import { spawn } from 'node:child_process';
import { mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { query, queryOne } from './db.ts';
import { nomeDeCapa, pertenceAoPortal } from './upload.ts';
import { idDeVideoValido } from './video.ts';

/**
 * A capa do curso, tirada do próprio vídeo (§10 — a mídia mora no volume).
 *
 * O catálogo virou vitrine de cartões com capa, e a pergunta prática era
 * de onde sai a imagem. Pedir arte a cada professor emperra a publicação;
 * banco de imagens não diz nada sobre a aula. Um quadro da própria aula
 * diz — e já está no disco.
 *
 * Quem chama: o envio de vídeo pelo painel (`app/api/upload/route.ts`),
 * para o curso que ainda não tem capa, e `scripts/gerar-capas.mjs`, para
 * o acervo que já existia. Os dois passam por aqui, e não cada um pelo
 * seu ffmpeg: o enquadramento e a qualidade da capa são uma decisão só.
 *
 * Falhar aqui nunca pode derrubar o envio do vídeo. O vídeo é o que o
 * professor veio fazer; a capa é acabamento, e sem ela o cartão cai no
 * gradiente da área, que é a reserva desenhada de sempre.
 */

const FFMPEG = process.env.FFMPEG || 'ffmpeg';

/* Mesma resolução das outras rotas de mídia (vídeo, imagem): o volume é
   um só, e o caminho vem do ambiente para o container montar onde quiser. */
const VIDEO_RAIZ = path.resolve(/*turbopackIgnore: true*/ process.env.VIDEO_RAIZ ?? './midia/video');
const IMAGEM_RAIZ = path.resolve(
  /*turbopackIgnore: true*/ process.env.IMAGEM_RAIZ ?? path.join(path.dirname(VIDEO_RAIZ), 'imagem'),
);

/** 640×360 — 16:9, e o dobro do cartão, que renderiza a ~320px. */
const LARGURA = 640;
const ALTURA = 360;

/**
 * Em que segundo cortar o quadro.
 *
 * O primeiro quadro quase nunca serve: aula começa em preto, em vinheta,
 * em slide de abertura ou no professor ainda se ajeitando. Um quinto da
 * duração cai dentro do conteúdo tanto em aula curta quanto em longa.
 *
 * O teto de um minuto e meio existe só para vídeo longo não ir buscar o
 * quadro no minuto 12 — e é largo de propósito: com `-ss` antes do `-i`
 * a busca é por índice e custa o mesmo em qualquer posição, enquanto um
 * teto curto (20s, na primeira versão) caía DENTRO da vinheta e rendia
 * capa de cartela de abertura, com a marca de quem produziu o vídeo.
 */
export function instanteDaCapa(duracaoSegundos: number): number {
  if (!Number.isFinite(duracaoSegundos) || duracaoSegundos <= 5) return 1;
  return Math.min(90, Math.max(2, Math.round(duracaoSegundos * 0.2)));
}

/** O ffmpeg, com o erro dele legível se der errado. */
function executar(args: string[]): Promise<void> {
  return new Promise((ok, falhou) => {
    /* `turbopackIgnore`: o binário vem do ambiente, e sem a marca o
       Turbopack conclui que precisa rastrear o projeto inteiro para
       dentro do standalone — a imagem incharia com o repositório todo,
       public/ inclusive. É a mesma marca que as rotas de mídia usam. */
    const p = spawn(/*turbopackIgnore: true*/ FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let erro = '';
    p.stderr.on('data', (b) => { erro += b.toString(); });
    p.on('error', (e) => falhou(
      new Error(`ffmpeg não pôde ser executado (${(e as Error).message}). Defina FFMPEG ou instale-o.`),
    ));
    p.on('close', (code) => (code === 0
      ? ok()
      : falhou(new Error(`ffmpeg saiu com ${code}: ${erro.trim().slice(0, 300)}`))));
  });
}

/**
 * Extrai um quadro do vídeo e grava como JPG 640×360.
 *
 * `-ss` antes do `-i` é busca rápida: o ffmpeg salta pelo índice do
 * arquivo em vez de decodificar tudo até lá. A diferença é de segundos
 * para milissegundos, e o envio de vídeo não pode ficar esperando.
 *
 * `thumbnail=100` olha cem quadros a partir dali e escolhe o mais
 * representativo, em vez de ficar com o que calhar no segundo exato — é
 * o que evita a capa com o professor de olho fechado ou no meio de uma
 * transição. São ~4 segundos de vídeo decodificados, não o arquivo todo.
 *
 * O recorte é `increase` + `crop`: a capa tem proporção fixa, e vídeo
 * vertical ou 4:3 entraria deformado se fosse só `scale`.
 */
export async function extrairQuadro(video: string, instante: number, destino: string): Promise<void> {
  await executar([
    '-hide_banner', '-loglevel', 'error', '-nostdin',
    '-ss', String(instante), '-i', video,
    '-frames:v', '1',
    '-vf', `thumbnail=100,scale=${LARGURA}:${ALTURA}:force_original_aspect_ratio=increase,crop=${LARGURA}:${ALTURA}`,
    // JPEG é full-range por definição. Sem dizer isso, fonte com faixa
    // limitada (ou sem faixa declarada) faz o codificador MJPEG recusar o
    // quadro com "Non full-range YUV is non-standard".
    '-pix_fmt', 'yuvj420p',
    '-q:v', '4', '-y', destino,
  ]);
}

/**
 * O quadro, com o começo do vídeo como reserva.
 *
 * A duração é DIGITADA pelo professor no formulário da aula: nada
 * garante que ela bate com o arquivo. Quem declara 45 minutos e envia um
 * vídeo de três faz a busca cair além do fim — e além do fim não há
 * quadro nenhum, e o curso ficaria sem capa por causa de um número
 * errado numa caixa de texto. O começo do vídeo sempre existe.
 *
 * Conferir o ARQUIVO, e não só o código de saída, é o que torna isto
 * confiável: com busca além do fim o ffmpeg 8 sai com erro, mas o 9 sai
 * com zero e simplesmente não grava nada. Só o segundo caso já deixaria
 * a reserva sem disparar.
 */
export async function extrairQuadroComReserva(
  video: string, instante: number, destino: string,
): Promise<void> {
  try {
    await extrairQuadro(video, instante, destino);
    if (await gravou(destino)) return;
  } catch { /* segue para a reserva */ }
  await extrairQuadro(video, 1, destino);
  if (!await gravou(destino)) throw new Error('ffmpeg não gravou a capa');
}

async function gravou(arquivo: string): Promise<boolean> {
  try {
    return (await stat(/*turbopackIgnore: true*/ arquivo)).size > 0;
  } catch {
    return false;
  }
}

interface AulaComVideo { videoId: string; duracaoSegundos: number }

/**
 * A aula de onde a capa sai: a de abertura do curso, na ordem em que o
 * aluno as vê — é a que melhor representa o curso na vitrine.
 *
 * Publicada primeiro, mas rascunho serve. O professor envia o vídeo
 * ANTES de publicar a aula, e é no envio que a capa é gerada: exigir
 * publicação aqui faria o cartão ficar sem capa justamente no momento em
 * que ele foi conferir se ficou bom.
 */
export function primeiraAulaComVideo(portalId: number, materiaId: number) {
  return queryOne<AulaComVideo>(
    `SELECT au.video_id AS "videoId", au.duracao_segundos AS "duracaoSegundos"
       FROM aula au JOIN assunto s ON s.id = au.assunto_id
      WHERE s.materia_id = $2 AND au.portal_id = $1
        AND au.video_provedor = 'LOCAL' AND au.video_id IS NOT NULL
      ORDER BY (au.status = 'publicado') DESC, s.ordem, au.ordem, au.id
      LIMIT 1`,
    [portalId, materiaId],
  );
}

export interface ResultadoCapa {
  /** `/api/imagem/<id>` quando gerou; `null` quando não havia o que gerar. */
  url: string | null;
  motivo?: 'ja-tem-capa' | 'sem-video';
}

/**
 * Gera (ou refaz) a capa de um curso a partir do vídeo da primeira aula.
 *
 * Não sobrescreve capa existente sem `substituir`: quando houver envio de
 * capa pelo painel, a escolha do professor não pode ser desfeita pelo
 * próximo vídeo que ele subir.
 */
export async function gerarCapaDaMateria(
  portalId: number, materiaId: number, { substituir = false } = {},
): Promise<ResultadoCapa> {
  const materia = await queryOne<{ capa: string | null }>(
    'SELECT capa FROM materia WHERE id = $1 AND portal_id = $2', [materiaId, portalId],
  );
  if (!materia) throw new Error(`matéria ${materiaId} não é do portal ${portalId}`);
  if (materia.capa && !substituir) return { url: null, motivo: 'ja-tem-capa' };

  const aula = await primeiraAulaComVideo(portalId, materiaId);
  if (!aula || !idDeVideoValido(aula.videoId)) return { url: null, motivo: 'sem-video' };

  // O id vem do banco, mas o caminho é conferido do mesmo jeito: id
  // inválido não pode virar leitura fora do volume de vídeo.
  const origem = path.resolve(VIDEO_RAIZ, aula.videoId);
  if (origem !== path.join(VIDEO_RAIZ, aula.videoId)) throw new Error('id de vídeo inválido');

  await mkdir(/*turbopackIgnore: true*/ IMAGEM_RAIZ, { recursive: true });
  const id = nomeDeCapa(portalId, materiaId, 'jpg');
  const destino = path.join(IMAGEM_RAIZ, id);
  try {
    await extrairQuadroComReserva(origem, instanteDaCapa(aula.duracaoSegundos), destino);
  } catch (e) {
    await unlink(/*turbopackIgnore: true*/ destino).catch(() => {});
    throw e;
  }

  const url = `/api/imagem/${id}`;
  await query('UPDATE materia SET capa = $3 WHERE id = $1 AND portal_id = $2',
    [materiaId, portalId, url]);

  // A capa anterior sai do disco: espaço ocupado é cota faturada (§5.10).
  const anterior = materia.capa?.startsWith('/api/imagem/')
    ? materia.capa.slice('/api/imagem/'.length) : null;
  if (anterior && anterior !== id && pertenceAoPortal(anterior, portalId)) {
    await unlink(/*turbopackIgnore: true*/ path.join(IMAGEM_RAIZ, anterior)).catch(() => {});
  }
  return { url };
}
