import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../lib/professor.ts';
import { portalDaEmpresa } from '../../../lib/empresa.ts';
import { ehProfessorDoCatalogo, materiaDe, posseDaMateria } from '../../../lib/professor-catalogo.ts';
import { query, queryOne } from '../../../lib/db.ts';
import { medirArmazenamento } from '../../../lib/portal-financeiro.ts';
import { gerarCapaDaMateria } from '../../../lib/capa-video.ts';
import {
  extensaoAceita, nomeNoVolume, nomeDeCapa, pertenceAoPortal, LIMITE_BYTES, type TipoEnvio,
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
// A Biblioteca da empresa (db/042): PDF do acervo, ao lado de vídeo e
// imagem no mesmo volume — e, como eles, fora da imagem Docker (§10).
const DOCUMENTO_RAIZ = path.resolve(
  /*turbopackIgnore: true*/ process.env.DOCUMENTO_RAIZ ?? path.join(path.dirname(VIDEO_RAIZ), 'documento'),
);

const erro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });

export async function POST(req: Request) {
  const u = await alunoAtual();
  if (!u) return erro(401, 'Entre na sua conta para enviar arquivos.');

  const url = new URL(req.url);
  const tipo = url.searchParams.get('tipo') as TipoEnvio;
  if (tipo !== 'video' && tipo !== 'imagem' && tipo !== 'documento') {
    return erro(400, 'tipo de envio inválido');
  }
  /* Para onde vai a imagem depois de gravada. `portal` (o padrão, que é
     o comportamento de sempre) troca a foto de apresentação do portal;
     `acervo` só devolve o endereço, para o formulário da Biblioteca
     guardar como capa do item; `capa` grava a capa de UM curso, indicado
     por `?materiaId=`. Sem esta distinção, enviar a capa de um livro — ou
     de um curso — trocaria a foto da página inteira, silenciosamente. */
  const usoPedido = url.searchParams.get('uso');
  const uso = usoPedido === 'acervo' ? 'acervo' : usoPedido === 'capa' ? 'capa' : 'portal';
  const nomeOriginal = url.searchParams.get('nome') ?? '';
  const ext = extensaoAceita(tipo, nomeOriginal);
  if (!ext) {
    return erro(415, tipo === 'video'
      ? 'Formato não aceito. Envie MP4 (H.264) ou WebM.'
      : tipo === 'documento'
        ? 'Formato não aceito. Envie um arquivo PDF.'
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
    /* A Biblioteca é do portal de uma EMPRESA (§5.11). O professor não
       tem acervo: um PDF enviado por ele ficaria no volume sem item que
       o referencie — ocupando cota e sem abrir para ninguém, porque a
       entrega exige item publicado. */
    if (tipo === 'documento') return erro(403, 'envio de documento é da Biblioteca da empresa');
    const portal = await portalDoProfessor(u.id);
    if (portal) {
      portalId = portal.id;
    } else if (u.papel === 'professor' && await ehProfessorDoCatalogo(u.id)) {
      // Etapa 5 — professor SEM portal envia para o catálogo (portal 0),
      // e só para aula ou curso que é DELE: a posse é conferida abaixo,
      // antes de gravar um byte.
      portalId = 0;
      const aulaPedida = Number(url.searchParams.get('aulaId'));
      const materiaPedida = Number(url.searchParams.get('materiaId'));
      const materiaAlvo = tipo === 'video' && Number.isInteger(aulaPedida)
        ? await materiaDe({ aulaId: aulaPedida })
        : Number.isInteger(materiaPedida) ? materiaPedida : null;
      if (materiaAlvo === null) return erro(400, 'diga a aula ou o curso');
      try {
        await posseDaMateria(query, u.id, materiaAlvo);
      } catch {
        return erro(404, 'curso não encontrado');
      }
    } else {
      return erro(403, 'você ainda não tem um portal');
    }
  }

  const limite = LIMITE_BYTES[tipo];
  const declarado = Number(req.headers.get('content-length') ?? 0);
  if (declarado > limite) {
    return erro(413, `Arquivo acima do limite de ${Math.round(limite / 1024 ** 2)} MB.`);
  }

  let aulaId: number | undefined;
  let anteriorVideo: { provedor: string | null; id: string | null; materiaId: number } | null = null;
  if (tipo === 'video') {
    aulaId = Number(url.searchParams.get('aulaId'));
    if (!Number.isInteger(aulaId)) return erro(400, 'aula inválida');
    // A aula precisa ser DESTE portal: id alheio não encontra a linha. A
    // matéria vem junto porque é dela a capa que o vídeo vai gerar.
    const aula = await queryOne<{ provedor: string | null; id: string | null; materiaId: number }>(
      `SELECT au.video_provedor AS provedor, au.video_id AS id, s.materia_id::int AS "materiaId"
         FROM aula au JOIN assunto s ON s.id = au.assunto_id
        WHERE au.id = $1 AND au.portal_id = $2`,
      [aulaId, portalId],
    );
    if (!aula) return erro(404, 'aula não encontrada');
    anteriorVideo = aula;
  }

  /* A capa que o professor escolhe à mão (docs/plano-vitrine-do-professor.md,
     fase 3a). Espelho exato do ramo do vídeo, e pela mesma razão: a
     matéria precisa ser DESTE portal, e isso se confere ANTES de gravar
     um byte — id de curso alheio na URL não pode nem criar arquivo no
     volume. O quadro tirado do vídeo continua existindo para quem não
     enviar nada; quem enviar, manda nela (gerarCapaDaMateria não
     sobrescreve capa existente sem `substituir`). */
  let materiaId: number | undefined;
  let capaAnterior: string | null = null;
  if (tipo === 'imagem' && uso === 'capa') {
    materiaId = Number(url.searchParams.get('materiaId'));
    if (!Number.isInteger(materiaId)) return erro(400, 'curso inválido');
    const materia = await queryOne<{ capa: string | null }>(
      'SELECT capa FROM materia WHERE id = $1 AND portal_id = $2', [materiaId, portalId],
    );
    if (!materia) return erro(404, 'curso não encontrado');
    capaAnterior = materia.capa;
  }

  const raiz = tipo === 'video' ? VIDEO_RAIZ : tipo === 'documento' ? DOCUMENTO_RAIZ : IMAGEM_RAIZ;
  await mkdir(/*turbopackIgnore: true*/ raiz, { recursive: true });
  const id = materiaId !== undefined
    ? nomeDeCapa(portalId, materiaId, ext)
    : nomeNoVolume(tipo, portalId, ext, aulaId);
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
    /* A capa do curso sai de um quadro deste vídeo, se o curso ainda não
       tiver uma. Fora do caminho da resposta, de propósito: o professor
       veio enviar a aula, e uma falha do ffmpeg não pode transformar um
       envio que deu certo em erro na tela. Sem capa, o cartão cai no
       gradiente da área — que é a reserva desenhada de sempre. */
    void gerarCapaDaMateria(portalId, ant.materiaId).catch((e) => {
      console.error('capa do curso não pôde ser gerada:', (e as Error).message);
    });
  } else if (tipo === 'imagem' && uso === 'capa') {
    await query('UPDATE materia SET capa = $3 WHERE id = $1 AND portal_id = $2',
      [materiaId, portalId, `/api/imagem/${id}`]);
    /* A capa anterior sai do disco — mesma regra do vídeo e da foto. O
       `pertenceAoPortal` é o que impede um caminho gravado à mão no banco
       de apagar arquivo de outro portal.

       O que NÃO acontece aqui: `medirArmazenamento`. A cota conta vídeo,
       material de apoio e acervo (lib/portal-financeiro.ts) — imagem de
       portal nunca entrou nela, e fazer a capa entrar mudaria a fatura de
       todo mundo. Se um dia entrar, entra junto com a foto do portal. */
    const anterior = capaAnterior?.startsWith('/api/imagem/')
      ? capaAnterior.slice('/api/imagem/'.length) : null;
    if (anterior && anterior !== id && pertenceAoPortal(anterior, portalId)) {
      await unlink(path.join(IMAGEM_RAIZ, anterior)).catch(() => {});
    }
  } else if (tipo === 'imagem' && uso === 'portal') {
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
    [u.email, `upload.${tipo}`,
     tipo === 'video' ? 'aula' : materiaId !== undefined ? 'materia' : 'portal',
     aulaId ?? materiaId ?? portalId,
     JSON.stringify({ id, bytes: recebido, portalId })],
  );
  /* O documento NÃO é gravado em `acervo` aqui: o item ainda não
     existe — o RH escolhe o PDF e só depois salva a ficha. Quem amarra
     arquivo e item é `acaoSalvarItemAcervo`, que também registra os
     bytes na cota. Enquanto isso o arquivo fica no volume sem dono, e é
     por isso que a entrega (`/api/documento`) exige item PUBLICADO:
     arquivo órfão não abre para ninguém. */
  const endereco = tipo === 'imagem' ? `/api/imagem/${id}`
    : tipo === 'documento' ? `/api/documento/${id}`
      : null;
  return NextResponse.json({ id, bytes: recebido, url: endereco });
}
