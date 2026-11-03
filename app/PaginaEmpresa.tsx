import Link from 'next/link';
import { Pagina, Icone } from './componentes.tsx';
import FormDemonstracao from './FormDemonstracao.tsx';
import FormPedidoAcesso from './FormPedidoAcesso.tsx';
import { acaoRegistrarInteresse } from './empresas/acoes.ts';
import { acaoPedirAcesso } from './acoes-empresa-publica.ts';
import { resolverPagina, partesDoTitulo } from '../lib/pagina-empresa.ts';
import { lerConfiguracao } from '../lib/configuracao.ts';
import { portalAtual } from '../lib/portal-consultas.ts';
import { alunoAtual } from '../lib/sessao.ts';
import { ocupacaoDeContas } from '../lib/empresa.ts';
import { queryOne } from '../lib/db.ts';
import { PORTES, ROTULO_PORTE } from '../lib/empresas.ts';

/**
 * A página pública do portal de uma EMPRESA — a "universidade
 * corporativa" vista de fora. Layout aprovado em 10/09/2026 (o
 * `code.html` do pedido: "Aprimore Empresas").
 *
 * Até aqui a home da empresa era só o portão (`PortalDeEmpresaFechado`):
 * marca e login, nada mais — a regra do §5.11 de que treinamento interno
 * não aparece na rua. Esta página NÃO revoga a regra: ela é institucional
 * e não entrega conteúdo. Nada do que está aqui vem do acervo da empresa
 * — nem título de trilha, nem documento da biblioteca, nem nome de
 * pessoa. O que é do banco são dois NÚMEROS (colaboradores ativos e
 * documentos publicados), e o formulário de demonstração, que grava em
 * `interesse_empresa` — a mesma fila que `/admin/empresas` já atende.
 *
 * O que o RH controla (`/empresa/site`): nome, logo, cor, a etiqueta
 * acima do título (`chamada`), o contato — e, desde a fase 2 do
 * `docs/plano-pagina-da-universidade.md`, os textos de cada seção, as
 * fotos, quais seções aparecem e os dois blocos de contato. O que ele
 * não preencheu cai no padrão que o administrador edita em /admin, e
 * este no do código (`lib/pagina-empresa.ts`, `resolverPagina`).
 *
 * Duas regras da casa que o protótipo não trazia e valem aqui:
 *
 *   1. Número inventado não entra. "+8.400 colaboradores" e "180
 *      documentos" viraram contagem real; quando é zero, a linha some.
 *   2. Foto de banco leva `.selo-ilustrativo` (CDC, art. 37 — ver
 *      public/imagens/LEIA-ME.md). As duas imagens vieram do próprio
 *      protótipo, servidas daqui.
 */

/* Os quatro tons dos pilares, na ordem — o roxo é o do portal. */
const TONS = ['primaria', 'indigo', 'verde', 'ambar'];

const MOBILIDADE = [
  { i: 'cloud_sync', tom: 'primaria', t: 'Pausa Inteligente',
    p: 'Pausou a aula no notebook da empresa? O celular retoma no segundo exato onde parou.' },
  { i: 'download_for_offline', tom: 'indigo', t: 'Material para Levar',
    p: 'Manuais e apostilas da biblioteca baixam para o celular, para ler mesmo sem sinal.' },
  { i: 'touch_app', tom: 'verde', t: 'Testes Otimizados para Touch',
    p: 'Simulados e avaliações rápidos, respondidos facilmente na palma da mão com feedback instantâneo.' },
  { i: 'notifications_active', tom: 'ambar', t: 'Lembretes Suaves de Estudo',
    p: 'Prazo de conclusão em destaque no painel, para o colaborador manter a constância sem estresse.' },
];

const GESTAO = [
  { i: 'analytics', tom: 'primaria', t: 'Painel de Métricas em Tempo Real',
    p: 'Monitore quais áreas mais engajam, taxas de adesão aos treinamentos obrigatórios, médias de acerto nas avaliações e horas totais dedicadas à capacitação.' },
  { i: 'hub', tom: 'indigo', t: 'Trilhas por Departamento',
    p: 'Segmente facilmente o conteúdo: trilhas específicas para o setor Comercial, Jurídico, Atendimento, Financeiro, Tecnologia e Liderança, sem misturar tópicos.' },
  { i: 'security', tom: 'verde', t: 'Segurança Corporativa',
    p: 'Portal fechado, no seu endereço, com acesso só de quem o RH cadastrou ou convidou — e vídeo com endereço assinado e marca d\'água contra vazamento.' },
];

