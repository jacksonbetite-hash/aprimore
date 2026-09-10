import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../../componentes.tsx';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalAtual } from '../../../lib/portal-consultas.ts';
import { queryOne } from '../../../lib/db.ts';
import {
  listarParaColaborador, facetasDoColaborador, tamanhoLegivel, type ItemAcervo,
} from '../../../lib/acervo.ts';
import { exigirColaborador } from '../../guarda-empresa.ts';

export const metadata: Metadata = { title: 'Biblioteca' };
export const dynamic = 'force-dynamic';

/**
 * A Biblioteca da empresa, pelo lado de quem lê.
 *
 * O item "Biblioteca" do menu levava ao vade-mécum — consulta a leis e
 * códigos, produto da plataforma jurídica. Numa empresa cujas trilhas
 * são integração, LGPD e liderança, aquela não era a biblioteca dela.
 * Esta é: o acervo que o RH publicou, filtrável por assunto e por autor.
 *
 * Os filtros vão na barra de endereço, e não em estado de cliente. Três
 * ganhos: a página continua inteira no servidor (a consulta já filtra
 * por setor, e nada que a pessoa não pode ver chega ao navegador), o
 * link é compartilhável ("veja os materiais de LGPD"), e o botão voltar
 * desfaz um filtro em vez de sair da tela.
 */
