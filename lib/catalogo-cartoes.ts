import { listarAreasEmCache, listarMateriasEmCache, formatarDuracao } from './catalogo.ts';
import { tabelaVigente } from './precos-consultas.ts';
import { trilhasDoColaborador } from './empresa-relatorio.ts';
import { brl } from './precos.ts';
import { urlDeReproducao, type ProvedorVideo } from './video.ts';
import type { Materia } from './catalogo-campos.ts';
import type { Portal } from './portal.ts';

/**
 * Os cartões do acervo de um portal, prontos para a prateleira.
 *
 * Nasceu de `app/catalogo/page.tsx`, onde esta montagem morava dentro da
 * página. O painel do colaborador ("Todas as trilhas") mostra exatamente
 * o mesmo acervo, com a mesma regra de progresso e de preço — e a única
 * diferença é a casca em volta. Duplicar a montagem duplicaria também a
 * armadilha do BIGINT descrita abaixo, que é silenciosa: a segunda cópia
 * mostraria trilha sem progresso nenhum e ninguém veria erro.
 *
 * O tipo do cartão continua em `app/catalogo/CartaoCurso.tsx`, junto do
 * componente. Aqui ele é estrutural, para este módulo não arrastar React
 * para dentro do executor de testes do Node.
 */

export interface CartaoDeCurso {
  id: number;
  slug: string;
  nome: string;
  ementa: string;
  onda: number | null;
  professor: string | null;
  areaSlug: string;
  areaNome: string;
  capa?: string | null;
  publicada: boolean;
  aulas: number;
  amostras?: number;
  duracao: string;
  duracaoSegundos: number;
  preco: string | null;
  etiqueta?: string | null;
  nivel?: string | null;
  destaque?: boolean;
  /** Quando a última aula publicada foi ao ar — o "atualizado em" do banner. */
  atualizadaEm?: Date | string | null;
  previa?: PreviaDoCartao | null;
  progresso?: { pct: number; prazo: string | null; atrasada: boolean } | null;
}

/**
 * A prévia que o cartão roda ao passar o mouse
 * (docs/plano-catalogo-streaming.md). O endereço já vem ASSINADO, para o
 * visitante 0 e com prazo curto: quem assina é o servidor, uma vez por
 * carregamento, exatamente como a página da aula faz (lib/video.ts).
 */
export interface PreviaDoCartao {
  /** `<video src>` — assinado, some do HTML quando o prazo vence. */
  src: string;
  /** A aula de onde ela sai, para o "Assistir agora" levar ao lugar certo. */
  aulaSlug: string;
}

export interface AreaDoCatalogo { id: number; slug: string; nome: string }

/**
 * A prévia de um curso, assinada — ou nada.
 *
 * Três guardas, e as três importam:
 *
 *   1. **Só amostra gratuita.** A projeção já filtra por
 *      `amostra_gratuita` (lib/catalogo-campos.ts): é a única aula que
 *      §6.1 abre a quem não assinou. Sem isso, o cartão do catálogo
 *      entregaria aula paga a qualquer visitante — a licença de §6.3
 *      viraria decoração, que é exatamente o que lib/video.ts existe
 *      para impedir.
 *
 *   2. **Assinada para o visitante 0**, o não cadastrado, que é o caso
 *      legítimo previsto em `urlDeReproducao`.
 *
 *   3. **Prazo de 30 minutos**, e não as 6 horas da aula inteira: a
 *      prévia é vista no minuto em que a página abre, e endereço que
 *      circula menos tempo é endereço que vaza menos.
 *
 * Id inválido não derruba o catálogo: o curso perde a prévia e o cartão
 * segue igual ao de quem não tem amostra.
 */
const PREVIA_VALIDADE_S = 30 * 60;

function previaDoCartao(m: Materia): PreviaDoCartao | null {
  if (!m.previaProvedor || !m.previaVideo || !m.previaSlug) return null;
  try {
    return {
      src: urlDeReproducao(
        { provedor: m.previaProvedor as ProvedorVideo, id: m.previaVideo },
        0,
        { validadeS: PREVIA_VALIDADE_S },
      ),
      aulaSlug: m.previaSlug,
    };
  } catch {
    return null;
  }
}

/**
 * `alunoId` só é usado no portal de uma empresa, para casar cada trilha
 * com a atribuição da pessoa. Sem sessão, ou fora da empresa, os cartões
 * saem sem andamento — que é o que o visitante do catálogo vê.
 */
export async function cursosDoPortal(
  portal: Portal, alunoId: number | null,
): Promise<{ areas: AreaDoCatalogo[]; cursos: CartaoDeCurso[] }> {
  /* §5.11 — portal de empresa é catálogo interno: não há preço na tela,
     porque o colaborador não compra nada. O lugar do preço no cartão é o
     andamento da trilha que o RH liberou para ele. */
  const empresa = portal.tipo === 'EMPRESA';

  const [areas, materias, tabela, atribuidas] = await Promise.all([
    listarAreasEmCache(portal.id),
    listarMateriasEmCache(portal.id),
    tabelaVigente(portal.id),
    empresa && alunoId
      ? trilhasDoColaborador(portal.id, alunoId)
      : Promise.resolve([]),
  ]);

  /* Chave em texto de propósito: `materia.id` é BIGINT e chega como
     string na projeção do catálogo, enquanto a consulta do colaborador
     converte para int. Comparar os dois direto não casa NUNCA, e o
     estrago é silencioso — a trilha aparece sem progresso nenhum. */
  const andamento = new Map(atribuidas.map((t) => [String(t.materiaId), t]));
  const preco = brl(tabela.MATERIA.mensal);

  const cursos = materias.map((m) => {
    const t = andamento.get(String(m.id));
    return {
      id: m.id,
      slug: m.slug,
      nome: m.nome,
      ementa: m.ementa,
      onda: m.onda,
      professor: m.professor,
      areaSlug: m.areaSlug,
      areaNome: m.areaNome,
      capa: m.capa,
      nivel: m.nivel,
      destaque: m.destaque,
      /* Prévia é coisa de vitrine: no portal de uma empresa não há
         visitante a convencer, e um endereço assinado para o "visitante
         0" é endereço que funciona fora do login — exatamente o que o
         portal fechado de §5.11 não quer. */
      previa: empresa ? null : previaDoCartao(m),
      atualizadaEm: m.atualizadaEm,
      publicada: m.status === 'publicado' && m.aulasPublicadas > 0,
      aulas: m.aulasPublicadas,
      amostras: m.amostras,
      duracao: formatarDuracao(m.duracaoTotal),
      duracaoSegundos: m.duracaoTotal,
      preco: empresa ? null : preco,
      // A trilha da empresa não tem onda de lançamento: a pílula da capa
      // diria "Em breve" em cima de trilha que já está no ar.
      etiqueta: empresa ? null : undefined,
      progresso: t
        ? {
          pct: t.percentual,
          prazo: t.prazoEm ? new Date(t.prazoEm).toLocaleDateString('pt-BR') : null,
          atrasada: t.situacao === 'atrasada',
        }
        : null,
    };
  });

  return { areas, cursos };
}
