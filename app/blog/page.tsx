import Link from 'next/link';
import type { Metadata } from 'next';
import { Pagina, Icone } from '../componentes.tsx';
import Newsletter from './Newsletter.tsx';
import { assinar } from './acoes.ts';
import { exigirPortalAberto } from '../guarda-empresa.ts';
import {
  listarCategorias, listarPosts, ultimoDaCategoria, dataLonga, type Post,
} from '../../lib/blog.ts';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Artigos de método de estudo, carreira, tecnologia, finanças e Direito — com o mesmo compromisso das aulas: explicar, não fazer decorar.',
};
export const dynamic = 'force-dynamic';

/* Os artigos e os retratos de autoria são material de avaliação, como os
   da página inicial (ver o cabeçalho de app/page.tsx): a tela diz isso em
   voz alta pelo selo .selo-ilustrativo enquanto o conteúdo editorial de
   verdade não entra. */

/* A capa de cada artigo é a foto do tema, guardada no próprio projeto
   (public/capas, procedência no LEIA-ME de lá) — foto diz do que o texto
   trata antes de o título ser lido, e é o que faz o cartão parar o olho.

   O desenho continua como reserva: post sem capa cadastrada cai no fundo
   da categoria com o ícone do assunto, e o artigo entra publicado no
   mesmo dia sem esperar imagem. Este é o mapa desses ícones — aberto de
   propósito, para que categoria nova apareça no filtro sem alteração de
   código, no ícone padrão até alguém escolher o dela. */
const ICONE: Record<string, string> = {
  'metodo-de-estudo': 'school',
  carreira: 'work',
  tecnologia: 'bolt',
  'financas-pessoais': 'payments',
  'direito-civil': 'balance',
  'direito-penal': 'gavel',
  'direito-tributario': 'account_balance',
  'direito-do-consumidor': 'loyalty',
  'direito-digital': 'public',
};
const iconeDe = (slug: string) => ICONE[slug] ?? 'description';

