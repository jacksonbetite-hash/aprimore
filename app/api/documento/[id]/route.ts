import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { alunoAtual } from '../../../../lib/sessao.ts';
import { portalIdAtual } from '../../../../lib/portal-consultas.ts';
import { portalDaEmpresa } from '../../../../lib/empresa.ts';
import { queryOne } from '../../../../lib/db.ts';
import { itemEntregavel, itemDoPortal, registrarLeitura } from '../../../../lib/acervo.ts';
import { idDeImagemValido, extensaoAceita, tipoMime, pertenceAoPortal } from '../../../../lib/upload.ts';

/**
 * Entrega de um item da Biblioteca da empresa (db/042).
 *
 * **Esta rota não é a de imagem.** A foto do portal é pública porque é a
 * cara dele — qualquer visitante a vê. O acervo é o oposto: é conteúdo
 * interno de um cliente, e o §5.11 já disse o que ele seria solto na
 * rua — "o treinamento interno de um cliente exposto: não é falha de
 * estilo, é vazamento de dado do cliente". Um manual de processo ou uma
 * política interna vazam a empresa inteira.
 *
 * Então tudo é conferido antes de um byte sair:
 *
 *  1. o id é um nome de arquivo, não um caminho (sem barra, sem `..`);
 *  2. há sessão, no portal DESTA requisição;
 *  3. o arquivo tem o prefixo deste portal (`pertenceAoPortal`);
 *  4. existe item publicado apontando para ele, e do setor da pessoa —
 *     ou o leitor é o gestor do portal, que confere o rascunho antes de
 *     publicar.
 *
 * Toda falha responde 404, e não 403: dizer "existe, mas você não pode"
 * já entrega que o material existe.
 *
 * Na VPS o nginx serve `/midia-interna/` (só vídeo) marcada `internal`, e
 * nada mais do volume — conferido em `nginx/aprimoreosaber.conf`. O PDF
 * passa obrigatoriamente por aqui.
 */
export const dynamic = 'force-dynamic';

const RAIZ = path.resolve(
  /*turbopackIgnore: true*/ process.env.DOCUMENTO_RAIZ
    ?? path.join(path.dirname(process.env.VIDEO_RAIZ ?? './midia/video'), 'documento'),
);

const naoEncontrado = () => new Response('não encontrado', { status: 404 });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!idDeImagemValido(id)) return new Response('id inválido', { status: 400 });
  const ext = extensaoAceita('documento', id);
  if (!ext) return naoEncontrado();

  const u = await alunoAtual();
  if (!u) return new Response('entre na sua conta', { status: 401 });

  const portalId = await portalIdAtual();
  // O prefixo do nome diz de quem é o arquivo, sem ir ao banco: é o que
  // impede pedir, de dentro de uma empresa, o PDF de outra.
  if (!pertenceAoPortal(id, portalId)) return naoEncontrado();

  /* O setor manda na visibilidade: item de setor só abre para quem é
     dele. Vem do banco, nunca da requisição. */
  const dono = await queryOne<{ setorId: number | null }>(
    'SELECT setor_id::int AS "setorId" FROM usuario WHERE id = $1 AND portal_id = $2',
    [u.id, portalId],
  );
  let item = await itemEntregavel(portalId, id, dono?.setorId ?? null);

  /* O gestor opera o portal da empresa DE FORA dele, na plataforma
     (§5.11) — então ele não tem sessão aqui dentro e não cai neste
     ramo no uso normal. Ele cai quando abre a prévia do rascunho a
     partir do painel, e é só para isso que o ramo existe: sem ele, o RH
     publicaria às cegas, sem poder conferir o arquivo que subiu. */
  let ehGestor = false;
  if (!item && (u.papel === 'gestor' || u.papel === 'admin')) {
    const daEmpresa = await portalDaEmpresa(u.id);
    if (daEmpresa?.id === portalId || u.papel === 'admin') {
      const rascunho = await itemDoPortal(portalId, id);
      if (rascunho) { item = { ...rascunho, setorId: null }; ehGestor = true; }
    }
  }
  if (!item) return naoEncontrado();

  const caminho = path.resolve(RAIZ, id);
  // Depois de `idDeImagemValido` isto é cinto e suspensório, e fica: é a
  // única linha entre um id inesperado e ler fora do diretório.
  if (caminho !== path.join(RAIZ, id)) return new Response('id inválido', { status: 400 });

  let tamanho: number;
  try {
    const info = await stat(/*turbopackIgnore: true*/ caminho);
    if (!info.isFile()) return naoEncontrado();
    tamanho = info.size;
  } catch {
    return naoEncontrado();
  }

  /* "Lido por N de M" para o RH. Fora do caminho da resposta: a pessoa
     veio ler o material, e uma falha ao anotar a leitura não pode virar
     erro na tela dela. O gestor conferindo o rascunho não conta como
     leitor — ele não é o público do material. */
  if (!ehGestor) {
    void registrarLeitura(item.id, u.id).catch(() => {});
  }

  const leitura = createReadStream(/*turbopackIgnore: true*/ caminho);
  return new Response(Readable.toWeb(leitura) as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': tipoMime('documento', ext),
      'Content-Length': String(tamanho),
      /* `inline`: o navegador ABRE o PDF, e não baixa. É o que faz a
         Biblioteca parecer uma biblioteca. O nome do arquivo vem do
         título, com aspas e barras fora — ele vai para um cabeçalho, e
         título é texto que o RH digitou. */
      'Content-Disposition': `inline; filename="${nomeParaCabecalho(item.titulo)}.pdf"`,
      /* Nada de cache: o acesso depende de sessão, de setor e de o item
         continuar publicado. Guardado em cache compartilhado, o PDF
         sobreviveria à saída da pessoa da empresa. */
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Só ASCII simples no nome do arquivo baixado. Acento em cabeçalho HTTP
 * exige a codificação do RFC 5987, e aspas ou quebra de linha ali dentro
 * seriam injeção de cabeçalho — o título veio de um formulário.
 */
function nomeParaCabecalho(titulo: string): string {
  const limpo = titulo
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return limpo || 'documento';
}
