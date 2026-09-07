import Link from 'next/link';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../componentes.tsx';
import BuscaVade from './BuscaVade.tsx';
import SumarioNorma from './SumarioNorma.tsx';
import {
  listarNormas, buscarNorma, dispositivosDaNorma, sumarioDaNorma,
  buscarDispositivos, aulasQueExplicam, paginaDoDispositivo,
  type Dispositivo, type Norma,
} from '../../lib/vademecum.ts';
import { partirDispositivo, partirAgrupador, ultimoNivel } from '../../lib/vademecum-texto.ts';
import { portalIdAtual } from '../../lib/portal-consultas.ts';
import { exigirPortalAberto } from '../guarda-empresa.ts';
import { tiposPorReferencia } from '../../lib/penas/catalogo/index.ts';

export const metadata: Metadata = {
  title: 'Vade-mécum Digital',
  description:
    'Consulta livre a leis e códigos, com busca por artigo ou trecho e link para as aulas que explicam cada dispositivo.',
};
export const dynamic = 'force-dynamic';

/* Uma norma não cabe numa página: o Código Civil tem 2.083 artigos. Quarenta
   é o que se lê numa rolagem sem perder o fio, e o sumário lateral leva
   direto ao título procurado. */
const POR_PAGINA = 40;

const DATA = (d: Date) => new Date(d).toLocaleDateString('pt-BR');