export default async function Blog(
  { searchParams }: { searchParams: Promise<{ categoria?: string }> },
) {
  await exigirPortalAberto('/blog');
  const { categoria } = await searchParams;
  const categorias = await listarCategorias();
  // categoria inventada na URL não vira lista vazia: cai no "Todos".
  const filtro = categorias.some((c) => c.slug === categoria) ? categoria : undefined;

  const dica = await ultimoDaCategoria('carreira');
  const posts = await listarPosts({
    categoria: filtro,
    excluir: dica ? [dica.id] : [],
    limite: 10,
  });
  const [destaque, ...recentes] = posts;

  return (
    <Pagina ativo="blog">
      <section className="blog-capa">
        <div className="container">
          <h1>O blog do <em className="cor-marca">Aprimore o Saber</em></h1>
          <p className="sub">
            Método de estudo, carreira, tecnologia, finanças e Direito — uma área por
            pílula, com o mesmo compromisso das aulas: explicar, não fazer decorar.
          </p>
          {/* As pílulas saem do banco, não de uma lista fixa aqui: área
              nova publicada aparece no filtro sozinha, e área sem artigo
              publicado não aparece — filtro que leva ao vazio é pior que
              filtro curto. */}
          <nav className="blog-filtros" aria-label="Áreas do blog">
            <Link
              href="/blog"
              className={`chip chip-sm ${filtro ? 'chip-contorno' : 'chip-marca'}`}
              aria-current={filtro ? undefined : 'page'}
            >
              Todos
            </Link>
            {categorias.map((c) => (
              <Link
                key={c.slug}
                href={`/blog?categoria=${c.slug}`}
                className={`chip chip-sm ${filtro === c.slug ? 'chip-marca' : 'chip-contorno'}`}
                aria-current={filtro === c.slug ? 'page' : undefined}
              >
                {c.nome}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="secao">
        <div className="container pilha-lg">
          {destaque ? (
            <div className="blog-vitrine">
              <article className="post-destaque">
                <Capa post={destaque} alta />
                <div className="post-corpo">
                  <h2><Link href={`/blog/${destaque.slug}`}>{destaque.titulo}</Link></h2>
                  <p>{destaque.resumo}</p>
                  <Assinatura post={destaque} />
                </div>
              </article>

              <aside className="blog-lado">
                {dica && (
                  <div className="cartao dica-carreira">
                    <h3>Dica de carreira</h3>
                    <p>{dica.resumo}</p>
                    <Link className="link-seta" href={`/blog/${dica.slug}`}>
                      Ler artigo completo <Icone nome="arrow_forward" tamanho={16} />
                    </Link>
                  </div>
                )}

                {/* O bloco pago do blog é da própria casa: publicidade de
                    terceiro nas páginas abertas é a frente do §5.7, e entra
                    com o cadastro de anunciante — não como cartão fixo. */}
                <div className="blog-oferta">
                  <span className="ico"><Icone nome="school" tamanho={28} /></span>
                  <h3>Passe completo</h3>
                  <p>
                    Todos os cursos publicados — e os que entrarem durante a sua vigência.
                    Sete dias de teste, sem cartão.
                  </p>
                  <Link className="btn btn-primario btn-sm" href="/planos">Conhecer planos</Link>
                </div>
              </aside>
            </div>
          ) : (
            <p className="vazio">
              Ainda não há artigo publicado nesta categoria. Volte em alguns dias — a
              pauta é semanal.
            </p>
          )}

          {recentes.length > 0 && (
            <div className="pilha-md">
              <h2 className="blog-secao">
                <Icone nome="library_books" tamanho={24} /> Artigos recentes
              </h2>
              <div className="grade-3">
                {recentes.slice(0, 6).map((p) => (
                  <article className="post-cartao" key={p.id}>
                    <Capa post={p} />
                    <div className="post-corpo">
                      <h3><Link href={`/blog/${p.slug}`}>{p.titulo}</Link></h3>
                      <p>{p.resumo}</p>
                      <div className="post-rodape">
                        <Link className="link-seta" href={`/blog/${p.slug}`}>
                          Ler mais <Icone nome="arrow_forward" tamanho={16} />
                        </Link>
                        <span className="post-tempo">
                          <Icone nome="schedule" tamanho={15} /> {p.minutosLeitura} min
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <p className="centro">
                <span className="selo-ilustrativo">
                  <Icone nome="info" tamanho={16} />
                  Artigos e retratos de autoria ilustrativos — pauta editorial em definição
                </span>
              </p>
            </div>
          )}

          <Newsletter acao={assinar} />
        </div>
      </section>
    </Pagina>
  );
}

/**
 * A capa do artigo: a foto do tema quando o post tem uma, e o fundo da
 * categoria com o ícone quando não tem — post novo entra publicado no
 * mesmo dia, sem esperar imagem.
 *
 * A imagem é decorativa (`alt=""`), e o link inteiro sai da ordem de
 * tabulação: o título logo abaixo leva ao mesmo lugar e já diz o que a
 * foto ilustra. Repetir o destino atrapalha quem navega por teclado e faz
 * o leitor de tela anunciar o mesmo artigo duas vezes.
 */
function Capa({ post, alta = false }: { post: Post; alta?: boolean }) {
  return (
    <Link
      className={alta ? 'post-capa alta' : 'post-capa'}
      href={`/blog/${post.slug}`}
      tabIndex={-1}
      aria-hidden="true"
    >
      {post.capa ? (
        <img
          className="capa-foto"
          src={`/capas/${post.capa}.jpg`}
          alt=""
          /* O destaque está acima da dobra e carrega junto com a página;
             os cartões da fileira esperam a rolagem chegar neles. */
          loading={alta ? 'eager' : 'lazy'}
        />
      ) : (
        <span className={`capa-arte c-${post.categoriaSlug}`}>
          <Icone nome={iconeDe(post.categoriaSlug)} tamanho={alta ? 64 : 40} />
        </span>
      )}
      <span className="capa-etiqueta">{post.categoriaNome}</span>
    </Link>
  );
}

/** Quem escreveu, quando, e em quanto tempo se lê. */
function Assinatura({ post }: { post: Post }) {
  return (
    <div className="post-assinatura">
      <span className="post-autor">
        {post.autorFoto && (
          <img src={`/retratos/${post.autorFoto}.jpg`} alt="" width={40} height={40} />
        )}
        <span>
          <strong>{post.autorNome}</strong>
          <small>{dataLonga(post.publicadoEm)}</small>
        </span>
      </span>
      <span className="post-tempo">
        <Icone nome="schedule" tamanho={15} /> {post.minutosLeitura} min de leitura
      </span>
    </div>
  );
}
