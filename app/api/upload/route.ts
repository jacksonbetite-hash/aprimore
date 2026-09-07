import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../lib/professor.ts';
import { portalDaEmpresa } from '../../../lib/empresa.ts';
import { query, queryOne } from '../../../lib/db.ts';
import { medirArmazenamento } from '../../../lib/portal-financeiro.ts';
import {
  extensaoAceita, nomeNoVolume, pertenceAoPortal, LIMITE_BYTES, type TipoEnvio,
} from '../../../lib/upload.ts';

/**
 * Envio de arquivo pelo painel (§5.10: o professor anexa os próprios
 * vídeos; §10: o arquivo vai para o volume de mídia).
 *
 * O corpo da requisição É o arquivo, cru — nada de multipart. Ele flui
 * do socket para o disco em stream, com um contador no meio que corta ao
 * passar do teto. É por isso que esta rota fica FORA do proxy (proxy.ts):
 * no Next 16 o proxy bufferiza o corpo em memória até 10 MB, e uma aula
 * tem centenas de megabytes.
 *
 * Quem pode: o professor, no próprio portal (o portal vem da sessão, não
 * da requisição); o admin, em qualquer portal (`?portalId=`). O nome no
 * volume é gerado por nós — o nome original só empresta a extensão.
 */
export const dynamic = 'force-dynamic';

const VIDEO_RAIZ = path.resolve(/*turbopackIgnore: true*/ process.env.VIDEO_RAIZ ?? './midia/video');
const IMAGEM_RAIZ = path.resolve(
  /*turbopackIgnore: true*/ process.env.IMAGEM_RAIZ ?? path.join(path.dirname(VIDEO_RAIZ), 'imagem'),
);

const erro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });

export async function POST(req: Request) {
  const u = await alunoAtual();
  if (!u) return erro(401, 'Entre na sua conta para enviar arquivos.');

  const url = new URL(req.url);
  const tipo = url.searchParams.get('tipo') as TipoEnvio;
  if (tipo !== 'video' && tipo !== 'imagem') return erro(400, 'tipo de envio inválido');
  const nomeOriginal = url.searchParams.get('nome') ?? '';
  const ext = extensaoAceita(tipo, nomeOriginal);
  if (!ext) {
    return erro(415, tipo === 'video'
      ? 'Formato não aceito. Envie MP4 (H.264) ou WebM.'
      : 'Formato não aceito. Envie JPG, PNG ou WebP.');
  }

  // De quem é o upload: professor no próprio portal; admin onde indicar.
  let portalId: number;
  const pedido = url.searchParams.get('portalId');
  if (u.papel === 'admin' && pedido !== null) {
    portalId = Number(pedido);
    if (!Number.isInteger(portalId) || portalId < 0) return erro(400, 'portal inválido');
  } else if (u.papel === 'gestor') {
    // §5.11 — o RH envia o vídeo da aula da trilha e a logo do portal. O
    // portal vem do VÍNCULO em portal_gestor, nunca da requisição: é a
    // mesma regra do professor, e é ela que impede o gestor de uma
    // empresa escrever no volume de outra.
    const portal = await portalDaEmpresa(u.id);
    if (!portal) return erro(403, 'você ainda não administra uma empresa');
    portalId = portal.id;
  } else {
    if (u.papel !== 'professor' && u.papel !== 'admin') return erro(403, 'sem permissão');
    const portal = await portalDoProfessor(u.id);
    if (!portal) return erro(403, 'você ainda não tem um portal');
    portalId = portal.id;
  }

  const limite = LIMITE_BYTES[tipo];
  const declarado = Number(req.headers.get('content-length') ?? 0);
  if (declarado > limite) {
    return erro(413, `Arquivo acima do limite de ${Math.round(limite / 1024 ** 2)} MB.`);
  }

  let aulaId: number | undefined;
  let anteriorVideo: { provedor: string | null; id: string | null } | null = null;
  if (tipo === 'video') {
    aulaId = Number(url.searchParams.get('aulaId'));
    if (!Number.isInteger(aulaId)) return erro(400, 'aula inválida');
    // A aula precisa ser DESTE portal: id alheio não encontra a linha.
    const aula = await queryOne<{ provedor: string | null; id: string | null }>(
      `SELECT video_provedor AS provedor, video_id AS id FROM aula WHERE id = $1 AND portal_id = $2`,
      [aulaId, portalId],
    );
    if (!aula) return erro(404, 'aula não encontrada');
    anteriorVideo = aula;
  }

  const raiz = tipo === 'video' ? VIDEO_RAIZ : IMAGEM_RAIZ;
  await mkdir(/*turbopackIgnore: true*/ raiz, { recursive: true });
  const id = nomeNoVolume(tipo, portalId, ext, aulaId);
  const destino = path.join(raiz, id);

  // Stream para o disco, com o teto aplicado byte a byte — o
  // Content-Length declarado é promessa, não garantia.
  let recebido = 0;
  const guarda = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      recebido += chunk.length;
      if (recebido > limite) cb(new Error('LIMITE')); else cb(null, chunk);
    },
  });
  try {
    if (!req.body) return erro(400, 'corpo vazio');
    await pipeline(
      Readable.fromWeb(req.body as unknown as import('node:stream/web').ReadableStream),
      guarda,
      createWriteStream(/*turbopackIgnore: true*/ destino),
    );
  } catch (err) {
    await unlink(destino).catch(() => {});
    return (err as Error).message === 'LIMITE'
      ? erro(413, `Arquivo acima do limite de ${Math.round(limite / 1024 ** 2)} MB.`)
      : erro(500, 'falha ao gravar o arquivo');
  }
  if (recebido === 0) {
    await unlink(destino).catch(() => {});
    return erro(400, 'arquivo vazio');
  }

  if (tipo === 'video') {
    await query(
      `UPDATE aula SET video_provedor = 'LOCAL', video_id = $3, atualizada_em = now()
        WHERE id = $1 AND portal_id = $2`,
      [aulaId, portalId, id],
    );
    // O vídeo anterior desta aula, se era nosso e deste portal, sai do
    // disco: espaço ocupado é cota faturada (§5.10).
    const ant = anteriorVideo!;
    if (ant.provedor === 'LOCAL' && ant.id && ant.id !== id && pertenceAoPortal(ant.id, portalId)) {
      await unlink(path.join(VIDEO_RAIZ, ant.id)).catch(() => {});
    }
    if (portalId !== 0) void medirArmazenamento(portalId).catch(() => {});
  } else {
    const atual = await queryOne<{ foto: string | null }>(
      `SELECT personalizacao->>'foto' AS foto FROM portal WHERE id = $1`, [portalId]);
    await query(
      `UPDATE portal SET personalizacao = personalizacao || jsonb_build_object('foto', $2::text)
        WHERE id = $1`,
      [portalId, `/api/imagem/${id}`],
    );
    const anterior = atual?.foto?.startsWith('/api/imagem/') ? atual.foto.slice('/api/imagem/'.length) : null;
    if (anterior && anterior !== id && pertenceAoPortal(anterior, portalId)) {
      await unlink(path.join(IMAGEM_RAIZ, anterior)).catch(() => {});
    }
  }

  await query(
    `INSERT INTO log_auditoria (ator, acao, entidade, entidade_id, detalhe)
     VALUES ($1, $2, $3, $4, $5)`,
    [u.email, `upload.${tipo}`, tipo === 'video' ? 'aula' : 'portal', aulaId ?? portalId,
     JSON.stringify({ id, bytes: recebido, portalId })],
  );
  return NextResponse.json({ id, bytes: recebido, url: tipo === 'imagem' ? `/api/imagem/${id}` : null });
}