const BIBLIOTECA = [
  { i: 'description', tom: 'primaria', t: 'Políticas Internas, Códigos de Ética e Procedimentos',
    p: 'Disponibilize materiais de integração e compliance com controle de visualização por setor.' },
  { i: 'menu_book', tom: 'indigo', t: 'Legislação e Vade-mécum Sempre Atualizados',
    p: 'Consulta a leis, artigos regulatórios e referências técnicas com busca instantânea.' },
  { i: 'search', tom: 'verde', t: 'Busca Inteligente em Texto Completo',
    p: 'Localize tópicos, palavras-chave e modelos de documentos em segundos.' },
];

/* Os três "documentos" do preview são EXEMPLO — nunca o acervo real da
   empresa, que é interno (o e2e do portal confere que nem o título de um
   item publicado chega a quem não entrou). */
const DOCS_EXEMPLO = [
  { tipo: 'PDF', tom: 'vermelho', t: 'Manual de Boas Práticas e Conduta Corporativa',
    p: 'Atualizado há 5 dias • Setor de Recursos Humanos • 34 páginas' },
  { tipo: 'GUIA', tom: 'primaria', t: 'Guia de Integração e Onboarding do Colaborador',
    p: 'Obrigatório para novos membros • Leitura interativa' },
  { tipo: 'LEGIS', tom: 'azul', t: 'Coletânea de Normas Trabalhistas & Segurança (CLT/NRs)',
    p: 'Artigos comentados por especialistas jurídicos' },
];

const plural = (n: number, um: string, varios: string) =>
  `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

async function documentosPublicados(portalId: number): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM acervo WHERE portal_id = $1 AND status = 'PUBLICADO'`,
    [portalId],
  );
  return r?.n ?? 0;
}