export default async function VadeMecum(
  { searchParams }: {
    searchParams: Promise<{ q?: string; norma?: string; p?: string; artigo?: string }>;
  },
) {
  await exigirPortalAberto('/vademecum');
  const { q = '', norma, p, artigo } = await searchParams;
  const termo = q.trim();
  const normas = await listarNormas();

  const atual = await buscarNorma(norma ?? normas[0]?.slug ?? 'cf-88');
  const totalPaginas = atual ? Math.max(1, Math.ceil(atual.dispositivos / POR_PAGINA)) : 1;
  /* Vindo da sugestão de busca, o endereço traz o artigo e não a página: é a
     posição dele na norma que decide onde abrir. Página pedida fora do
     intervalo cai na última — um endereço antigo ainda leva a algum lugar
     da lei, e não a uma página em branco. */
  const pedida = artigo && !p ? await paginaDoDispositivo(Number(artigo), POR_PAGINA) : Number(p) || 1;
  const pagina = Math.min(Math.max(1, pedida), totalPaginas);
  const portalId = await portalIdAtual();

  const dispositivos = termo
    ? await buscarDispositivos(termo, 60)
    : atual ? await dispositivosDaNorma(atual.id, { pagina, tamanho: POR_PAGINA }) : [];
  const sumario = !termo && atual ? await sumarioDaNorma(atual.id, POR_PAGINA) : [];

  // deep link bidirecional (§5.4): cada artigo mostra as aulas que o explicam
  const aulas = await aulasQueExplicam(portalId, dispositivos.map((d) => d.id));
  const aulasPorDispositivo = new Map<number, typeof aulas>();
  for (const aula of aulas) {
    const lista = aulasPorDispositivo.get(aula.dispositivoId) ?? [];
    lista.push(aula);
    aulasPorDispositivo.set(aula.dispositivoId, lista);
  }

  return (
    <Pagina ativo="vademecum">
      <div className="container vade-app">
        <aside className="vade-sumario">
          <h2>Acervo</h2>
          <p className="vade-sumario-sub">
            {normas.length} normas · {normas.reduce((s, n) => s + n.dispositivos, 0).toLocaleString('pt-BR')} artigos
          </p>
          <nav>
            {agruparNormas(normas).map(([grupo, doGrupo]) => (
              <section key={grupo} className="vade-grupo">
                <h3>{grupo}</h3>
                {doGrupo.map((n) => {
                  const marcada = !termo && atual?.slug === n.slug;
                  return (
                    <Link
                      key={n.id}
                      href={`/vademecum?norma=${n.slug}`}
                      className={marcada ? 'ativo' : undefined}
                      aria-current={marcada ? 'page' : undefined}
                    >
                      <Icone nome={n.icone} tamanho={20} />
                      <span className="nome">{n.nomeCurto}</span>
                      <span className="conta">{n.dispositivos}</span>
                    </Link>
                  );
                })}
              </section>
            ))}
          </nav>
          <Link className="vade-nova" href="/vademecum">
            <Icone nome="search" tamanho={18} /> Nova pesquisa
          </Link>
        </aside>

        <div className="vade-conteudo">
          <section className="vade-consulta">
            <h1>Consulta Legislação</h1>
            <p className="sub">
              Encontre artigos, leis e códigos em um ambiente otimizado para o seu estudo e prática.
            </p>
            <BuscaVade termoInicial={termo} />
            <div className="vade-atalhos">
              {normas.slice(0, 9).map((n) => (
                <Link
                  key={n.id}
                  href={`/vademecum?norma=${n.slug}`}
                  className={`chip chip-sm ${!termo && atual?.slug === n.slug ? 'chip-marca' : 'chip-contorno'}`}
                >
                  <Icone nome={n.icone} tamanho={15} />
                  {n.sigla}
                </Link>
              ))}
            </div>
          </section>

          <article className="vade-norma">
            {termo ? (
              <header className="vade-cabeca">
                <div>
                  <h2>
                    {dispositivos.length} {dispositivos.length === 1 ? 'resultado' : 'resultados'}{' '}
                    para “{termo}”
                  </h2>
                  <p className="vade-carimbo">
                    A busca entende o número do artigo e a sigla da norma (“art. 5º CF”), o texto
                    da lei e o nome que se aprende na aula (“cláusula pétrea”) — com ou sem acento.
                  </p>
                </div>
                <Link className="selo-vade" href="/vademecum">
                  <Icone nome="arrow_back" tamanho={16} /> Voltar ao acervo
                </Link>
              </header>
            ) : atual && (
              <header className="vade-cabeca">
                <div>
                  <h2 className="nome-norma">{atual.nome}</h2>
                  <p className="vade-carimbo">
                    {atual.dispositivos.toLocaleString('pt-BR')}{' '}
                    {atual.dispositivos === 1 ? 'artigo' : 'artigos'} · fonte: {atual.fonte}
                    {atual.urlFonte && (
                      <> · <a href={atual.urlFonte} target="_blank" rel="noreferrer">texto oficial</a></>
                    )}
                  </p>
                </div>
                <span className="selo-vade">
                  <Icone nome="verified_user" tamanho={16} />
                  Texto conferido em {DATA(atual.conferidoEm)}
                </span>
              </header>
            )}

            {!termo && sumario.length > 0 && atual && (
              <SumarioNorma normaSlug={atual.slug} secoes={sumario} paginaAtual={pagina} />
            )}

            <hr className="vade-regua" />

            {termo
              ? dispositivos.map((d) => (
                <Artigo
                  key={d.id}
                  dispositivo={d}
                  rotulo={`${d.normaSigla} · ${d.rotulo}`}
                  aulas={aulasPorDispositivo.get(d.id) ?? []}
                  calculavel={tiposPorReferencia(d.normaSlug, d.rotulo)[0]?.id}
                />
              ))
              : agruparPorTitulo(dispositivos).map((secao) => {
                const { titulo, subtitulo } = partirAgrupador(ultimoNivel(secao.titulo));
                return (
                  <section className="vade-secao" key={secao.titulo}>
                    {titulo && (
                      <div className="vade-titulo-lei">
                        <strong>{titulo}</strong>
                        {subtitulo && <span>{subtitulo}</span>}
                      </div>
                    )}
                    {secao.itens.map((d) => (
                      <Artigo
                        key={d.id}
                        dispositivo={d}
                        rotulo={d.rotulo}
                        destacado={String(d.id) === artigo}
                        aulas={aulasPorDispositivo.get(d.id) ?? []}
                  calculavel={tiposPorReferencia(d.normaSlug, d.rotulo)[0]?.id}
                      />
                    ))}
                  </section>
                );
              })}

            {dispositivos.length === 0 && (
              <p className="vazio">
                Nada encontrado{termo && ` para “${termo}”`}. Procure pelo número do artigo com a
                sigla da norma (<strong>art. 5º CF</strong>, <strong>121 do CP</strong>) ou por uma
                palavra do texto legal.
              </p>
            )}

            {!termo && atual && totalPaginas > 1 && (
              <Paginacao normaSlug={atual.slug} pagina={pagina} total={totalPaginas} />
            )}
          </article>

          <p className="vade-nota">
            ⚖️ Textos de lei não são protegidos por direito autoral (Lei 9.610/98, art. 8º, IV).
            A obrigação aqui é de <strong>exatidão e atualização</strong> — por isso cada norma
            carrega a data em que foi conferida e o endereço do texto oficial de onde veio.
          </p>
        </div>
      </div>
    </Pagina>
  );
}

