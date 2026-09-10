'use client';

import { useMemo, useState } from 'react';
import { Icone } from '../ui.tsx';
import Prateleira from './Prateleira.tsx';
import CartaoCurso, {
  agruparPorArea, tomDaCapa, disponibilidadeDe, DISPONIBILIDADE,
  type CursoCartao, type Disponibilidade,
} from './CartaoCurso.tsx';

/**
 * Barra de filtros + catálogo em prateleiras.
 *
 * O filtro roda no navegador porque o catálogo inteiro cabe numa página:
 * são dezenas de cursos, não milhares. Ida ao servidor a cada tecla seria
 * latência sem ganho. A página continua renderizada no servidor — este
 * componente só recebe a lista pronta e decide o que mostrar.
 */

export type { CursoCartao } from './CartaoCurso.tsx';

export interface AreaSecao { id: number; slug: string; nome: string }

type Ordem = 'catalogo' | 'nome' | 'aulas' | 'duracao';

/** Sem acento e em minúscula: "Introdução" acha "introducao". */
const dobrar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();


/**
 * Como o acervo se chama nesta tela. No portal de uma empresa tudo é
 * "trilha" — do menu ao formulário do RH (§5.11: curso → trilha, assunto
 * → módulo). Deixar "curso" escrito na busca era a única palavra da tela
 * que discordava do resto do produto.
 */
export interface Substantivo {
  um: string;
  varios: string;
  /** Complemento do total: "12 cursos NO CATÁLOGO". */
  onde: string;
  /** O gênero vai no dado, não deduzido da palavra: "nenhumA trilha",
      "publicadAs". Adivinhar pela terminação erra na primeira exceção. */
  feminino?: boolean;
}
const CURSO: Substantivo = { um: 'curso', varios: 'cursos', onde: 'no catálogo' };

/** "a" quando feminino, "o" quando masculino — o final que concorda. */
const fim = (s: Substantivo) => (s.feminino ? 'a' : 'o');

