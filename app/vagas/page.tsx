import Link from 'next/link';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../componentes.tsx';
import { exigirPortalAberto } from '../guarda-empresa.ts';
import {
  listarVagas, localidades, areasDeAtuacao, tiposDeVaga, iniciais, local as localDa,
  desdeQuando, POR_PAGINA, ROTULO_TIPO, ROTULO_REGIME, ROTULO_MODALIDADE, ICONE_MODALIDADE,
} from '../../lib/vagas.ts';

export const metadata: Metadata = {
  title: 'Mural de Vagas',
  description:
    'Vagas de estágio e emprego no mercado jurídico, publicadas por escritórios e departamentos jurídicos. Filtre por tipo, cidade e área de atuação.',
};
export const dynamic = 'force-dynamic';

/* Uma lista curta por página, como na referência: quem procura estágio lê
   a vaga inteira antes de decidir, e rolagem infinita esconde o total —
   que aqui é informação útil ("42 vagas encontradas"). */

type Params = Promise<Record<string, string | string[] | undefined>>;

const texto = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const lista = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []);

export default async function Vagas({ searchParams }: { searchParams: Params }) {
  await exigirPortalAberto('/vagas');
  const sp = await searchParams;
  const q = texto(sp.q).trim();
  const tipos = lista(sp.tipo);
  const localEscolhido = texto(sp.local);
  const area = texto(sp.area);
  const ordem = texto(sp.ordem) === 'antigas' ? 'antigas' : 'recentes';
  const pagina = Math.max(1, Number(texto(sp.pagina)) || 1);

  const [{ itens, total, paginas }, locais, areas] = await Promise.all([
    listarVagas({ q, tipos, local: localEscolhido, area, ordem, pagina }),
    localidades(),
    areasDeAtuacao(),
  ]);

  const primeiro = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const ultimo = Math.min(pagina * POR_PAGINA, total);
  const temFiltro = Boolean(q || tipos.length || localEscolhido || area);

  /** Link que troca uma coisa e preserva o resto do recorte. */
  const url = (mudanca: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    for (const t of tipos) p.append('tipo', t);
    if (localEscolhido) p.set('local', localEscolhido);
    if (area) p.set('area', area);
    if (ordem !== 'recentes') p.set('ordem', ordem);
    if (pagina > 1) p.set('pagina', String(pagina));
    for (const [chave, valor] of Object.entries(mudanca)) {
      if (valor === undefined) p.delete(chave);
      else p.set(chave, valor);
    }
    const busca = p.toString();
    return busca ? `/vagas?${busca}` : '/vagas';
  };

  return (
    <Pagina ativo="vagas">
      <section className="cabeca-materia">
        <div className="container">
          <div className="trilha-topo">
            <Link href="/">Início</Link><Icone nome="chevron_right" tamanho={16} /><span>Mural de vagas</span>
          </div>
          <h1>Mural de <em className="cor-marca">Vagas</em></h1>
          <p className="sub">
            Oportunidades no mercado jurídico publicadas por escritórios, departamentos
            jurídicos e órgãos públicos. A candidatura acontece direto com o anunciante.
          </p>
        </div>
      </section>

      <section className="secao">
        <div className="container mural">
          <aside className="mural-lado">
            {/* Um formulário GET: o recorte inteiro fica na URL, então a
                busca filtrada pode ser guardada nos favoritos e enviada
                a um colega — e funciona sem JavaScript. */}
            <form className="cartao filtros-vaga" method="get" action="/vagas">
              <div className="filtros-cabeca">
                <h2>Filtros</h2>
                {temFiltro && <Link className="filtro-limpar" href="/vagas">Limpar</Link>}
              </div>

              <label className="campo">
                Busca por palavra-chave
                <span className="campo-busca">
                  <Icone nome="search" tamanho={18} />
                  <input name="q" defaultValue={q} placeholder="Ex.: Direito Civil, estágio" />
                </span>
              </label>

              <fieldset className="campo">
                <legend>Tipo de vaga</legend>
                {tiposDeVaga().map((t) => (
                  <label className="caixa" key={t.chave}>
                    <input
                      type="checkbox" name="tipo" value={t.chave}
                      defaultChecked={tipos.includes(t.chave)}
                    />
                    {t.nome}
                  </label>
                ))}
              </fieldset>

              <label className="campo">
                Localização
                <select name="local" defaultValue={localEscolhido}>
                  <option value="">Todas as localidades</option>
                  <option value="remoto">Somente remoto</option>
                  {locais.map((l) => (
                    <option key={l.valor} value={l.valor}>{l.rotulo}</option>
                  ))}
                </select>
              </label>

              <label className="campo">
                Área de atuação
                <select name="area" defaultValue={area}>
                  <option value="">Todas as áreas</option>
                  {areas.map((a) => <option key={a.area} value={a.area}>{a.area}</option>)}
                </select>
              </label>

              {/* A ordenação é escolhida ali na lista; o formulário só a
                  carrega junto para não perdê-la ao filtrar. */}
              {ordem !== 'recentes' && <input type="hidden" name="ordem" value={ordem} />}

              <button className="btn btn-primario btn-bloco" type="submit">Aplicar filtros</button>
            </form>

            <div className="cartao-anuncie">
              <h3>Contrata em Direito?</h3>
              <p>
                Publicar vaga no mural é gratuito e em autosserviço. Toda vaga passa por
                aprovação antes de aparecer aqui e fica no ar por até 3 meses.
              </p>
              <Link className="btn btn-primario btn-sm" href="/planos#legal">Anunciar uma vaga</Link>
            </div>
          </aside>

          <div className="mural-lista">
            <div className="sabia">
              <div className="titulo"><Icone nome="lightbulb" tamanho={20} /> Dica de carreira</div>
              Adapte o currículo a cada vaga: destaque as experiências e os projetos
              acadêmicos que conversam com a área de atuação do anúncio.
            </div>

            <div className="mural-cabeca">
              <p className="filtro-resultado">
                {total === 0 ? 'Nenhuma vaga encontrada' : (
                  <>Exibindo <strong>{primeiro}–{ultimo}</strong> de <strong>{total}</strong>{' '}
                  {total === 1 ? 'vaga encontrada' : 'vagas encontradas'}</>
                )}
              </p>
              <div className="mural-ordem">
                <span>Ordenar por:</span>
                <Link
                  href={url({ ordem: undefined, pagina: undefined })}
                  className={`chip chip-sm ${ordem === 'recentes' ? 'chip-marca' : 'chip-contorno'}`}
                  aria-current={ordem === 'recentes' ? 'true' : undefined}
                >
                  Mais recentes
                </Link>
                <Link
                  href={url({ ordem: 'antigas', pagina: undefined })}
                  className={`chip chip-sm ${ordem === 'antigas' ? 'chip-marca' : 'chip-contorno'}`}
                  aria-current={ordem === 'antigas' ? 'true' : undefined}
                >
                  Mais antigas
                </Link>
              </div>
            </div>

            {itens.length === 0 ? (
              <p className="vazio">
                Nenhuma vaga corresponde a este recorte. Tente sem o filtro de
                localidade — boa parte das vagas de estágio é híbrida.
              </p>
            ) : itens.map((v) => (
              <article className="cartao vaga-cartao" key={v.id}>
                <span className="vaga-marca" aria-hidden="true">{iniciais(v.empresa)}</span>

                <div className="vaga-miolo">
                  <div className="vaga-topo">
                    <h2><Link href={`/vagas/${v.id}`}>{v.titulo}</Link></h2>
                    <span className="chip chip-sm chip-neutra">{desdeQuando(v.publicadaEm)}</span>
                  </div>
                  <p className="vaga-empresa">{v.empresa}</p>

                  <div className="vaga-etiquetas">
                    {/* Na vaga remota a etiqueta de modalidade já diz tudo:
                        "Remoto · 100% remoto" seria a mesma informação duas
                        vezes ocupando o lugar das que diferenciam. */}
                    {v.cidade && (
                      <span className="chip chip-sm chip-contorno">
                        <Icone nome="public" tamanho={15} /> {localDa(v)}
                      </span>
                    )}
                    <span className="chip chip-sm chip-primaria">
                      <Icone nome={ICONE_MODALIDADE[v.modalidade]} tamanho={15} />{' '}
                      {ROTULO_MODALIDADE[v.modalidade]}
                    </span>
                    <span className="chip chip-sm chip-contorno">
                      <Icone nome="schedule" tamanho={15} /> {ROTULO_REGIME[v.regime]}
                    </span>
                    <span className="chip chip-sm chip-contorno">
                      <Icone nome="work" tamanho={15} /> {ROTULO_TIPO[v.tipo]}
                    </span>
                  </div>

                  <p className="vaga-descricao">{v.descricao}</p>
                </div>

                <Link className="link-seta vaga-detalhes" href={`/vagas/${v.id}`}>
                  Ver detalhes <Icone nome="arrow_forward" tamanho={16} />
                </Link>
              </article>
            ))}

            {paginas > 1 && (
              <nav className="paginacao" aria-label="Páginas de vagas">
                {pagina > 1 && (
                  <Link className="pagina" href={url({ pagina: String(pagina - 1) })} aria-label="Página anterior">
                    <Icone nome="arrow_back" tamanho={16} />
                  </Link>
                )}
                {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={url({ pagina: n === 1 ? undefined : String(n) })}
                    className={`pagina ${n === pagina ? 'atual' : ''}`}
                    aria-current={n === pagina ? 'page' : undefined}
                  >
                    {n}
                  </Link>
                ))}
                {pagina < paginas && (
                  <Link className="pagina" href={url({ pagina: String(pagina + 1) })} aria-label="Próxima página">
                    <Icone nome="arrow_forward" tamanho={16} />
                  </Link>
                )}
              </nav>
            )}

            {/* §5.7.1: o mural não intermedeia a contratação. Dizer isso
                na própria lista, e não só nos termos, é o que separa
                mural de agência de emprego. */}
            <p className="mural-aviso">
              <Icone nome="info" tamanho={18} />
              A gestão de cada vaga é do anunciante. O Aprimore o Saber não intermedeia a
              contratação nem garante a vaga — se algo parecer golpe, use o link de
              denúncia dentro do anúncio.
            </p>
            <p className="centro">
              <span className="selo-ilustrativo">
                <Icone nome="info" tamanho={16} />
                Vagas ilustrativas — o mural abre para anunciantes reais na Fase 2
              </span>
            </p>
          </div>
        </div>
      </section>
    </Pagina>
  );
}