export default async function PaginaEmpresa() {
  const [portal, aluno] = await Promise.all([portalAtual(), alunoAtual()]);
  const p = portal.personalizacao;
  const [ocupacao, documentos, padraoAdmin] = await Promise.all([
    ocupacaoDeContas(portal.id), documentosPublicados(portal.id), lerConfiguracao('pagina-universidade'),
  ]);
  const pg = resolverPagina(p, padraoAdmin);
  const colaboradores = pg.mostrarNumeros ? ocupacao.usadas : 0;
  const entrar = aluno ? '/painel' : '/entrar';
  // Para onde apontam os botões "fale conosco" da página: o bloco de
  // contato, se algum dos dois está ligado; senão, o login.
  const temContato = pg.secoes.contato || pg.secoes.pedidoAcesso;
  const alvoContato = temContato ? '#contato-consultor' : entrar;

  return (
    <Pagina ativo="inicio" aberta>
      {/* ---- 1. Abertura ---- */}
      <section className="hero uni-hero" id="topo">
        <div className="container">
          <div className="uni-centro">
            <span className="chip chip-primaria uni-etiqueta">
              <Icone nome="workspace_premium" tamanho={18} />
              {p.chamada || 'Universidade Corporativa e Desenvolvimento Contínuo de Pessoas'}
            </span>
            <h1>
              {partesDoTitulo(pg.titulo).map((t, i) =>
                t.destaque ? <em key={i}>{t.texto}</em> : <span key={i}>{t.texto}</span>)}
            </h1>
            <p>{pg.subtitulo}</p>
            <div className="acoes-linha uni-acoes">
              {pg.secoes.contato ? (
                <a className="btn btn-primario btn-lg" href="#contato-consultor">
                  <Icone nome="handshake" tamanho={20} /> Falar com um Especialista Corporativo
                </a>
              ) : pg.secoes.pedidoAcesso ? (
                <a className="btn btn-primario btn-lg" href="#contato-consultor">
                  <Icone nome="handshake" tamanho={20} /> Pedir acesso ao RH
                </a>
              ) : (
                <Link className="btn btn-primario btn-lg" href={entrar}>
                  <Icone nome="lock" tamanho={20} /> Entrar na universidade
                </Link>
              )}
              {pg.secoes.experiencia && (
                <a className="btn btn-contorno btn-lg" href="#experiencia">
                  <Icone nome="play_circle" tamanho={20} /> Conhecer o Ambiente do Colaborador
                </a>
              )}
            </div>
            <ul className="uni-provas">
              {pg.provas.map((t) => <li key={t}><Icone nome="check_circle" tamanho={18} /> {t}</li>)}
            </ul>
          </div>

          <figure className="uni-foto">
            <div className="uni-foto-moldura">
              <div className="uni-foto-quadro">
                <img
                  src={pg.fotoAbertura ?? '/imagens/equipe-colaborando.jpg'}
                  alt={pg.fotoAbertura
                    ? `Equipe da ${portal.nomeExibicao}`
                    : 'Equipe colaborando e estudando com notebooks e tablets em volta de uma mesa.'}
                  width={1376} height={768}
                />
                <div className="uni-foto-legendas">
                  <div className="uni-vidro">
                    <div className="uni-vidro-titulo">
                      <i className="ponto" aria-hidden="true" />
                      Crescimento que gera orgulho e resultados
                    </div>
                    <p>“{pg.citacao}”</p>
                  </div>
                  {/* A contagem é a de contas ativas do portal (a mesma do
                      teto do plano). Portal recém-aberto não tem o que
                      contar, e o selo simplesmente não aparece. */}
                  {colaboradores > 0 && (
                    <div className="uni-ativos">
                      <div className="uni-avatares" aria-hidden="true">
                        <span>RH</span><span>DEV</span><span>MKT</span>
                      </div>
                      <div>
                        <strong>{plural(colaboradores, 'colaborador ativo', 'colaboradores ativos')}</strong>
                        <span>Aprendendo diariamente</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Foto de banco leva o selo; a foto que a EMPRESA enviou é
                dela, e o selo sai junto com a encenação. */}
            {!pg.fotoAbertura && (
              <figcaption className="selo-ilustrativo">
                <Icone nome="info" tamanho={16} /> Imagem ilustrativa
              </figcaption>
            )}
          </figure>
        </div>
      </section>

      {/* ---- 2. O compromisso ---- */}
      {pg.secoes.compromisso && (
      <section className="secao divisa" id="proposito">
        <div className="container">
          <div className="secao-titulo">
            <span className="chip chip-primaria chip-sm">Nosso Compromisso Organizacional</span>
            <h2>Educação como o maior pilar de reconhecimento profissional</h2>
            <p>
              Acreditamos que investir nas pessoas é a estratégia mais sustentável e nobre de
              qualquer organização. Criamos uma plataforma corporativa acolhedora, inclusiva e
              focada na dignidade e crescimento de cada profissional.
            </p>
          </div>
          <div className="grade-4 uni-pilares">
            {pg.pilares.map((b, i) => (
              <div className="cartao uni-pilar cartao-toque" key={i}>
                <span className={`uni-selo tom-${TONS[i]}`}><Icone nome={b.icone} tamanho={24} /></span>
                <h3>{b.titulo}</h3>
                <p>{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ---- 3. O ambiente do colaborador ---- */}
      {pg.secoes.experiencia && (
      <section className="secao tinta" id="experiencia">
        <div className="container">
          <div className="secao-titulo">
            <span className="chip chip-primaria chip-sm">Experiência do Usuário</span>
            <h2>O que seu colaborador vivencia dentro da plataforma</h2>
            <p>
              Projetamos um ecossistema amigável, intuitivo e estimulante, onde aprender deixa de
              ser uma obrigação e se torna um momento de realização pessoal.
            </p>
          </div>

          <div className="grade-2 uni-etapas">
            {/* Etapa 1 */}
            <article className="cartao uni-etapa">
              <div className="uni-etapa-cabeca">
                <span className="uni-selo grande tom-primaria"><Icone nome="play_lesson" tamanho={30} /></span>
                <span className="chip chip-sm chip-primaria">Etapa 1 • Absorção</span>
              </div>
              <h3>Aprender com Videoaulas Claras e Objetivas</h3>
              <p>
                Player com velocidade ajustável, anotações salvas na conta, a fonte da lei ao
                lado e material de apoio em PDF disponível junto de cada aula.
              </p>
              <div className="uni-mock uni-mock-player">
                <div className="linha">
                  <span><i className="ponto" aria-hidden="true" /> Trilha Corporativa: Boas Práticas &amp; Compliance</span>
                  <span>12:45 / 15:00</span>
                </div>
                <div className="barra"><div style={{ width: '85%' }} /></div>
                <div className="linha">
                  <span className="ok">✓ 85% Concluído</span>
                  <span>Anotações salvas (3)</span>
                </div>
              </div>
            </article>

            {/* Etapa 2 */}
            <article className="cartao uni-etapa">
              <div className="uni-etapa-cabeca">
                <span className="uni-selo grande tom-indigo"><Icone nome="quiz" tamanho={30} /></span>
                <span className="chip chip-sm tom-indigo-chip">Etapa 2 • Validação</span>
              </div>
              <h3>Fazer Testes e Avaliações sobre o Conteúdo Ministrado</h3>
              <p>
                Ao final de cada aula, exercícios comentados; ao final da trilha, a avaliação
                com nota mínima. O colaborador testa o entendimento na hora, com o comentário de
                cada alternativa para sanar dúvidas.
              </p>
              <div className="uni-mock tom-indigo-fundo">
                <div className="linha">
                  <strong>Avaliação final da trilha</strong>
                  <span className="pill">9/10 Acertos</span>
                </div>
                <p>“Comentário do instrutor disponível em cada alternativa, para revisão.”</p>
                <div className="ok"><Icone nome="verified" tamanho={18} /> Aprovado — certificado liberado</div>
              </div>
            </article>

            {/* Etapa 3 */}
            <article className="cartao uni-etapa">
              <div className="uni-etapa-cabeca">
                <span className="uni-selo grande tom-verde"><Icone nome="monitoring" tamanho={30} /></span>
                <span className="chip chip-sm tom-verde-chip">Etapa 3 • Evolução</span>
              </div>
              <h3>Acompanhar a Própria Evolução e Metas</h3>
              <p>
                Painel claro onde o próprio profissional vê o percentual de conclusão por trilha,
                as obrigatórias primeiro, o prazo em destaque e o que falta para o certificado.
              </p>
              <div className="uni-mock tom-verde-fundo">
                <div className="linha">
                  <strong>Trilha de Liderança e Comunicação</strong>
                  <strong className="ok">4 de 5 Módulos</strong>
                </div>
                <div className="barra clara"><div style={{ width: '80%' }} /></div>
                <div className="linha miuda">
                  <span>24 horas contabilizadas</span>
                  <span className="ok">Falta apenas 1 avaliação</span>
                </div>
              </div>
            </article>

            {/* Etapa 4 */}
            <article className="cartao uni-etapa">
              <div className="uni-etapa-cabeca">
                <span className="uni-selo grande tom-ambar"><Icone nome="card_membership" tamanho={30} /></span>
                <span className="chip chip-sm tom-ambar-chip">Etapa 4 • Conquista</span>
              </div>
              <h3>Emitir Certificados Válidos e Compartilháveis</h3>
              <p>
                Aprovado na avaliação, o certificado sai na hora com a chancela da empresa e um
                código de validação público — qualquer auditoria confere pelo endereço do portal.
              </p>
              <div className="uni-mock tom-ambar-fundo uni-mock-cert">
                <div className="uni-mock-cert-info">
                  <span className="uni-selo tom-ambar-solido"><Icone nome="verified" tamanho={20} /></span>
                  <div>
                    <strong>Certificado Corporativo Emitido</strong>
                    <span>Código de autenticidade: #AP-CORP-9482</span>
                  </div>
                </div>
                <span className="pill">Imprimir PDF</span>
              </div>
            </article>
          </div>
        </div>
      </section>
      )}

      {/* ---- 4. Biblioteca corporativa ---- */}
      {pg.secoes.biblioteca && (
      <section className="secao divisa" id="biblioteca">
        <div className="container uni-duas">
          <div className="uni-texto">
            <span className="chip chip-primaria chip-sm">
              <Icone nome="auto_stories" tamanho={16} /> Biblioteca Corporativa Integrada
            </span>
            <h2>Centralize manuais, livros digitais, políticas internas e legislação em um único acervo</h2>
            <p className="body-lg">
              Não perca documentos importantes em e-mails ou pastas compartilhadas confusas. Na
              Biblioteca Corporativa, seus colaboradores têm consulta fácil e indexada ao
              conhecimento vital da organização.
            </p>
            <ul className="uni-lista-recursos">
              {BIBLIOTECA.map((r) => (
                <li key={r.t}>
                  <span className={`uni-selo pequeno tom-${r.tom}`}><Icone nome={r.i} tamanho={18} /></span>
                  <div>
                    <h4>{r.t}</h4>
                    <p>{r.p}</p>
                  </div>
                </li>
              ))}
            </ul>
            <a className="uni-link" href={alvoContato}>
              Descubra como estruturar a biblioteca da sua empresa <Icone nome="arrow_forward" tamanho={18} />
            </a>
          </div>

          <div className="cartao uni-biblioteca">
            <div className="uni-busca">
              <Icone nome="search" tamanho={20} />
              <span>Buscar normas, manuais, apostilas e leis da empresa...</span>
              <span className="chip chip-sm chip-primaria">Filtro Ativo</span>
            </div>
            <ul className="uni-docs">
              {DOCS_EXEMPLO.map((d) => (
                <li key={d.t}>
                  <span className={`uni-doc-tipo tom-${d.tom}`}>{d.tipo}</span>
                  <div>
                    <h5>{d.t}</h5>
                    <p>{d.p}</p>
                  </div>
                  <Icone nome="visibility" tamanho={20} className="uni-doc-olho" />
                </li>
              ))}
            </ul>
            <div className="uni-biblioteca-pe">
              {/* Contagem real do acervo publicado — não o título dele. */}
              <span>
                {documentos > 0
                  ? `${plural(documentos, 'documento indexado', 'documentos e normas indexados')} neste portal`
                  : 'Documentos e normas indexados, por setor'}
              </span>
              <strong>Disponível para estudo offline</strong>
            </div>
            <span className="selo-ilustrativo">
              <Icone nome="info" tamanho={16} /> Exemplo de tela — o acervo real é interno
            </span>
          </div>
        </div>
      </section>
      )}

      {/* ---- 5. Multiplataforma ---- */}
      {pg.secoes.multiplataforma && (
      <section className="secao uni-escura" id="multiplataforma">
        <div className="container uni-duas uni-duas-celular">
          <figure className="uni-celular">
            <div className="uni-celular-moldura">
              <div className="uni-celular-quadro">
                <img
                  src={pg.fotoCelular ?? '/imagens/treinamento-no-celular.jpg'}
                  alt="Celular com uma videoaula aberta no aplicativo, com título da aula, barra de progresso e abas de anotações."
                  width={768} height={1376} loading="lazy" decoding="async"
                />
                <div className="uni-celular-nota">
                  <strong><i className="ponto" aria-hidden="true" /> Sincronização em Tempo Real</strong>
                  <span>Comece no computador, continue no celular</span>
                </div>
              </div>
            </div>
            {!pg.fotoCelular && (
              <figcaption className="selo-ilustrativo">
                <Icone nome="info" tamanho={16} /> Tela ilustrativa do aplicativo
              </figcaption>
            )}
          </figure>

          <div className="uni-texto">
            <span className="chip chip-sm uni-chip-escuro">
              <Icone nome="smartphone" tamanho={16} /> Liberdade de Aprendizado em Qualquer Dispositivo
            </span>
            <h2>Educação que se adapta à rotina real dos seus colaboradores</h2>
            <p className="body-lg">
              Seja no escritório durante o expediente, em deslocamentos, em home office ou
              viagens: seu time tem acesso imediato aos conteúdos, testes e biblioteca
              diretamente no celular, tablet ou computador.
            </p>
            <div className="grade-2 uni-mobilidade">
              {MOBILIDADE.map((b) => (
                <div className="uni-cartao-escuro" key={b.t}>
                  <span className={`uni-selo tom-${b.tom} escuro`}><Icone nome={b.i} tamanho={20} /></span>
                  <h4>{b.t}</h4>
                  <p>{b.p}</p>
                </div>
              ))}
            </div>
            <a className="btn btn-primario" href={alvoContato}>
              {temContato ? 'Agendar teste no aplicativo corporativo' : 'Entrar pelo celular'}
              <Icone nome="arrow_forward" tamanho={18} />
            </a>
          </div>
        </div>
      </section>
      )}

      {/* ---- 6. Para o RH ---- */}
      {pg.secoes.gestao && (
      <section className="secao tinta divisa" id="gestao-rh">
        <div className="container">
          <div className="secao-titulo">
            <span className="chip chip-primaria chip-sm">Governança e Painel de RH</span>
            <h2>Controle total, relatórios em tempo real e segurança para seu time de Gente &amp; Gestão</h2>
            <p>
              Transforme dados brutos de aprendizado em inteligência estratégica para tomadas de
              decisão e avaliações de desempenho.
            </p>
          </div>
          <div className="grade-3 uni-gestao">
            {GESTAO.map((b) => (
              <div className="cartao uni-pilar cartao-toque" key={b.t}>
                <span className={`uni-selo tom-${b.tom}`}><Icone nome={b.i} tamanho={24} /></span>
                <h3>{b.t}</h3>
                <p>{b.p}</p>
              </div>
            ))}
          </div>
          <div className="cartao uni-faixa">
            <div className="uni-faixa-texto">
              <span className="uni-selo tom-neutra"><Icone nome="integration_instructions" tamanho={22} /></span>
              <div>
                <h4>Relatórios prontos para as suas ferramentas de RH</h4>
                <p>Progresso por pessoa e por trilha, com exportação em CSV que respeita os filtros — para importar onde o RH já trabalha.</p>
              </div>
            </div>
            <a className="btn btn-contorno btn-sm" href={alvoContato}>Consultar Compatibilidade Técnica →</a>
          </div>
        </div>
      </section>
      )}

      {/* ---- 7. Contato ----
          Dois blocos, cada um com a própria chave. O do RH vem primeiro:
          esta é a página da EMPRESA, e "ainda não tenho acesso" é a
          pergunta de quem chega aqui sem conta. O da plataforma é o funil
          de `/empresas`, que a empresa pode desligar (§3.4 do plano). */}
      {temContato && (
      <section className="secao uni-contato-secao" id="contato-consultor">
        <div className="container uni-contato-caixa uni-contato-pilha">
          {pg.secoes.pedidoAcesso && (
          <div className="cartao uni-contato">
            <div className="uni-contato-lado">
              <div>
                <span className="chip chip-sm uni-chip-escuro">
                  <Icone nome="badge" tamanho={16} /> Colaboradores da {portal.nomeExibicao}
                </span>
                <h3>Ainda não tem acesso?</h3>
                <p>
                  Peça aqui. O setor responsável pelo treinamento confere o seu vínculo e
                  responde com um link de convite — é a pessoa quem escolhe a própria senha.
                </p>
                <ul>
                  <li><Icone nome="check" tamanho={20} /> Resposta por e-mail, com o link de acesso</li>
                  <li><Icone nome="check" tamanho={20} /> Trilhas do seu setor liberadas na entrada</li>
                  <li><Icone nome="check" tamanho={20} /> Já tem conta? Use o botão Entrar</li>
                </ul>
              </div>
              {p.contato && (
                <div className="uni-contato-pe">
                  <strong>Prefere falar direto com o RH?</strong>
                  <span>{p.contato}</span>
                </div>
              )}
            </div>
            <div className="uni-contato-form">
              <h4 className="headline-md">Pedir acesso à universidade</h4>
              <p className="caption suave">Quem lê é o RH da sua empresa, não a plataforma.</p>
              <FormPedidoAcesso acao={acaoPedirAcesso} />
            </div>
          </div>
          )}

          {pg.secoes.contato && (
          <div className="cartao uni-contato">
            <div className="uni-contato-lado">
              <div>
                <span className="chip chip-sm uni-chip-escuro">
                  <Icone nome="support_agent" tamanho={16} /> Atendimento B2B Especializado
                </span>
                <h3>{pg.contatoTitulo}</h3>
                <p>{pg.contatoTexto}</p>
                <ul>
                  <li><Icone nome="check" tamanho={20} /> Diagnóstico gratuito de necessidades de RH</li>
                  <li><Icone nome="check" tamanho={20} /> Demonstração ao vivo do ambiente do colaborador</li>
                  <li><Icone nome="check" tamanho={20} /> Proposta sob medida para o número de pessoas</li>
                </ul>
              </div>
              <div className="uni-contato-pe">
                <strong>Prefere falar direto com nossa equipe?</strong>
                <span>{pg.contatoEmail}</span>
              </div>
            </div>

            <div className="uni-contato-form">
              <h4 className="headline-md">Solicite uma demonstração guiada</h4>
              <p className="caption suave">
                Preencha os dados da sua organização para receber o contato de um consultor.
              </p>
              <FormDemonstracao
                acao={acaoRegistrarInteresse}
                portes={PORTES.map((x) => ({ valor: x, rotulo: ROTULO_PORTE[x] }))}
                origem={portal.nomeExibicao}
              />
            </div>
          </div>
          )}
        </div>
      </section>
      )}

      {/* Quem já tem acesso não precisa rolar até o rodapé para entrar. */}
      {!aluno && (
        <p className="uni-ja-tem-acesso">
          Já é colaborador? <Link href={entrar}>Entrar na universidade</Link>
        </p>
      )}
    </Pagina>
  );
}
