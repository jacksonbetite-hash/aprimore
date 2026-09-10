import Link from 'next/link';
import { Icone } from '../ui.tsx';
import PreviaCapa from './PreviaCapa.tsx';

/**
 * O cartão de curso do catálogo — no layout de vitrine de streaming
 * aprovado em 09/09/2026 (docs/plano-catalogo-streaming.md).
 *
 * Mora fora de `FiltroCursos.tsx` (que é componente cliente) porque a
 * página do portal, que é servidor, renderiza o mesmo cartão. Sem
 * diretiva nenhuma aqui: o módulo compila dos dois lados.
 *
 * O que o layout novo trouxe, e o que ele manteve:
 *
 *   - a capa ganhou DUAS pílulas (a onda e a disponibilidade) e a prévia
 *     que roda ao passar o mouse (`PreviaCapa`);
 *   - o pé virou caixa de preço — "valor avulso" e "incluso no passe" —
 *     com o botão embaixo;
 *   - o botão continua SEMPRE visível. Botão que só aparece no `:hover`
 *     some para quem usa toque, que é metade dos alunos. A prévia é o
 *     contrário disso: ela é um extra do ponteiro, e o cartão inteiro
 *     continua levando ao curso com um toque.
 */
export interface CursoCartao {
  id: number;
  slug: string;
  nome: string;
  ementa: string;
  onda: number | null;
  professor: string | null;
  areaSlug: string;
  /** Nome da área, para o cartão que aparece fora de uma fila da própria área. */
  areaNome: string;
  publicada: boolean;
  aulas: number;
  duracao: string;
  duracaoSegundos: number;
  /**
   * Aulas abertas a quem ainda não assinou. Vira o selo "amostra grátis"
   * na linha de metadados daqui e a frase inteira no cartão grande da
   * vitrine (`CartaoVitrine`); opcional para as telas que montam o cartão
   * sem essa contagem — ausente vale zero, e o selo não aparece.
   */
  amostras?: number;
  /** Preço formatado, ou `null` em portal fechado: a empresa não vende ao colaborador. */
  preco: string | null;
  /** Pílula sobre a capa. `undefined` cai na onda; `null` não mostra nada. */
  etiqueta?: string | null;
  /** Capa enviada pelo professor (fase 2). Sem ela, entra o desenho da área. */
  capa?: string | null;
  /** A quem o curso se dirige (db/043) — pílula do cartão e filtro da barra. */
  nivel?: string | null;
  /** O curso que abre o catálogo, no banner grande. */
  destaque?: boolean;
  /** Quando a última aula publicada foi ao ar. */
  atualizadaEm?: Date | string | null;
  /**
   * O trecho que roda na capa ao passar o mouse — sempre a amostra
   * gratuita, sempre assinado no servidor. Ausente = capa parada.
   */
  previa?: { src: string; aulaSlug: string } | null;
  /** §5.11 — no portal de empresa o lugar do preço é o andamento da trilha. */
  progresso?: { pct: number; prazo: string | null; atrasada: boolean } | null;
  /** Destino do cartão; por padrão o curso do próprio portal. */
  href?: string;
}

export const ONDA = (o: number | null) => (o === null ? 'Em breve' : `${o}ª onda`);

