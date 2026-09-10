import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagina, Icone, portalSuspenso, PortalSuspenso } from '../componentes.tsx';
import { alunoAtual } from '../../lib/sessao.ts';
import { listarMateriasCompartilhadas, formatarDuracao } from '../../lib/catalogo.ts';
import { cursosDoPortal } from '../../lib/catalogo-cartoes.ts';
import { brl } from '../../lib/precos.ts';
import { tabelaVigente } from '../../lib/precos-consultas.ts';
import FiltroCursos from './FiltroCursos.tsx';
import Prateleira from './Prateleira.tsx';
import CartaoCurso from './CartaoCurso.tsx';
import Destaque from './Destaque.tsx';
import { portalAtual } from '../../lib/portal-consultas.ts';
import { exigirPortalAberto } from '../guarda-empresa.ts';

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'As áreas de conhecimento e os cursos do catálogo, com lançamento em ondas.',
};
export const dynamic = 'force-dynamic';

/** A imagem de reserva do banner, quando o curso em destaque não tem capa. */
const ILUSTRACAO_DESTAQUE = '/imagens/estudio-do-professor.jpg';

/**
 * A arte de abertura do catálogo DA PLATAFORMA. Ela entra atrás do texto
 * no lugar da capa do curso em destaque, e por dois motivos: a abertura
 * da casa é institucional — não muda de cara conforme quem estiver em
 * destaque —, e a capa do curso sai de um quadro do vídeo, feita para o
 * cartão (640×360, com a legenda queimada na imagem), não para ocupar
 * meia tela atrás de um título de 48px.
 *
 * No portal de um professor NÃO se passa esta arte: lá a abertura é do
 * curso dele, com a capa que ele mesmo enviou.
 *
 * É foto de banco (Adobe Stock, licenciada — procedência em
 * `public/imagens/LEIA-ME.md`), não a professora do curso, então o banner
 * a exibe com o selo "Imagem ilustrativa".
 */
const ABERTURA_CATALOGO = '/imagens/mulher-no-arquivo.jpg';

/* Como se estuda aqui — as quatro caixas da seção do celular.
   Cada uma é uma parte da tela da aula que existe hoje: as abas
   "Resumo", "Exercício", "Materiais" e "Artigos citados"
   (app/aula/[slug]/ConteudoAula.tsx), mais o progresso que o player
   grava (app/api/progresso). O layout de referência prometia aqui
   "modo offline" e "velocidade até 2.0x sem distorção" — a plataforma
   não baixa aula para ver sem rede, e a velocidade é a do player do
   navegador; prometer as duas seria vender o que não se entrega. */
const NO_CELULAR = [
  {
    i: 'devices',
    t: 'No celular e no computador',
    p: 'A mesma conta nos dois. O player guarda onde você parou, e a aula continua do mesmo ponto no outro aparelho.',
  },
  {
    i: 'quiz',
    t: 'Exercício depois da aula',
    p: 'Questões ao fim de cada aula, com comentário item a item — inclusive nas que você errou.',
  },
  {
    i: 'picture_as_pdf',
    t: 'Material para baixar',
    p: 'O que o professor anexa à aula fica na aba “Materiais”, para baixar e imprimir.',
  },
  {
    i: 'menu_book',
    t: 'A fonte da lei ao lado',
    p: 'Os artigos citados na aula abrem na aba do lado, no texto oficial — sem procurar em outra aba do navegador.',
  },
];

/* As perguntas do pé da página. Todas as respostas são regras da casa,
   verificáveis: a amostra e o teste estão em §6.1 e no cartão de planos,
   a cobrança e o arrependimento estão no rodapé legal e no CDC. Nenhuma
   fala em prazo de publicação de curso novo — essa é promessa do
   professor, não nossa. */
