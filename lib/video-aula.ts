import { stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { query, queryOne } from './db.ts';
import { emTransacao, auditar } from './auditoria.ts';
import { pertenceAoPortal } from './upload.ts';
import type { ProvedorVideo } from './video.ts';

/**
 * O acervo de vídeo de um portal, visto de cima (§5.10: "o professor
 * anexa e troca os próprios vídeos").
 *
 * O vídeo continua sendo de CADA AULA — é ali que o aluno assiste, e é
 * ali que o envio grava. O que faltava era a lista: o professor precisa
 * ver, numa tela só, quais aulas já têm gravação e quais não têm, sem
 * abrir curso por curso. Sem isso, "onde eu anexo o vídeo?" foi a
 * primeira pergunta de quem cadastrou o primeiro curso.
 *
 * O tamanho em disco vem junto porque armazenamento é cota faturada
 * (§5.10) — e porque arquivo AUSENTE (volume recriado, por exemplo)
 * precisa aparecer como problema, não como "enviado".
 */

const VIDEO_RAIZ = path.resolve(/*turbopackIgnore: true*/ process.env.VIDEO_RAIZ ?? './midia/video');

export interface AulaComVideo {
  id: number; slug: string; titulo: string; ordem: number;
  status: string; duracaoSegundos: number;
  assuntoId: number; assuntoNome: string;
  materiaId: number; materiaNome: string; materiaSlug: string; materiaStatus: string;
  videoProvedor: ProvedorVideo | null; videoId: string | null;
  /** Bytes do arquivo no volume; `null` quando não há vídeo LOCAL. */
  bytes: number | null;
  /** Tem `video_id`, mas o arquivo não está no volume. */
  arquivoAusente: boolean;
}

/**
 * Todas as aulas do portal, em ordem de curso → assunto → aula. Sem
 * filtro por curso de propósito: a tela existe justamente para quem não
 * sabe em qual curso está a aula sem vídeo.
 */
export async function aulasDoPortal(portalId: number): Promise<AulaComVideo[]> {
  const aulas = await query<Omit<AulaComVideo, 'bytes' | 'arquivoAusente'>>(
    `SELECT a.id::int AS id, a.slug, a.titulo, a.ordem::int AS ordem, a.status,
            a.duracao_segundos::int AS "duracaoSegundos",
            a.video_provedor AS "videoProvedor", a.video_id AS "videoId",
            s.id::int AS "assuntoId", s.nome AS "assuntoNome",
            m.id::int AS "materiaId", m.nome AS "materiaNome", m.slug AS "materiaSlug",
            m.status AS "materiaStatus"
       FROM aula a
       JOIN assunto s ON s.id = a.assunto_id
       JOIN materia m ON m.id = s.materia_id
      WHERE a.portal_id = $1
      ORDER BY m.ordem, m.nome, s.ordem, a.ordem, a.titulo`,
    [portalId],
  );

  return Promise.all(aulas.map(async (a) => {
    if (a.videoProvedor !== 'LOCAL' || !a.videoId) {
      return { ...a, bytes: null, arquivoAusente: false };
    }
    try {
      const info = await stat(/*turbopackIgnore: true*/ path.resolve(VIDEO_RAIZ, a.videoId));
      return { ...a, bytes: info.size, arquivoAusente: false };
    } catch {
      return { ...a, bytes: null, arquivoAusente: true };
    }
  }));
}

/**
 * Tira o vídeo da aula: apaga o vínculo e, se o arquivo era nosso e
 * deste portal, apaga o arquivo. É o par que faltava do envio — trocar
 * já dava para fazer (enviar outro substitui), tirar não.
 *
 * A ordem é deliberada: primeiro o banco, depois o disco. Se o disco
 * falhar, sobra um arquivo órfão ocupando cota — chato, e corrigível.
 * Ao contrário, sobraria uma aula apontando para arquivo que não existe,
 * e o aluno veria um player quebrado.
 */
export async function removerVideoDaAula(ator: string, portalId: number, aulaId: number) {
  const aula = await queryOne<{ titulo: string; provedor: string | null; id: string | null }>(
    `SELECT titulo, video_provedor AS provedor, video_id AS id
       FROM aula WHERE id = $1 AND portal_id = $2`,
    [aulaId, portalId],
  );
  if (!aula) throw new Error('aula não encontrada neste portal');
  if (!aula.id) throw new Error('esta aula não tem vídeo');

  await emTransacao(async (exec) => {
    await exec(
      `UPDATE aula SET video_provedor = NULL, video_id = NULL, atualizada_em = now()
        WHERE id = $1 AND portal_id = $2`,
      [aulaId, portalId],
    );
    await auditar(exec, ator, 'video.removido', 'aula', aulaId,
      { portalId, videoId: aula.id, provedor: aula.provedor });
  });

  if (aula.provedor === 'LOCAL' && pertenceAoPortal(aula.id, portalId)) {
    await unlink(/*turbopackIgnore: true*/ path.join(VIDEO_RAIZ, aula.id)).catch(() => {});
  }
  return aula.titulo;
}
