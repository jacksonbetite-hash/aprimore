import Link from 'next/link';
import { Pagina, portalSuspenso, PortalSuspenso, Icone } from './componentes.tsx';
import { listarAreasEmCache, listarMateriasEmCache, formatarDuracao } from '../lib/catalogo.ts';
import { portalAtual } from '../lib/portal-consultas.ts';
import { alunoAtual } from '../lib/sessao.ts';
import { tabelaVigente } from '../lib/precos-consultas.ts';
import { brl, porMes } from '../lib/precos.ts';
import Prateleira from './catalogo/Prateleira.tsx';
import CartaoVitrine from './catalogo/CartaoVitrine.tsx';
import { agruparPorArea, type CursoCartao } from './catalogo/CartaoCurso.tsx';

/**
 * A página única do portal do professor — §5.10, "Anatomia": abertura,
 * acervo por área e assunto, método, oferta e contato. O rodapé legal
 * (identificação do responsável) mora no Rodape, que já sabe em que
 * portal está.
 *
 * Estrutura fixa, de propósito: o professor preenche campos (texto, foto,
 * cor), não escreve HTML. É o que mantém o provisionamento automático e
 * o suporte viáveis (§5.10).
 *
 * O layout é o aprovado em 09/09/2026 (a "imagem 1" que faltava ao
 * `docs/plano-vitrine-do-professor.md` — ver D5 de lá). O que ele mudou
 * em relação à fase 1:
 *
 *   - a mídia da abertura passou a ser a FOTO de estudo em grupo, e o
 *     celular desceu para a seção do método, ao lado das quatro caixas;
 *   - a contagem do acervo saiu dos chips flutuantes e virou a linha de
 *     números embaixo dos botões, presa por um filete;
 *   - o acervo ganhou cartão grande, dois por linha, com a capa em
 *     tamanho de cartaz (`CartaoVitrine`);
 *   - a oferta passou a ser o cartão de plano da plataforma (`.plano`),
 *     com o que cada licença inclui item a item, e não três preços soltos.
 *
 * O que o layout de referência trazia e NÃO entrou, porque seria número
 * inventado sob a marca de outra pessoa: nota de avaliação ("4,9"),
 * contagem de alunos aprovados, anos de magistério, cadência semanal de
 * publicação e o rótulo "ao vivo". Aqui só aparece o que o banco sabe
 * responder (§ CDC, art. 37 — ver o cabeçalho de `app/page.tsx`).
 */
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/* Como o estudo funciona — os mesmos quatro passos da home da
   plataforma. Sem imagem e sem número inventado: é descrição do produto,
   não prova social, e por isso pode aparecer em qualquer portal. */
const PASSOS = [
  { i: 'play_circle', t: 'Assista à aula', p: 'Vídeo curto, exemplo do dia a dia e nenhum jargão sem tradução.' },
  { i: 'menu_book', t: 'Consulte a fonte', p: 'A referência original abre ao lado da aula, em português claro.' },
  { i: 'quiz', t: 'Faça o exercício', p: 'Questão logo depois do conceito, com comentário item a item se você errar.' },
  { i: 'insights', t: 'Retome onde parou', p: 'O progresso vai junto: começou no computador, continua no celular.' },
];

/* Três linhas no pé da oferta. As três são verificáveis: quem cobra e
   responde pelo suporte é a plataforma (rodapé legal), o cancelamento é
   pelo painel e o arrependimento de 7 dias é o art. 49 do CDC. */
const CONFIANCA = [
  { i: 'verified_user', t: 'Pagamento e suporte pela plataforma Aprimore o Saber' },
  { i: 'more_time', t: 'Cancelamento em 2 cliques, no seu painel' },
  { i: 'replay', t: '7 dias para desistir e pedir o dinheiro de volta (CDC, art. 49)' },
];

/** Só vira `mailto:` o que é mesmo um endereço — o campo é texto livre. */
const ehEmail = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.trim());