const PERGUNTAS = [
  {
    q: 'Dá para assistir antes de assinar?',
    r: 'Dá. Os cursos com “amostra grátis” no cartão têm aulas abertas, que rodam sem cadastro — inclusive a prévia que aparece ao passar o mouse sobre a capa. Além disso, criando conta você tem 7 dias de teste em um curso à escolha, sem cartão de crédito.',
  },
  {
    q: 'Quem cobra, e como eu cancelo?',
    r: 'Quem processa o pagamento e responde pelo suporte é a plataforma Aprimore o Saber, com nota em nome dela; o conteúdo e a didática são do professor. O cancelamento é em dois cliques no seu painel, e você tem 7 dias corridos para desistir com devolução integral (CDC, art. 49).',
  },
  {
    q: 'Um curso só ou o passe completo?',
    r: 'A licença avulsa libera um curso inteiro, do começo ao fim. O passe completo libera todos os cursos publicados deste portal — inclusive os que entrarem enquanto a sua assinatura estiver vigente, sem custo adicional.',
  },
  {
    q: 'O que significa “em gravação” e “em breve”?',
    r: '“Disponível” é o curso com aulas no ar, que você assiste hoje. “Em gravação” é o que já tem onda de lançamento definida e está sendo produzido. “Em breve” é o que está no mapa do catálogo mas ainda não tem data. A situação de cada um está no cartão e no filtro de disponibilidade.',
  },
];