export default function FiltroCursos(
  { areas, cursos, substantivo = CURSO, semFiltro }: {
    areas: AreaSecao[]; cursos: CursoCartao[]; substantivo?: Substantivo;
    /**
     * O que as prateleiras mostram enquanto NENHUM filtro está ligado.
     * A página de cursos passa aqui o acervo menos o curso do banner:
     * repetido logo abaixo dele, o destaque apareceria duas vezes na
     * mesma dobra. Com filtro ligado a lista volta a ser `cursos`
     * inteira — quem filtra espera ver tudo o que corresponde, e o
     * destaque é um curso como os outros. Ausente = `cursos`.
     */
    semFiltro?: CursoCartao[];
  },
) {
  const [termo, setTermo] = useState('');
  const [area, setArea] = useState('');
  const [situacao, setSituacao] = useState('');
  const [nivel, setNivel] = useState('');
  const [professor, setProfessor] = useState('');
  const [ordem, setOrdem] = useState<Ordem>('catalogo');

  const professores = useMemo(
    () => [...new Set(cursos.map((c) => c.professor).filter((p): p is string => !!p))].sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    ),
    [cursos],
  );

  /* Os níveis são os que o professor escreveu nos cursos dele (db/043),
     não uma lista da casa: o filtro tem exatamente as opções que existem
     no acervo, e some inteiro no portal que não usa o campo. */
  const niveis = useMemo(
    () => [...new Set(cursos.map((c) => c.nivel).filter((n): n is string => !!n))].sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    ),
    [cursos],
  );

  const filtrados = useMemo(() => {
    const busca = dobrar(termo.trim());
    const achados = cursos.filter((c) => {
      if (area && c.areaSlug !== area) return false;
      if (professor && c.professor !== professor) return false;
      if (nivel && c.nivel !== nivel) return false;
      if (situacao && disponibilidadeDe(c) !== situacao) return false;
      if (!busca) return true;
      return dobrar(`${c.nome} ${c.ementa} ${c.professor ?? ''} ${c.nivel ?? ''}`).includes(busca);
    });
    if (ordem === 'catalogo') return achados;
    return [...achados].sort((a, b) => {
      if (ordem === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
      if (ordem === 'aulas') return b.aulas - a.aulas;
      return b.duracaoSegundos - a.duracaoSegundos;
    });
  }, [cursos, termo, area, situacao, nivel, professor, ordem]);

  const filtrando = !!(termo.trim() || area || situacao || nivel || professor);

  function limpar() {
    setTermo(''); setArea(''); setSituacao(''); setNivel(''); setProfessor('');
    setOrdem('catalogo');
  }

  /* As pílulas do que está ligado agora. Cada uma apaga o próprio filtro:
     com quatro seletores lado a lado, "Limpar filtros" sozinho obriga a
     recomeçar do zero quem só queria tirar UM deles. */
  const ligados: { chave: string; texto: string; desligar: () => void }[] = [
    area && { chave: 'area', texto: areas.find((a) => a.slug === area)?.nome ?? area, desligar: () => setArea('') },
    situacao && {
      chave: 'situacao', texto: DISPONIBILIDADE[situacao as Disponibilidade],
      desligar: () => setSituacao(''),
    },
    nivel && { chave: 'nivel', texto: nivel, desligar: () => setNivel('') },
    professor && { chave: 'professor', texto: professor, desligar: () => setProfessor('') },
    termo.trim() && { chave: 'termo', texto: `“${termo.trim()}”`, desligar: () => setTermo('') },
  ].filter(Boolean) as { chave: string; texto: string; desligar: () => void }[];

  return (
    <>
      <div className="filtros-bloco">
        <div className="filtros-catalogo">
          <div className="filtro-busca">
            <Icone nome="search" tamanho={20} />
            <input
              type="search"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder={`Buscar ${substantivo.varios}…`}
              aria-label={`Buscar ${substantivo.varios} pelo nome, ementa ou professor`}
            />
          </div>

          <div className="filtro-selects">
            <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área">
              <option value="">Todas as áreas</option>
              {areas.map((a) => <option key={a.slug} value={a.slug}>{a.nome}</option>)}
            </select>

            <select value={situacao} onChange={(e) => setSituacao(e.target.value)}
                    aria-label="Filtrar por disponibilidade">
              <option value="">Disponibilidade</option>
              <option value="disponivel">{DISPONIBILIDADE.disponivel}</option>
              <option value="gravacao">{DISPONIBILIDADE.gravacao}</option>
              <option value="breve">{DISPONIBILIDADE.breve}</option>
            </select>

            {/* O nível só aparece onde ele existe: portal que não usa o
                campo não ganha um seletor com uma opção só. */}
            {niveis.length > 0 && (
              <select value={nivel} onChange={(e) => setNivel(e.target.value)}
                      aria-label="Filtrar por nível">
                <option value="">Todos os níveis</option>
                {niveis.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}

            <select
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              aria-label="Filtrar por professor"
              disabled={professores.length === 0}
            >
              <option value="">Todos os professores</option>
              {professores.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label={`Ordenar ${substantivo.varios}`}>
              <option value="catalogo">Ordem do catálogo</option>
              <option value="nome">Nome (A–Z)</option>
              <option value="aulas">Mais aulas</option>
              <option value="duracao">Maior duração</option>
            </select>
          </div>
        </div>

        <div className="filtro-rodape">
          <p className="filtro-resultado" role="status">
            {filtrando
              ? `${filtrados.length} ${filtrados.length === 1 ? `${substantivo.um} encontrado` : `${substantivo.varios} encontrados`}`
              : `${cursos.length} ${substantivo.varios} ${substantivo.onde}`}
            {filtrando && (
              <button type="button" className="filtro-limpar" onClick={limpar}>Limpar filtros</button>
            )}
          </p>
          {ligados.length > 0 && (
            <div className="filtro-pilulas">
              {ligados.map((f) => (
                <button key={f.chave} type="button" className="filtro-pilula" onClick={f.desligar}>
                  {f.texto}
                  <Icone nome="close" tamanho={14} />
                  <span className="oculto-visual">tirar este filtro</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Com filtro ativo o resultado é para comparar, não para navegar —
          e comparar se faz em grade, com tudo à vista de uma vez. */}
      {filtrando
        ? areas.map((a) => {
          const daArea = filtrados.filter((c) => c.areaSlug === a.slug);
          /* Área sem resultado sai da tela: a lista de "nada aqui" seria
             mais longa que a de achados. */
          if (daArea.length === 0) return null;
          return (
            <section key={a.id}>
              <div className="cabeca-area">
                <h2 className="headline-md">{a.nome}</h2>
                <span className="caption suave">{legendaDaArea(daArea, substantivo)}</span>
              </div>
              <div className="grade-3">
                {daArea.map((c) => <CartaoCurso curso={c} key={c.id} />)}
              </div>
            </section>
          );
        })
        : (
          <Filas areas={areas} cursos={semFiltro ?? filtrados} todos={cursos}
                 substantivo={substantivo} />
        )}

      {filtrados.length === 0 && (
        <div className="vazio">
          {`Nenhum${substantivo.feminino ? 'a' : ''} ${substantivo.um} corresponde a esses filtros.`}{' '}
          <button type="button" className="filtro-limpar" onClick={limpar}>Limpar filtros</button>
        </div>
      )}
    </>
  );
}

const legendaDaArea = (cursos: CursoCartao[], s: Substantivo) => {
  const publicados = cursos.filter((c) => c.publicada).length;
  return `${cursos.length} ${cursos.length === 1 ? s.um : s.varios} · ${publicados} publicad${fim(s)}${publicados === 1 ? '' : 's'}`;
};

/**
 * O catálogo em filas, sem filtro na frente.
 *
 * Área com dois cursos ou mais tem fila própria; os cursos das áreas de
 * um só se juntam numa fila comum, para nenhum cartão ficar sozinho num
 * trilho (ver `agruparPorArea`). As áreas ainda sem curso continuam
 * aparecendo no fim: elas são o mapa para onde o catálogo cresce.
 */
function Filas({ areas, cursos, todos, substantivo }: {
  areas: AreaSecao[]; cursos: CursoCartao[];
  /**
   * O acervo INTEIRO, que pode ser maior que o exibido: a página de
   * cursos tira o curso do banner das prateleiras. As áreas vazias saem
   * daqui, e não de `cursos` — senão a área cujo único curso está no
   * banner apareceria como "em produção", que é o contrário do que ela é.
   */
  todos: CursoCartao[];
  substantivo: Substantivo;
}) {
  const { filas, avulsos } = agruparPorArea(areas, cursos);
  const { vazias } = agruparPorArea(areas, todos);
  return (
    <>
      {filas.map(({ area, cursos: daArea }) => (
        <Prateleira key={area.id} titulo={area.nome} legenda={legendaDaArea(daArea, substantivo)}>
          {daArea.map((c) => <CartaoCurso curso={c} key={c.id} />)}
        </Prateleira>
      ))}

      {avulsos.length > 0 && (
        <Prateleira
          titulo={filas.length
            ? `Outr${fim(substantivo)}s ${substantivo.varios}`
            : substantivo.varios[0].toUpperCase() + substantivo.varios.slice(1)}
          legenda={legendaDaArea(avulsos, substantivo)}
        >
          {avulsos.map((c) => <CartaoCurso curso={c} key={c.id} mostrarArea />)}
        </Prateleira>
      )}

      {vazias.length > 0 && (
        <section>
          <div className="cabeca-area">
            <h2 className="headline-md">Áreas em produção</h2>
            <span className="caption suave">
              Fazem parte do mapa para onde o catálogo cresce, mas ainda não têm curso.
            </span>
          </div>
          <div className="grade-3">
            {vazias.map((a) => <CartaoDeAreaVazia key={a.id} area={a.nome} />)}
          </div>
        </section>
      )}
    </>
  );
}

/**
 * Área que existe no mapa do catálogo mas ainda não tem curso. O cartão
 * é o que impede o mapa de ter buraco — e, com a capa, o que impede a
 * grade de ter um vão de altura diferente no meio.
 */
function CartaoDeAreaVazia({ area }: { area: string }) {
  return (
    <div className="cartao cartao-curso cartao-fantasma">
      <div className={`capa-curso capa-tom-${tomDaCapa(area)}`}>
        <Icone nome="play_circle" tamanho={44} />
        <span className="capa-etiqueta">Em breve</span>
      </div>
      <div className="corpo-curso">
        <h3>Área do mapa definitivo</h3>
        <p className="ementa">
          {area} faz parte do mapa para onde o catálogo cresce, mas ainda não tem
          curso no catálogo de partida.
        </p>
        <div className="rodape-cartao">
          <div className="linha-preco">
            <span className="suave">Em produção</span>
            <span className="chip chip-sm chip-neutra">Entrar na lista</span>
          </div>
        </div>
      </div>
    </div>
  );
}