export default async function PaginaPortal() {
  const portal = await portalAtual();
  const aluno = await alunoAtual();
  if (await portalSuspenso() && !aluno) return <PortalSuspenso />;

  const p = portal.personalizacao;
  const [areas, materias, tabela] = await Promise.all([
    listarAreasEmCache(portal.id), listarMateriasEmCache(portal.id), tabelaVigente(portal.id),
  ]);
  const publicadas = materias.filter((m) => m.status === 'publicado' && m.aulasPublicadas > 0);
  const totalAulas = publicadas.reduce((t, m) => t + m.aulasPublicadas, 0);
  const totalHoras = Math.round(publicadas.reduce((t, m) => t + m.duracaoTotal, 0) / 3600);
  const comAmostra = publicadas.reduce((t, m) => t + m.amostras, 0);
  const areasComCurso = areas.filter((a) => publicadas.some((m) => m.areaSlug === a.slug));

  const preco = brl(tabela.MATERIA.mensal);
  const cursos: CursoCartao[] = publicadas.map((m) => ({
    id: m.id, slug: m.slug, nome: m.nome, ementa: m.ementa, onda: m.onda,
    professor: m.professor, areaSlug: m.areaSlug, areaNome: m.areaNome, publicada: true,
    aulas: m.aulasPublicadas, duracao: formatarDuracao(m.duracaoTotal),
    duracaoSegundos: m.duracaoTotal, amostras: m.amostras, preco, capa: m.capa,
  }));
  const { filas, avulsos } = agruparPorArea(areasComCurso, cursos);

  return (
    <Pagina ativo="inicio">
      {/* ---- 1. Abertura ----
          Texto à esquerda com a contagem do acervo no pé; à direita a
          foto, com o professor no selo sobre ela. */}
      <section className="hero hero-vitrine">
        <div className="container hero-grade">
          <div>
            <span className="chip chip-sm chip-primaria">
              <i className="ponto" aria-hidden="true" /> {portal.nomeExibicao}
            </span>
            {/* Sem <em> aqui: o título em duas cores depende de saber onde
                cortar a frase, e esta frase é digitada pelo professor. */}
            <h1>{p.chamada || `Aulas de ${portal.nomeExibicao}`}</h1>
            <p>
              {p.proposito || 'Aulas em vídeo, com a lei ao lado e exercício ao final de cada uma.'}
            </p>
            <div className="acoes-linha">
              <a className="btn btn-primario btn-lg" href="#acervo">
                Ver as aulas <Icone nome="arrow_forward" tamanho={18} />
              </a>
              {!aluno && (
                <Link className="btn btn-contorno btn-lg" href="/cadastrar">
                  <Icone nome="celebration" tamanho={18} /> Testar 7 dias grátis
                </Link>
              )}
            </div>

            {/* A contagem do acervo. Era a nuvem de chips sobre a foto;
                virou linha de números porque ali ela competia com o selo
                do professor e sumia inteira no celular. Portal recém-aberto
                não tem o que contar, e a linha simplesmente não existe —
                zero em corpo grande é pior que silêncio. */}
            {publicadas.length > 0 && (
              <div className="hero-numeros">
                <div>
                  <b>{publicadas.length}</b>
                  <span>{publicadas.length === 1 ? 'curso publicado' : 'cursos publicados'}</span>
                </div>
                <div>
                  <b>{totalAulas}</b>
                  <span>{totalAulas === 1 ? 'aula em vídeo' : 'aulas em vídeo'}</span>
                </div>
                {totalHoras > 0 && (
                  <div>
                    <b>{totalHoras}h</b>
                    <span>de gravação</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* A mídia da abertura. É foto de banco, não registro de uma
              turma deste professor — por isso ela leva o
              `.selo-ilustrativo`, mesma regra dos retratos e depoimentos
              da home: anunciar como real o que é encenado é publicidade
              enganosa (CDC, art. 37). Ver public/imagens/LEIA-ME.md. */}
          <figure className="hero-foto">
            <div className="hero-foto-quadro">
              <img
                src="/imagens/estudo-em-grupo.jpg"
                alt="Grupo de estudantes reunidos em volta de uma mesa, com notebooks, cadernos e livros abertos."
                width={1376} height={768}
              />
              {/* O retrato do professor não abre a página em 220px: ele é
                  este selo sobre a mídia, e ganha tamanho de gente lá
                  embaixo, em "Quem ensina". Portal sem foto não o mostra —
                  e a mídia continua inteira, sem buraco. */}
              {p.foto && (
                <div className="hero-selo">
                  <img src={p.foto} alt="" width={44} height={44}
                       style={{ borderRadius: 'var(--r-full)', objectFit: 'cover' }} />
                  <div className="texto">
                    <strong>{portal.nomeExibicao}</strong>
                    quem dá as aulas
                  </div>
                </div>
              )}
            </div>
            <figcaption className="selo-ilustrativo">
              <Icone nome="info" tamanho={16} />
              Imagem ilustrativa
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ---- 2. Acervo ----
          Cartão grande, capa em tamanho de cartaz, dois por linha. A área
          continua sendo o título da fila: portal com muitas áreas não
          pode virar uma pilha única de cartazes. */}
      <section className="secao" id="acervo">
        <div className="container">
          <div className="acervo-cabeca">
            <div>
              <span className="chip chip-sm chip-primaria">Acervo do portal</span>
              <h2>As <em>aulas</em></h2>
              <p>Organizadas por área e assunto, com o preço e a duração de cada curso à vista.</p>
            </div>
            {comAmostra > 0 && (
              <span className="chip chip-primaria acervo-nota">
                <Icone nome="play_circle" tamanho={18} />
                {comAmostra === 1
                  ? 'Uma aula aberta para assistir sem assinar'
                  : `${comAmostra} aulas abertas para assistir sem assinar`}
              </span>
            )}
          </div>

          {publicadas.length === 0 && (
            <div className="vazio">As primeiras aulas estão em produção. Volte em breve.</div>
          )}

          {filas.map(({ area, cursos: daArea }) => (
            <Prateleira key={area.id} titulo={area.nome} nivel={3} largo>
              {daArea.map((c) => <CartaoVitrine key={c.id} curso={c} />)}
            </Prateleira>
          ))}

          {/* Os cursos de áreas com um só: numa fila comum, lado a lado.
              Sem título quando é a única fila — "As aulas", logo acima, já
              é o título dela. */}
          {avulsos.length > 0 && (
            <Prateleira titulo={filas.length ? 'Outros cursos' : null} nivel={3} largo>
              {avulsos.map((c) => <CartaoVitrine key={c.id} curso={c} />)}
            </Prateleira>
          )}

          {/* O que o passe completo faz com o acervo que ainda vai
              existir. Não promete cadência ("toda semana"), que é
              promessa do professor e não da plataforma: promete a regra
              comercial, que é nossa e está no cartão de plano abaixo. */}
          {publicadas.length > 0 && (
            <div className="faixa-novidade">
              <div className="faixa-novidade-texto">
                <span className="selo"><Icone nome="notifications" tamanho={22} /></span>
                <div>
                  <strong>Curso novo entra sem custo para o passe completo</strong>
                  <span>Quem assina o passe recebe também os cursos publicados depois da assinatura.</span>
                </div>
              </div>
              <a className="btn btn-contorno btn-sm" href="#oferta">Ver como assinar</a>
            </div>
          )}
        </div>
      </section>

      {/* ---- 3. Como o estudo funciona ----
          O celular à esquerda e as quatro caixas à direita. Entre o
          acervo e o preço: quem acabou de ver os cursos ainda não sabe
          COMO se estuda aqui, e é essa a pergunta que antecede "quanto
          custa". */}
      <section className="secao lavanda">
        <div className="container">
          <div className="secao-titulo">
            <span className="rotulo-etapa">Como funciona na sua rotina</span>
            <h2>Estude do jeito que <em>a memória funciona</em></h2>
            <p>Entender, ver a fonte, praticar e retomar. Nesta ordem, em pouco tempo por dia.</p>
          </div>

          <div className="vitrine-app espelhada">
            {/* A figura vem PRIMEIRO no HTML: é a coluna da esquerda no
                desktop, e no celular ela é a primeira coisa que se vê —
                que é como o layout de referência está desenhado. */}
            <figure className="vitrine-app-figura">
              <img
                src="/imagens/aula-no-celular.jpg"
                alt="Celular com uma videoaula aberta no aplicativo: o vídeo, o título da aula, a barra de progresso e as abas de anotações e material."
                width={768} height={1376} loading="lazy" decoding="async"
              />
              <div className="metodo-nota">
                <span className="selo"><Icone nome="devices" tamanho={20} /></span>
                <div>
                  <strong>Estudo na palma da mão</strong>
                  <span>Player, fonte da lei e exercício na mesma tela, no computador ou no celular.</span>
                </div>
              </div>
              <figcaption className="selo-ilustrativo">
                <Icone nome="info" tamanho={16} />
                Tela ilustrativa do aplicativo
              </figcaption>
            </figure>

            <div className="grade-2 metodo-cartoes">
              {PASSOS.map((b) => (
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
      </section>

      {/* ---- 4. Oferta ----
          O mesmo cartão de plano da plataforma (`.plano`), com o que cada
          licença inclui item a item. A lista não é escrita aqui de novo:
          ela é a de `app/planos/SeletorPeriodo.tsx`, resumida — duas
          listas diferentes para o mesmo produto seria a primeira delas a
          envelhecer errado. */}
      <section className="secao tinta" id="oferta">
        <div className="container">
          <div className="secao-titulo">
            <span className="rotulo-etapa">Investimento transparente</span>
            <h2>Como <em>assinar</em></h2>
            <p>Licença por curso ou passe completo. Pix ou cartão, 7 dias para desistir, cancelamento em 2 cliques.</p>
          </div>

          <div className="planos">
            <div className="cartao cartao-plano plano">
              <div className="nome">Um curso</div>
              <div className="promessa">Um curso inteiro, do começo ao fim</div>
              <p className="resumo">Para quem tem um objetivo específico e quer fechar ele agora.</p>
              <div className="valor">{brl(tabela.MATERIA.mensal)}<small>/mês</small></div>
              <p className="periodo">
                ou {brl(tabela.MATERIA.anual)} por ano ({brl(porMes(tabela.MATERIA.anual, 'anual'))}/mês)
              </p>
              <p className="inclui">A licença inclui:</p>
              <ul>
                <li><Icone nome="check_circle" tamanho={20} /> Todas as aulas do curso escolhido</li>
                <li><Icone nome="check_circle" tamanho={20} /> Exercícios comentados e material de apoio</li>
                <li><Icone nome="check_circle" tamanho={20} /> Biblioteca de fontes dentro da aula</li>
                <li className="ausente"><Icone nome="remove" tamanho={20} /> Os outros cursos deste portal</li>
              </ul>
              <Link className="btn btn-contorno btn-bloco" href="/planos">Assinar este curso</Link>
            </div>

            <div className="cartao cartao-plano plano destaque">
              <span className="fita">Mais completo</span>
              <div className="nome">Passe completo</div>
              <div className="promessa">O portal inteiro liberado</div>
              <p className="resumo">Para quem estuda mais de um curso e não quer escolher.</p>
              <div className="valor">{brl(tabela.CATALOGO.mensal)}<small>/mês</small></div>
              <p className="periodo">
                ou {brl(tabela.CATALOGO.anual)} por ano ({brl(porMes(tabela.CATALOGO.anual, 'anual'))}/mês)
              </p>
              <p className="inclui">Tudo do curso avulso, mais:</p>
              <ul>
                <li><Icone nome="check_circle" tamanho={20} /> Todos os cursos deste portal</li>
                <li><Icone nome="check_circle" tamanho={20} /> Os que forem publicados depois, sem custo</li>
                <li><Icone nome="check_circle" tamanho={20} /> Simulados e diagnóstico por assunto</li>
                <li><Icone nome="check_circle" tamanho={20} /> Certificado de curso livre ao concluir</li>
              </ul>
              <Link className="btn btn-primario btn-bloco" href="/planos">Ver planos e assinar</Link>
            </div>

            <div className="cartao cartao-plano plano">
              <div className="nome">Teste grátis</div>
              <div className="promessa">Conheça antes de decidir</div>
              <p className="resumo">Para sentir o método antes de colocar dinheiro.</p>
              <div className="valor">R$ 0</div>
              <p className="periodo">7 dias · sem cartão de crédito</p>
              <p className="inclui">O teste inclui:</p>
              <ul>
                <li><Icone nome="check_circle" tamanho={20} /> 1 curso à sua escolha</li>
                <li><Icone nome="check_circle" tamanho={20} /> Cerca de 20% das aulas dele</li>
                <li><Icone nome="check_circle" tamanho={20} /> Até 30 exercícios</li>
                <li className="ausente"><Icone nome="remove" tamanho={20} /> Material para download e certificado</li>
              </ul>
              <Link className="btn btn-contorno btn-bloco" href={aluno ? '/planos' : '/cadastrar'}>
                {aluno ? 'Ativar meus 7 dias' : 'Criar conta e testar'}
              </Link>
            </div>
          </div>

          <ul className="confianca">
            {CONFIANCA.map((c) => (
              <li key={c.t}><Icone nome={c.i} tamanho={18} /> {c.t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- 5. Quem ensina e contato ----
          A foto do professor aparece AQUI em tamanho de gente. Ela saiu da
          abertura (onde disputava o lugar da mídia) e chegou na única
          seção que fala dele — que é onde um retrato quer dizer alguma
          coisa. */}
      {(p.sobre || p.contato || p.foto) && (
        <section className="secao" id="sobre">
          <div className="container grade-7-5">
            {(p.sobre || p.foto) && (
              <div className="cartao cartao-professor">
                <div className="professor-cabeca">
                  {p.foto
                    ? <img src={p.foto} alt={`Foto de ${portal.nomeExibicao}`} width={128} height={128} />
                    : <span className="professor-vazio"><Icone nome="school" tamanho={40} /></span>}
                  <div>
                    <span className="rotulo-etapa">Quem ensina</span>
                    <h2 className="headline-md">{portal.responsavelNome ?? portal.nomeExibicao}</h2>
                    <span className="caption suave">Responsável pelo conteúdo deste portal</span>
                  </div>
                </div>
                {p.sobre
                  ? p.sobre.split('\n\n').map((par, i) => <p key={i}>{par}</p>)
                  : <p>{portal.nomeExibicao}</p>}
              </div>
            )}

            <div className="cartao cartao-contato">
              <span className="selo"><Icone nome="handshake" tamanho={24} /></span>
              <h2 className="headline-md">Contato e suporte</h2>
              <p className="suave">
                Dúvida sobre pagamento, acesso ou reembolso? A plataforma responde pelo
                suporte; conteúdo e didática são com o professor.
              </p>
              <ul className="contato-itens">
                {p.contato && (
                  <li>
                    <Icone nome="mail" tamanho={20} />
                    <div>
                      <span className="caption suave">Fale com o professor</span>
                      {ehEmail(p.contato)
                        ? <a href={`mailto:${p.contato.trim()}`}><strong>{p.contato}</strong></a>
                        : <strong>{p.contato}</strong>}
                    </div>
                  </li>
                )}
                <li>
                  <Icone nome="payments" tamanho={20} />
                  <div>
                    <span className="caption suave">Cobrança, acesso e reembolso</span>
                    <Link href="/planos#legal"><strong>Suporte da plataforma Aprimore o Saber</strong></Link>
                  </div>
                </li>
              </ul>
              <p className="contato-garantia">
                <Icone nome="verified_user" tamanho={16} />
                Arrependimento em 7 dias, com devolução integral (CDC, art. 49).
              </p>
            </div>
          </div>
        </section>
      )}
    </Pagina>
  );
}
