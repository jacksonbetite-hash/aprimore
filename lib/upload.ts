import { randomBytes } from 'node:crypto';

/**
 * Envio de arquivos pelo painel — parte pura (§5.10: o professor "anexa
 * seus vídeos" sozinho; §10: o arquivo vive no volume de mídia, nunca na
 * imagem nem no repositório).
 *
 * O que este módulo decide: que extensões entram, quanto pode pesar cada
 * tipo, e como se chama o arquivo no volume. O nome é gerado por nós —
 * nunca o do usuário — porque ele vira caminho no disco e id assinado no
 * player: precisa passar em `idDeVideoValido` e carregar o portal no
 * prefixo, para o dono ser reconhecível pelo nome (limpeza, cota,
 * suporte) sem consultar o banco.
 */

export type TipoEnvio = 'video' | 'imagem' | 'documento';

const EXTENSOES: Record<TipoEnvio, Record<string, string>> = {
  video: { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm' },
  imagem: { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' },
  /* Só PDF na Biblioteca da empresa. EPUB e DOCX não abrem no
     navegador: virariam download cego, e o colaborador precisaria de um
     programa que a máquina do trabalho talvez não tenha. PDF o navegador
     mostra sozinho — a mesma razão pela qual o certificado (§5.11) é
     impresso pelo navegador em vez de gerado no servidor. */
  documento: { pdf: 'application/pdf' },
};

/** Tetos por tipo, em bytes. O de vídeo acompanha o `client_max_body_size 2g` do nginx. */
export const LIMITE_BYTES: Record<TipoEnvio, number> = {
  video: Number(process.env.VIDEO_MAX_BYTES ?? 2 * 1024 ** 3),
  imagem: 5 * 1024 ** 2,
  /* 50 MB cobre livro escaneado em resolução razoável. Ajustável sem
     código porque o que cabe varia por cliente — e quem descobre o teto
     é sempre o RH, no meio do envio. */
  documento: Number(process.env.DOCUMENTO_MAX_BYTES ?? 50 * 1024 ** 2),
};

/** Extensão normalizada do nome original, se for aceita para o tipo. */
export function extensaoAceita(tipo: TipoEnvio, nomeOriginal: string): string | null {
  const ponto = nomeOriginal.lastIndexOf('.');
  if (ponto < 0) return null;
  const ext = nomeOriginal.slice(ponto + 1).toLowerCase();
  return EXTENSOES[tipo][ext] ? ext : null;
}

export function tipoMime(tipo: TipoEnvio, ext: string): string {
  return EXTENSOES[tipo][ext] ?? 'application/octet-stream';
}

/**
 * Nome no volume: `p<portal>-a<aula>-<aleatório>.<ext>` para vídeo,
 * `p<portal>-foto-<aleatório>.<ext>` para imagem e
 * `p<portal>-acervo-<aleatório>.pdf` para documento. Só [a-z0-9.-]: é o
 * que `idDeVideoValido` aceita e o que nunca vira `..` nem barra.
 *
 * O documento não carrega o id do item no nome, ao contrário da capa da
 * matéria: o arquivo é enviado ANTES de o item existir — o RH escolhe o
 * PDF e só depois salva a ficha. O prefixo do portal, que é o que
 * `pertenceAoPortal` lê, continua lá.
 */
export function nomeNoVolume(tipo: TipoEnvio, portalId: number, ext: string, aulaId?: number): string {
  const meio = tipo === 'video' ? `a${aulaId ?? 0}` : tipo === 'documento' ? 'acervo' : 'foto';
  return `p${portalId}-${meio}-${randomBytes(6).toString('hex')}.${ext}`;
}

/**
 * Nome da capa do curso: `p<portal>-capa<materia>-<aleatório>.<ext>`.
 *
 * Função própria, e não mais um argumento de `nomeNoVolume`, porque o
 * dono é outro: a foto é do portal, o vídeo é da aula, a capa é da
 * matéria. O prefixo do portal continua igual — é ele que `pertenceAoPortal`
 * lê para saber de quem é o arquivo sem consultar o banco.
 */
export function nomeDeCapa(portalId: number, materiaId: number, ext: string): string {
  return `p${portalId}-capa${materiaId}-${randomBytes(6).toString('hex')}.${ext}`;
}

/** O arquivo pertence a este portal? (o prefixo diz, sem banco) */
export function pertenceAoPortal(nome: string, portalId: number): boolean {
  return nome.startsWith(`p${portalId}-`);
}

/** Um id de imagem segue a mesma regra do id de vídeo: sem barra, sem `..`. */
export function idDeImagemValido(id: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,119}$/i.test(id) && !id.includes('..');
}