export default async function BibliotecaDoColaborador(
  { searchParams }: {
    searchParams: Promise<{ q?: string; assunto?: string; autor?: string; formato?: string }>;
  },
) {
  await exigirColaborador('/vademecum');
  const busca = await searchParams;
  const [portal, aluno] = await Promise.all([portalAtual(), alunoAtual()]);

  /* O setor decide o que a pessoa vê. Vem do banco, nunca da barra de
     endereço — trocar de setor pela URL seria ler o material do vizinho. */
  const dono = await queryOne<{ setorId: number | null }>(
    'SELECT setor_id::int AS "setorId" FROM usuario WHERE id = $1 AND portal_id = $2',
    [aluno!.id, portal.id],
  );
  const setorId = dono?.setorId ?? null;

  /* `q` na barra de endereço, `busca` no filtro: o nome curto é o que
     cabe numa URL compartilhada, e o nome longo é o que se lê no SQL.
     A tradução é aqui, e explícita — passar `busca` inteiro para
     `listarParaColaborador` deixava o termo digitado cair no chão sem
     erro nenhum, e a estante devolvia tudo como se nada tivesse sido
     buscado. */
  const filtro = {
    busca: busca.q, assunto: busca.assunto, autor: busca.autor, formato: busca.formato,
  };
  const [itens, facetas] = await Promise.all([
    listarParaColaborador(portal.id, setorId, filtro),
    facetasDoColaborador(portal.id, setorId),
  ]);

  const filtrando = !!(busca.q?.trim() || busca.assunto || busca.autor || busca.formato);
  /* Preserva os outros filtros ao mexer num deles: trocar o assunto não
     pode apagar a busca que a pessoa digitou. */
  const comFiltro = (mudanca: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = {
      q: busca.q, assunto: busca.assunto, autor: busca.autor, formato: busca.formato, ...mudanca,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/painel/biblioteca?${s}` : '/painel/biblioteca';
  };

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Biblioteca</h1>
          <p className="suave">
            Materiais que a {portal.nomeExibicao} disponibiliza para a equipe. Diferente das
            trilhas, aqui não há prazo nem avaliação — é para consultar quando precisar.
          </p>
        </div>
      </div>

      {facetas.assuntos.length === 0 && itens.length === 0 && !filtrando ? (
        <div className="cartao">
          <h2 className="headline-md">Nada por aqui ainda</h2>
          <p className="suave" style={{ marginTop: 8 }}>
            A empresa ainda não disponibilizou materiais. Quem publica é o setor responsável
            pelo treinamento
            {portal.personalizacao.contato && <> — {portal.personalizacao.contato}</>}.
          </p>
        </div>
      ) : (
        <>
          <form className="filtros-bloco" method="get" action="/painel/biblioteca">
            <div className="filtros-catalogo">
              <div className="filtro-busca">
                <Icone nome="search" tamanho={20} />
                <input type="search" name="q" defaultValue={busca.q ?? ''}
                       placeholder="Buscar por título ou autor…"
                       aria-label="Buscar na biblioteca por título ou autor" />
              </div>
              <div className="filtro-selects">
                <select name="assunto" defaultValue={busca.assunto ?? ''} aria-label="Filtrar por assunto">
                  <option value="">Todos os assuntos</option>
                  {facetas.assuntos.map((a) => (
                    <option key={a.assunto} value={a.assunto}>{a.assunto} ({a.quantos})</option>
                  ))}
                </select>
                <select name="autor" defaultValue={busca.autor ?? ''} aria-label="Filtrar por autor"
                        disabled={facetas.autores.length === 0}>
                  <option value="">Todos os autores</option>
                  {facetas.autores.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select name="formato" defaultValue={busca.formato ?? ''} aria-label="Filtrar por formato">
                  <option value="">Arquivo e link</option>
                  <option value="PDF">Só PDF</option>
                  <option value="LINK">Só link</option>
                </select>
                {/* Botão de verdade: sem JavaScript, o formulário precisa
                    de um envio. Os selects continuam funcionando por ele. */}
                <button className="btn btn-contorno" type="submit">
                  <Icone nome="filter_list" tamanho={20} /> Filtrar
                </button>
              </div>
            </div>
            <p className="filtro-resultado" role="status">
              {filtrando
                ? `${itens.length} ${itens.length === 1 ? 'material encontrado' : 'materiais encontrados'}`
                : `${itens.length} ${itens.length === 1 ? 'material disponível' : 'materiais disponíveis'}`}
              {filtrando && (
                <Link className="filtro-limpar" href="/painel/biblioteca">Limpar filtros</Link>
              )}
            </p>
          </form>

          {/* Os assuntos como chips, acima da estante: é o atalho que o
              select não dá — um clique, sem abrir lista. */}
          {facetas.assuntos.length > 0 && (
            <div className="chips-assunto">
              {facetas.assuntos.map((a) => {
                const aceso = busca.assunto === a.assunto;
                return (
                  <Link
                    key={a.assunto}
                    className={`chip chip-sm ${aceso ? 'chip-primaria' : 'chip-neutra'}`}
                    href={comFiltro({ assunto: aceso ? undefined : a.assunto })}
                    aria-pressed={aceso}
                  >
                    {a.assunto} · {a.quantos}
                  </Link>
                );
              })}
            </div>
          )}

          {itens.length === 0 ? (
            <div className="vazio">
              Nenhum material corresponde a esses filtros.{' '}
              <Link className="filtro-limpar" href="/painel/biblioteca">Limpar filtros</Link>
            </div>
          ) : (
            <div className="grade-3">
              {itens.map((i) => <CartaoDoAcervo item={i} key={i.id} />)}
            </div>
          )}
        </>
      )}
    </>
  );
}

/**
 * Um item na estante. A capa é a imagem enviada, quando existe, e o
 * desenho do assunto quando não — a mesma reserva do cartão de curso e
 * do post do blog: nenhuma tela espera imagem para existir.
 */
function CartaoDoAcervo({ item }: { item: ItemAcervo }) {
  const pdf = item.formato === 'PDF';
  const destino = pdf ? `/api/documento/${item.arquivo}` : item.url!;
  const peso = tamanhoLegivel(item.bytes);

  return (
    <div className="cartao cartao-acervo">
      <div className={`capa-acervo capa-tom-${tomDoAssunto(item.assuntos[0] ?? item.titulo)}`}>
        {item.capa
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.capa.startsWith('/') ? item.capa : `/api/imagem/${item.capa}`} alt="" />
          : <Icone nome={pdf ? 'menu_book' : 'link'} tamanho={40} />}
        <span className="capa-etiqueta">{pdf ? 'PDF' : 'LINK'}</span>
      </div>

      <div className="corpo-acervo">
        <h3>{item.titulo}</h3>
        <p className="autor">
          {item.autor || 'autoria não informada'}
          {item.ano && ` · ${item.ano}`}
        </p>
        {item.descricao && <p className="ementa">{item.descricao}</p>}

        {item.assuntos.length > 0 && (
          <div className="chips-assunto">
            {item.assuntos.slice(0, 3).map((a) => (
              <Link className="chip chip-sm chip-neutra" key={a}
                    href={`/painel/biblioteca?assunto=${encodeURIComponent(a)}`}>
                {a}
              </Link>
            ))}
          </div>
        )}

        <div className="rodape-acervo">
          <span className="caption suave">
            {item.setorNome ? `Setor ${item.setorNome}` : 'Toda a empresa'}
            {peso && ` · ${peso}`}
          </span>
          {/* Aba nova nos dois casos: a pessoa está no meio de uma
              trilha, e trocar a aba dela por um PDF perde o lugar. */}
          <a className="btn btn-primario btn-sm" href={destino} target="_blank" rel="noreferrer">
            {pdf ? 'Abrir' : 'Acessar'} <Icone nome="open_in_new" tamanho={18} />
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * O tom da capa desenhada. Mesma ideia de `tomDaCapa` no cartão de
 * curso: os assuntos são de cada empresa, então não há cor por nome
 * conhecido — o texto entra num hash e sai um dos seis tons, sempre o
 * mesmo para o mesmo assunto, sem guardar nada no banco.
 */
function tomDoAssunto(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) % 997;
  return (h % 6) + 1;
}