/** "1 aula" e "2 aulas" — a contagem carrega a concordancia junto. */
export const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`;

/**
 * O tom da capa desenhada, quando não há foto.
 *
 * As áreas são de cada portal — o professor cria as dele —, então não dá
 * para ter uma cor por slug conhecido, como o blog tem por categoria. O
 * slug entra num hash e sai um dos seis tons; a mesma área recebe sempre
 * o mesmo, em qualquer tela, sem guardar nada no banco.
 *
 * Os seis são todos da família do roxo (§ identidade visual: o roxo é a
 * única cor de marca). Verde, âmbar e vermelho ficam de fora — ali eles
 * significam concluído, em curso e erro, e não podem virar decoração.
 */
export function tomDaCapa(chave: string): number {
  let h = 0;
  for (let i = 0; i < chave.length; i += 1) h = (h * 31 + chave.charCodeAt(i)) >>> 0;
  return (h % 6) + 1;
}

export interface AreaDeCatalogo { id: number; slug: string; nome: string }

export interface FilaDeArea { area: AreaDeCatalogo; cursos: CursoCartao[] }

/**
 * Como os cursos se distribuem em filas.
 *
 * A regra que decide: **fila de um cartão só não é fila.** Uma área com
 * um único curso viraria uma prateleira com um cartão e um trilho vazio
 * ao lado, e três áreas assim empilham três cartões um embaixo do outro
 * — que é exatamente o contrário de um catálogo lado a lado.
 *
 * Então área com dois cursos ou mais ganha fila própria; os cursos das
 * áreas de um só entram juntos numa fila comum, e ali cada cartão diz de
 * que área é (`mostrarArea`). Nada se perde, e ninguém fica sozinho na
 * prateleira.
 */
export function agruparPorArea(areas: AreaDeCatalogo[], cursos: CursoCartao[]) {
  const porArea = areas.map((area) => ({ area, cursos: cursos.filter((c) => c.areaSlug === area.slug) }));
  return {
    filas: porArea.filter((f) => f.cursos.length >= 2) as FilaDeArea[],
    avulsos: porArea.filter((f) => f.cursos.length === 1).flatMap((f) => f.cursos),
    vazias: porArea.filter((f) => f.cursos.length === 0).map((f) => f.area),
  };
}

/**
 * Em que pé o curso está — as três situações que a barra de filtros
 * oferece, derivadas do que já existe no cadastro. Não é coluna nova:
 * publicado com aula no ar está DISPONÍVEL; publicado sem aula, ou ainda
 * em revisão, está EM GRAVAÇÃO; sem onda marcada, é EM BREVE.
 */
export type Disponibilidade = 'disponivel' | 'gravacao' | 'breve';

export const disponibilidadeDe = (c: Pick<CursoCartao, 'publicada' | 'onda'>): Disponibilidade =>
  (c.publicada ? 'disponivel' : c.onda !== null ? 'gravacao' : 'breve');

export const DISPONIBILIDADE: Record<Disponibilidade, string> = {
  disponivel: 'Disponível', gravacao: 'Em gravação', breve: 'Em breve',
};

function Capa({ curso }: { curso: CursoCartao }) {
  const etiqueta = curso.etiqueta === undefined ? ONDA(curso.onda) : curso.etiqueta;
  const situacao = disponibilidadeDe(curso);
  return (
    <div className={curso.capa ? 'capa-curso' : `capa-curso capa-tom-${tomDaCapa(curso.areaSlug)}`}>
      {curso.capa
        ? (
          /* Decorativa: o título logo abaixo já diz do que é o curso, e
             repetir isso no alt faria o leitor de tela anunciar duas vezes. */
          <img className="capa-foto" src={curso.capa} alt="" loading="lazy" decoding="async" />
        )
        : <Icone nome="play_circle" tamanho={44} />}

      {/* As duas pílulas do layout: a onda (a tinta do portal) e a
          situação (branca). Ficam sobre a capa, que pode ser QUALQUER
          foto enviada pelo professor — por isso as duas têm fundo cheio,
          e não texto solto sobre a imagem. */}
      <div className="capa-marcas">
        {etiqueta && <span className="marca-onda">{etiqueta}</span>}
        <span className="marca-clara">{DISPONIBILIDADE[situacao]}</span>
      </div>

      {/* A prévia só existe onde há amostra gratuita com vídeo. Sem ela,
          nem o play aparece: um botão de play que não toca nada seria
          promessa quebrada no primeiro hover. */}
      {curso.publicada && curso.previa && <PreviaCapa src={curso.previa.src} />}
    </div>
  );
}

export default function CartaoCurso(
  { curso, mostrarArea = false }: { curso: CursoCartao; mostrarArea?: boolean },
) {
  const p = curso.progresso;
  const miolo = (
    <>
      <Capa curso={curso} />
      <div className="corpo-curso">
        <div className="cartao-rotulos">
          {/* Só onde a fila não diz a área: numa prateleira de "Direito
              Penal", repetir "Direito Penal" em cada cartão é ruído. */}
          {mostrarArea && <span className="area-do-cartao">{curso.areaNome}</span>}
          {curso.nivel && <span className="nivel-do-cartao">{curso.nivel}</span>}
        </div>
        <h3>{curso.nome}</h3>
        {curso.professor && <p className="autor">{curso.professor}</p>}
        <p className="ementa">{curso.ementa}</p>

        {curso.publicada && (
          <div className="meta-curso">
            <span><Icone nome="movie" tamanho={16} /> {plural(curso.aulas, 'aula', 'aulas')}</span>
            <span aria-hidden="true">·</span>
            <span>{curso.duracao}</span>
            {(curso.amostras ?? 0) > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="meta-amostra">
                  <Icone nome="play_circle" tamanho={16} /> amostra grátis
                </span>
              </>
            )}
          </div>
        )}

        <div className="rodape-cartao">
          {curso.publicada ? (
            <>
              {/* A caixa de preço do layout. `.linha-preco strong` é o
                  preço, e continua sendo: é por esse caminho que o teste
                  de ponta a ponta confere que a tabela de preços tem uma
                  fonte de verdade só (testes-e2e/administracao.mjs). */}
              <div className={p ? 'linha-preco' : 'linha-preco caixa-preco'}>
                {p ? (
                  <>
                    <span className="suave">andamento</span>
                    <strong>{p.pct}%</strong>
                  </>
                ) : curso.preco ? (
                  <>
                    <span className="preco-avulso">
                      <span className="caption suave">Valor avulso</span>
                      <strong>{curso.preco}/mês</strong>
                    </span>
                    <span className="chip chip-sm chip-primaria">Incluso no passe</span>
                  </>
                ) : (
                  <span className="suave">{plural(curso.aulas, 'aula', 'aulas')}</span>
                )}
              </div>
              {p && (
                <>
                  <div className="progresso"><i style={{ width: `${p.pct}%` }} /></div>
                  {p.prazo && (
                    <span className={p.atrasada ? 'caption prazo-vencido' : 'caption suave'}>
                      {p.atrasada ? 'prazo vencido em ' : 'prazo '}{p.prazo}
                    </span>
                  )}
                </>
              )}
              <span className="btn btn-primario btn-sm btn-bloco">
                {p ? 'Continuar' : 'Acessar curso'} <Icone nome="arrow_forward" tamanho={16} />
              </span>
            </>
          ) : (
            <div className="linha-preco">
              <span className="suave">
                {DISPONIBILIDADE[disponibilidadeDe(curso)]}
              </span>
              <span className="chip chip-sm chip-neutra">Avise-me</span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return curso.publicada ? (
    <Link className="cartao cartao-curso" href={curso.href ?? `/materia/${curso.slug}`}>{miolo}</Link>
  ) : (
    <div className="cartao cartao-curso cartao-fantasma">{miolo}</div>
  );
}