/** Um dispositivo como na página impressa: rótulo à margem, texto ao lado. */
function Artigo(
  { dispositivo, rotulo, aulas, destacado = false, calculavel }: {
    dispositivo: Dispositivo;
    rotulo: string;
    aulas: { slug: string; titulo: string }[];
    destacado?: boolean;
    /** Id do tipo na Calculadora Penal (§5.12), quando o artigo é um crime catalogado. */
    calculavel?: string;
  },
) {
  const blocos = partirDispositivo(dispositivo.texto);

  return (
    <div className={`vade-artigo ${destacado ? 'destacado' : ''}`} id={`d${dispositivo.id}`}>
      <div className="vade-rotulo">
        <strong>{rotulo}</strong>
        <span className="vade-acoes">
          {/* §5.12 — a ponte do artigo para a calculadora: só nos crimes catalogados */}
          {calculavel && (
            <Link className="botao-icone" title="Calcular a pena" aria-label="Calcular a pena deste crime" href={`/calculadora-penal?tipo=${calculavel}`}>
              <Icone nome="calculate" tamanho={18} />
            </Link>
          )}
          <span className="botao-icone" title="Favoritar"><Icone nome="star" tamanho={18} /></span>
          <span className="botao-icone" title="Anotar"><Icone nome="edit" tamanho={18} /></span>
        </span>
      </div>

      <div className="vade-corpo">
        {blocos.map((bloco, i) => {
          const chave = `${bloco.tipo}-${bloco.rotulo}-${i}`;
          switch (bloco.tipo) {
            case 'inciso':
            case 'alinea':
            case 'item':
              return (
                <p key={chave} className={`vade-${bloco.tipo}`}>
                  <span className="marcador">{bloco.rotulo}{bloco.tipo === 'inciso' ? ' -' : ')'}</span>
                  <span className="texto-lei">{bloco.texto}</span>
                </p>
              );
            case 'paragrafo':
              return (
                <p key={chave} className="vade-paragrafo">
                  <strong>{bloco.rotulo}</strong>{' '}
                  <span className="texto-lei">{bloco.texto}</span>
                </p>
              );
            case 'pena':
              return (
                <p key={chave} className="vade-pena">
                  <strong>{bloco.rotulo} —</strong>{' '}
                  <span className="texto-lei">{bloco.texto}</span>
                </p>
              );
            case 'rubrica':
              return <p key={chave} className="vade-rubrica">{bloco.texto}</p>;
            default:
              return <p key={chave} className="texto-lei">{bloco.texto}</p>;
          }
        })}

        {/* O "você sabia" desta tela não é curiosidade solta: é a ponte para
            a aula que explica o dispositivo — o que o aluno veio buscar. */}
        {aulas.length > 0 && (
          <aside className="vade-sabia">
            <span className="pino"><Icone nome="lightbulb" tamanho={18} /></span>
            <div>
              <strong>Explicado na aula</strong>
              <p>
                {aulas.map((a, i) => (
                  <span key={a.slug}>
                    {i > 0 && ' · '}
                    <Link href={`/aula/${a.slug}`}>{a.titulo}</Link>
                  </span>
                ))}
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Paginacao({ normaSlug, pagina, total }: { normaSlug: string; pagina: number; total: number }) {
  const endereco = (n: number) => `/vademecum?norma=${normaSlug}&p=${n}`;
  return (
    <nav className="vade-paginacao" aria-label="Páginas da norma">
      {pagina > 1 && (
        <Link className="btn btn-contorno" href={endereco(pagina - 1)}>
          <Icone nome="arrow_back" tamanho={16} /> Anteriores
        </Link>
      )}
      <span className="vade-paginacao-conta">Página {pagina} de {total}</span>
      {pagina < total && (
        <Link className="btn btn-contorno" href={endereco(pagina + 1)}>
          Próximos <Icone nome="arrow_forward" tamanho={16} />
        </Link>
      )}
    </nav>
  );
}

/** As normas entram no sumário sob o grupo a que pertencem, na ordem do acervo. */
function agruparNormas(normas: Norma[]) {
  const grupos = new Map<string, Norma[]>();
  for (const n of normas) {
    const doGrupo = grupos.get(n.grupo);
    if (doGrupo) doGrupo.push(n);
    else grupos.set(n.grupo, [n]);
  }
  return [...grupos.entries()];
}

/**
 * Reúne os dispositivos sob o título a que pertencem. O agrupamento é por
 * título, e não por vizinhança na lista: se o art. 2º vem depois do art. 6º
 * na ordem do acervo, ele ainda assim pertence ao Título I e entra lá — do
 * contrário o mesmo título apareceria duas vezes na mesma página.
 * Dentro de cada título, e entre os títulos, vale a ordem do banco.
 */
function agruparPorTitulo(dispositivos: Dispositivo[]) {
  const secoes: { titulo: string; itens: Dispositivo[] }[] = [];
  const porTitulo = new Map<string, Dispositivo[]>();
  for (const d of dispositivos) {
    const titulo = d.agrupador ?? '';
    const itens = porTitulo.get(titulo);
    if (itens) itens.push(d);
    else {
      const novos = [d];
      porTitulo.set(titulo, novos);
      secoes.push({ titulo, itens: novos });
    }
  }
  return secoes;
}