export default async function Catalogo() {
  // §5.11 — no portal de uma empresa o catálogo é interno: quem não tem
  // sessão não vê nem o nome das trilhas.
  await exigirPortalAberto('/catalogo');
  const portal = await portalAtual();
  const portalId = portal.id;
  /* §5.11 — no portal de uma empresa este endereço não tem mais tela
     própria: o mesmo acervo é "Todas as trilhas", DENTRO do painel do
     colaborador, onde a barra lateral não some. O redirecionamento é o
     que mantém vivos os links antigos, os favoritos e o roteiro de
     demonstração, que apontam para cá. */
  if (portal.tipo === 'EMPRESA') redirect('/painel/trilhas');

  const aluno = await alunoAtual();
  // §5.10 — portal suspenso por inadimplência: visitante não vê o catálogo;
  // quem está logado passa (a licença vigente dele continua valendo).
  if (await portalSuspenso() && !aluno) return <PortalSuspenso />;
  const [{ areas, cursos }, tabela, parceiros] = await Promise.all([
    cursosDoPortal(portal, aluno?.id ?? null),
    tabelaVigente(portalId),
    // §5.10.2, etapa 5 — cursos de professores parceiros, só na plataforma.
    portalId === 0 ? listarMateriasCompartilhadas() : Promise.resolve([]),
  ]);
  const preco = brl(tabela.MATERIA.mensal);

  const publicados = cursos.filter((c) => c.publicada);
  const totalAulas = publicados.reduce((t, c) => t + c.aulas, 0);
  const totalHoras = Math.round(publicados.reduce((t, c) => t + c.duracaoSegundos, 0) / 3600);
  const plataforma = portalId === 0;

  /* O curso do banner: o que o professor marcou como destaque (db/043) e,
     entre dois marcados, o de menor ordem — que é a ordem em que
     `cursosDoPortal` já devolve. Sem marcação nenhuma, o primeiro
     publicado, para a página nunca abrir sem banner. */
  const destaque = publicados.find((c) => c.destaque) ?? publicados[0] ?? null;
  /* Com UM curso publicado só, tirá-lo da prateleira deixaria a página
     com o banner e um vão embaixo. Aí ele fica nos dois lugares — que é
     melhor que uma prateleira vazia. */
  const demais = destaque && publicados.length > 1
    ? cursos.filter((c) => c.id !== destaque.id)
    : cursos;
  const Titulo = destaque ? 'h2' : 'h1';

  return (
    <Pagina ativo="catalogo">
      {/* O banner só existe com curso publicado. Portal recém-aberto abre
          direto no cabeçalho da seção, que já nomeia a página — um banner
          com a arte de reserva e nenhum curso atrás dela seria vitrine de
          loja vazia. */}
      {destaque && (
        <Destaque curso={destaque} portal={portal.nomeExibicao} ilustracao={ILUSTRACAO_DESTAQUE}
                  fundo={plataforma ? ABERTURA_CATALOGO : null} />
      )}

      <section className="secao">
        <div className="container pilha-lg">
          {/* A faixa embaixo do banner. Na PLATAFORMA ela é o lançamento
              em ondas — promessa nossa, que o nosso suporte honra. No
              portal de um professor, a mesma faixa carrega as garantias
              da casa: aquelas três são verificáveis e valem em qualquer
              portal, enquanto "onda nova a cada duas semanas" sobraria
              para o professor cumprir. */}
          {plataforma ? (
            <div className="sabia">
              <div className="titulo"><Icone nome="waves" tamanho={20} /> Lançamento em ondas</div>
              Os cursos da <strong>1ª onda</strong> já estão publicados. Os seguintes abrem a cada
              duas a quatro semanas — entre na lista de espera para votar na próxima.
            </div>
          ) : publicados.length > 0 && (
            <div className="faixa-garantias">
              <div className="faixa-garantias-marca">
                <span className="selo"><Icone nome="verified_user" tamanho={22} /></span>
                <div>
                  <strong>Aulas gravadas, para assistir quando der</strong>
                  <span>
                    {publicados.length === 1 ? '1 curso' : `${publicados.length} cursos`} no ar ·{' '}
                    {totalAulas === 1 ? '1 aula' : `${totalAulas} aulas`}
                    {totalHoras > 0 && ` · ${totalHoras === 1 ? '1 hora' : `${totalHoras} horas`} de vídeo`}
                  </span>
                </div>
              </div>
              <ul className="faixa-garantias-itens">
                <li><Icone nome="replay" tamanho={16} /> 7 dias para desistir (CDC, art. 49)</li>
                <li><Icone nome="payments" tamanho={16} /> Cobrança e suporte pela plataforma</li>
                <li><Icone nome="more_time" tamanho={16} /> Cancelamento em 2 cliques</li>
              </ul>
            </div>
          )}

          {/* O título da página. Vira h2 quando existe banner: lá em cima
              o nome do curso em destaque já é o h1, e dois h1 na mesma
              página tiram do leitor de tela a única marca de "onde a
              página começa". Sem banner, este é o h1. */}
          <div className="cabeca-catalogo">
            <div>
              <Titulo className="headline-lg">
                {plataforma
                  ? <>O catálogo, <em>curso por curso</em></>
                  : <>Todos os cursos de <em>{portal.nomeExibicao}</em></>}
              </Titulo>
              <p className="suave">
                {plataforma
                  ? 'Áreas de conhecimento organizadas em trilhas. A licença é por curso, e as aulas e exercícios vêm junto.'
                  : portal.personalizacao.proposito
                    || 'Cada curso com as aulas em vídeo, a fonte da lei ao lado e exercício ao fim.'}
              </p>
            </div>
            <Link className="btn btn-contorno" href="/planos">
              Ver planos <Icone nome="arrow_forward" tamanho={16} />
            </Link>
          </div>

          {/* O curso do banner sai das prateleiras: repetido logo abaixo,
              ele apareceria duas vezes na mesma dobra. Some só quando não
              há filtro — filtrando, a pessoa espera ver TODOS os que
              correspondem, e o destaque é um deles. */}
          <FiltroCursos areas={areas} cursos={cursos} semFiltro={demais} />

          {parceiros.length > 0 && (() => {
            const cartoes = parceiros.map((m) => (
              <CartaoCurso key={`${m.portalMascara}-${m.slug}`} curso={{
                id: m.id, slug: m.slug, nome: m.nome, ementa: m.ementa, onda: m.onda,
                professor: `${m.professor ?? m.portalNome} · ${m.portalNome}`,
                areaSlug: m.areaSlug, areaNome: m.areaNome, capa: m.capa, nivel: m.nivel,
                publicada: m.aulasPublicadas > 0,
                aulas: m.aulasPublicadas, duracao: formatarDuracao(m.duracaoTotal),
                duracaoSegundos: m.duracaoTotal, amostras: m.amostras, preco,
                href: `/parceiros/${m.portalMascara}/materia/${m.slug}`,
              }} />
            ));
            return (
              <div style={{ marginTop: 48, minWidth: 0 }} id="parceiros">
                <Prateleira
                  titulo="Cursos de professores parceiros"
                  legenda="Produzidos em portais próprios e vendidos aqui, com o nosso checkout e as nossas garantias."
                >
                  {cartoes}
                </Prateleira>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ---- Onde se assiste ----
          A seção do celular do layout. A figura é a mesma da vitrine do
          portal (`aula-no-celular.jpg`), com o mesmo selo: é tela
          ilustrativa do aplicativo, e não uma captura de uso real. */}
      {publicados.length > 0 && (
        <section className="secao lavanda">
          <div className="container">
            <div className="vitrine-app espelhada">
              <figure className="vitrine-app-figura">
                <img
                  src="/imagens/aula-no-celular.jpg"
                  alt="Celular com uma videoaula aberta no aplicativo: o vídeo, o título da aula, a barra de progresso e as abas de anotações e material."
                  width={768} height={1376} loading="lazy" decoding="async"
                />
                <figcaption className="selo-ilustrativo">
                  <Icone nome="info" tamanho={16} />
                  Tela ilustrativa do aplicativo
                </figcaption>
              </figure>

              <div>
                <span className="chip chip-sm chip-primaria">
                  <Icone nome="devices" tamanho={16} /> Estude onde e quando quiser
                </span>
                <h2 className="headline-lg" style={{ margin: '14px 0 10px' }}>
                  As aulas <em>na palma da mão</em>
                </h2>
                <p className="suave" style={{ maxWidth: '40rem' }}>
                  Comece no computador e continue no celular sem perder o ponto. Cada aula
                  tem o vídeo, o resumo, os artigos citados e o exercício na mesma tela.
                </p>

                <div className="grade-2 metodo-cartoes" style={{ marginTop: 24 }}>
                  {NO_CELULAR.map((b) => (
                    <div className="cartao icone-caixa empilhada" key={b.t}>
                      <span className="selo"><Icone nome={b.i} tamanho={24} /></span>
                      <div>
                        <h3>{b.t}</h3>
                        <p>{b.p}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---- O passe completo ---- */}
      <section className="secao">
        <div className="container pilha-lg">
          <div className="chamada chamada-lado">
            <span className="bolha bolha-a" aria-hidden="true" />
            <span className="bolha bolha-b" aria-hidden="true" />
            <div className="chamada-texto">
              <span className="chip chip-sm chip-vidro">
                <Icone nome="loyalty" tamanho={16} /> Acesso a todo o acervo
              </span>
              <h2>Vai estudar mais de um curso?</h2>
              <p>
                O passe completo libera todos os cursos publicados — inclusive os lançados
                durante a sua vigência — por <strong>{brl(tabela.CATALOGO.mensal)}/mês</strong>.
                Sem fidelidade, com cancelamento em dois cliques no painel.
              </p>
            </div>
            <div className="chamada-acoes">
              <Link className="btn btn-primario btn-lg" href="/planos">Conhecer o passe completo</Link>
              <Link className="btn btn-vidro" href="/planos#comparar">Comparar com o curso avulso</Link>
            </div>
          </div>

          {/* ---- Dúvidas frequentes ---- */}
          <section className="faq-catalogo">
            <div className="secao-titulo">
              <h2>Dúvidas frequentes</h2>
              <p>Matrícula, pagamento, cancelamento e como o catálogo cresce.</p>
            </div>
            <div className="grade-2">
              {PERGUNTAS.map((p) => (
                <details className="cartao faq-item" key={p.q}>
                  <summary>
                    <Icone nome="info" tamanho={20} />
                    <span>{p.q}</span>
                    <Icone nome="expand_more" tamanho={20} className="faq-seta" />
                  </summary>
                  <p>{p.r}</p>
                </details>
              ))}
            </div>
          </section>

          {/* §5.10.2, etapa 3 — só no site principal: no portal de um
              professor, este convite seria concorrência na casa dele. */}
          {plataforma && (
            <p className="centro caption suave" style={{ marginTop: 16 }}>
              É professor? <Link href="/para-professores" style={{ fontWeight: 700 }}>Monte o seu próprio portal de cursos →</Link>
            </p>
          )}
        </div>
      </section>
    </Pagina>
  );
}
