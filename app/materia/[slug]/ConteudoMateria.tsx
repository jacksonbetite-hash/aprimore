import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pagina, Icone, portalSuspenso, PortalSuspenso } from '../../componentes.tsx';
import ComprarParceiro from '../../parceiros/ComprarParceiro.tsx';
import { acaoComprar } from '../../acoes-comerciais.ts';
import { temCpf } from '../../../lib/checkout.ts';
import {
  buscarMateria, listarAulasDaMateria, formatarDuracao,
} from '../../../lib/catalogo.ts';
import { Anel } from '../../AnelProgresso.tsx';
import { espectadorAtual, alunoAtual } from '../../../lib/sessao.ts';
import { podeAcessar, acessoAoCurso, espectadorParaCurso } from '../../../lib/licenca.ts';
import { progressoDoCurso, proximaAula, percentual } from '../../../lib/progresso-curso.ts';
import { brl, porMes } from '../../../lib/precos.ts';
import { tabelaVigente } from '../../../lib/precos-consultas.ts';
import { portalIdAtual } from '../../../lib/portal-consultas.ts';

/**
 * A página do curso, parametrizada por DE QUEM É O CURSO (§5.10.2, etapa 5).
 *
 * No caso comum, o curso é do portal em que se está (`/materia/[slug]`).
 * Na vitrine compartilhada, um curso de professor parceiro é mostrado na
 * plataforma em `/parceiros/[mascara]/materia/[slug]`: mesmo componente,
 * `portalDoCurso` diferente do portal do aluno, links com o prefixo do
 * parceiro e a compra pelo NOSSO preço e checkout. O passe completo do
 * aluno não abre curso alheio — `espectadorParaCurso` cuida disso.
 */
export interface Parceiro { mascara: string; nome: string; vende: boolean }

/** "1 aula" e "2 aulas" — a contagem carrega a concordancia junto. */
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Iniciais do professor para o avatar, sem o "Prof." na frente. */
const iniciais = (nome: string) =>
  nome.replace(/^Prof\.?ª?\s*/, '').split(' ').map((p) => p[0]).slice(0, 2).join('');

export default async function ConteudoMateria(
  { slug, portalDoCurso, base, parceiro }:
  { slug: string; portalDoCurso: number; base: string; parceiro: Parceiro | null },
) {
  const portalDoAluno = await portalIdAtual();
  const aluno = await alunoAtual();
  // §5.10 — portal suspenso por inadimplência: visitante não vê o catálogo;
  // quem está logado passa (a licença vigente dele continua valendo).
  if (await portalSuspenso() && !aluno) return <PortalSuspenso />;
  const materia = await buscarMateria(portalDoCurso, slug);
  if (!materia) notFound();

  const [aulas, espectadorBruto, tabela] = await Promise.all([
    listarAulasDaMateria(portalDoCurso, materia.id), espectadorAtual(), tabelaVigente(portalDoAluno),
  ]);
  const espectador = espectadorParaCurso(espectadorBruto, portalDoCurso === portalDoAluno);
  const publicadas = aulas.filter((a) => a.status === 'publicado');
  /* Quem já comprou não precisa ver o preço de novo: precisa saber onde
     parou. A decisão de acesso é a MESMA do cadeado da aula (§6.3), um
     degrau acima — ver `acessoAoCurso`. */
  const acesso = acessoAoCurso(espectador, materia.id);
  const progresso = await progressoDoCurso(
    acesso.libera ? aluno?.id : undefined, materia.id,
  );
  const retomar = acesso.libera ? proximaAula(publicadas, progresso) : null;
  const pctCurso = percentual(progresso.aulasConcluidas, publicadas.length);
  const emProducao = aulas.filter((a) => a.status !== 'publicado');
  const assuntos = [...new Set(publicadas.map((a) => a.assuntoSlug))];
  const temAmostra = publicadas.some((a) => a.amostraGratuita);

  const numeros = [
    { icone: 'library_books', valor: assuntos.length, rotulo: assuntos.length === 1 ? 'assunto' : 'assuntos' },
    { icone: 'play_circle', valor: materia.aulasPublicadas, rotulo: materia.aulasPublicadas === 1 ? 'aula em vídeo' : 'aulas em vídeo' },
    { icone: 'edit_note', valor: materia.questoes, rotulo: materia.questoes === 1 ? 'questão comentada' : 'questões comentadas' },
    { icone: 'schedule', valor: formatarDuracao(materia.duracaoTotal), rotulo: 'de gravação' },
  ];

  return (
    <Pagina ativo="catalogo">
      <div className="container">
        <div className="trilha-topo trilha-curso">
          <Link href="/">Início</Link><Icone nome="chevron_right" tamanho={16} />
          <Link href="/catalogo">Catálogo</Link><Icone nome="chevron_right" tamanho={16} />
          {parceiro && <><span>Parceiros</span><Icone nome="chevron_right" tamanho={16} /></>}
          <span>{materia.areaNome}</span>
        </div>
      </div>

      <div className="container curso-grade">
        <div className="curso-principal">
          {/* ---- Abertura ---- */}
          <header className="curso-abertura">
            <div className="curso-etiquetas">
              {parceiro ? (
                <span className="chip chip-sm chip-terciaria">Professor parceiro · {parceiro.nome}</span>
              ) : (
                <span className={`chip chip-sm ${materia.onda === 1 ? 'chip-secundaria' : 'chip-terciaria'}`}>
                  {materia.onda}ª onda
                </span>
              )}
              <span className="caption suave">
                {materia.areaNome} · licença por curso
              </span>
            </div>
            <h1>{materia.nome}</h1>
            <p className="sub">{materia.ementa}</p>
            {materia.professor && (
              <div className="professor">
                <span className="avatar">{iniciais(materia.professor)}</span>
                <strong>{materia.professor}</strong>
              </div>
            )}
          </header>

          {/* ---- Sobre o curso ---- */}
          <section className="cartao curso-bloco">
            <h2 className="headline-md">Sobre o curso</h2>
            <div className="curso-numeros">
              {numeros.map((n) => (
                <div className="curso-numero" key={n.rotulo}>
                  <Icone nome={n.icone} tamanho={20} />
                  <strong>{n.valor}</strong>
                  <span>{n.rotulo}</span>
                </div>
              ))}
            </div>
            <p>
              O curso é dividido em assuntos, e cada assunto se abre nas aulas em vídeo que o
              compõem. Toda aula termina em exercício comentado — aula sem exercício não vai ao
              ar. Você estuda na ordem que quiser e retoma de onde parou.
              {temAmostra && ' A primeira aula de cada assunto com amostra é aberta, sem cadastro.'}
            </p>
            {parceiro && (
              <p className="caption suave" style={{ marginTop: 12 }}>
                Este curso é produzido e mantido por <strong>{parceiro.nome}</strong>, professor
                parceiro com portal próprio. Você compra aqui, com o nosso checkout e as nossas
                garantias; a responsabilidade pelo conteúdo é do autor.
              </p>
            )}
          </section>

          {/* ---- Ementa ---- */}
          <section className="curso-bloco-solto">
            <h2 className="headline-md">Ementa</h2>
            <div className="ementa-lista">
              {assuntos.map((assuntoSlug, i) => {
                const doAssunto = publicadas.filter((a) => a.assuntoSlug === assuntoSlug);
                const duracao = doAssunto.reduce((t, a) => t + a.duracaoSegundos, 0);
                return (
                  /* <details> nativo: o acordeão abre sem JavaScript e o
                     Ctrl+F do navegador continua achando o texto dentro. */
                  <details className="assunto" key={assuntoSlug} open={i === 0}>
                    <summary>
                      <span className="numero">{i + 1}</span>
                      <span className="assunto-titulo">
                        <strong>{doAssunto[0].assuntoNome}</strong>
                        <span className="caption suave">
                          {plural(doAssunto.length, 'aula', 'aulas')} · {formatarDuracao(duracao)}
                        </span>
                      </span>
                      {doAssunto.some((a) => a.amostraGratuita) && (
                        <span className="chip chip-sm chip-secundaria">1ª aula grátis</span>
                      )}
                      <Icone nome="expand_more" className="seta" />
                    </summary>

                    <div className="assunto-corpo">
                      {doAssunto.map((aula) => {
                        const d = podeAcessar(espectador, {
                          id: aula.id, materiaId: materia.id,
                          amostraGratuita: aula.amostraGratuita, noTrial: aula.noTrial,
                        });
                        /* O que ESTE aluno já fez nesta aula. A etiqueta
                           "concluída" vale mais que a de acesso: quem já
                           assistiu não precisa que a linha lhe diga que a
                           aula está liberada. */
                        const vista = progresso.porAula.get(Number(aula.id));
                        const etiqueta = vista?.concluida
                          ? { c: 'chip-secundaria', t: 'Concluída' }
                          : vista
                            ? { c: 'chip-terciaria', t: 'Continuar' }
                            : aula.amostraGratuita
                              ? { c: 'chip-secundaria', t: 'Grátis' }
                              : d.libera
                                ? { c: 'chip-terciaria', t: d.motivo === 'TRIAL' ? 'Teste' : 'Liberada' }
                                : { c: 'chip-neutra', t: 'Licença' };
                        return (
                          <Link
                            className={`linha-aula ${d.libera ? (vista?.concluida ? 'concluida' : '') : 'bloqueada'}`}
                            href={`${base}/aula/${aula.slug}`} key={aula.id}
                          >
                            <span className="estado">
                              <Icone nome={!d.libera ? 'lock' : vista?.concluida ? 'check' : 'play_arrow'} />
                            </span>
                            <span className="texto">
                              <strong>{aula.titulo}</strong>
                              <span>
                                {formatarDuracao(aula.duracaoSegundos)} · {plural(aula.questoes, 'questão', 'questões')}
                                {vista && !vista.concluida && aula.duracaoSegundos > 0 && (
                                  <> · assistido {percentual(vista.segundos, aula.duracaoSegundos)}%</>
                                )}
                              </span>
                            </span>
                            <span className={`chip chip-sm ${etiqueta.c}`}>{etiqueta.t}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>

            {emProducao.length > 0 && (
              <div className="aviso" style={{ marginTop: 20 }}>
                <strong>Mais {emProducao.length} {emProducao.length === 1 ? 'aula gravada aguarda' : 'aulas gravadas aguardam'} o exercício</strong>{' '}
                para ir ao ar. Aula sem exercício não é publicada — é regra, não exceção.
              </div>
            )}
          </section>

          {/* ---- Quem ensina ---- */}
          {materia.professor && (
            <section className="cartao curso-professor">
              <span className="avatar-grande">{iniciais(materia.professor)}</span>
              <div>
                <h2 className="headline-md">{materia.professor}</h2>
                <p className="suave">
                  Responsável {materia.aulasPublicadas === 1 ? 'pela' : 'pelas'}{' '}
                  {plural(materia.aulasPublicadas, 'aula publicada', 'aulas publicadas')} de{' '}
                  {materia.nome}, em {materia.areaNome}, e {materia.questoes === 1 ? 'pelo' : 'pelos'}{' '}
                  {plural(materia.questoes, 'exercício comentado', 'exercícios comentados')} que
                  {materia.aulasPublicadas === 1 ? ' a fecham.' : ' fecham cada uma delas.'}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* ---- Quem já tem o curso: progresso, não vitrine ---- */}
        {acesso.libera ? (
          <aside className="cartao caixa-compra caixa-progresso">
            <span className="label-md suave">SEU PROGRESSO NESTE CURSO</span>
            <div className="progresso-resumo">
              <Anel pct={pctCurso} cor="var(--primary)" />
              <div>
                <strong>
                  {progresso.aulasConcluidas} de {publicadas.length}{' '}
                  {publicadas.length === 1 ? 'aula concluída' : 'aulas concluídas'}
                </strong>
                <span className="caption suave">
                  {progresso.questoesTotal > 0
                    ? <>{progresso.questoesRespondidas} de {progresso.questoesTotal} questões respondidas · {progresso.acertos} {progresso.acertos === 1 ? 'acerto' : 'acertos'} ({percentual(progresso.acertos, progresso.questoesRespondidas)}%)</>
                    : 'Os exercícios deste curso ainda estão sendo escritos.'}
                </span>
              </div>
            </div>

            {retomar && (
              <div className="pilha-sm" style={{ marginTop: 20 }}>
                <Link className="btn btn-primario btn-bloco" href={`${base}/aula/${retomar.slug}`}>
                  {progresso.aulasConcluidas === 0 ? 'Começar a primeira aula'
                    : progresso.aulasConcluidas === publicadas.length ? 'Rever o curso'
                      : 'Continuar de onde parei'}
                </Link>
                <span className="caption suave" style={{ textAlign: 'center' }}>{retomar.titulo}</span>
              </div>
            )}

            {/* Até quando ele tem acesso, e por qual licença: a resposta
                da pergunta que chega ao suporte como "eu ainda tenho o
                curso?". */}
            <div className="inclui-titulo">Seu acesso</div>
            <ul className="lista-inclui">
              <li>
                <Icone nome="check_circle" />
                {acesso.motivo === 'LICENCA_CATALOGO' ? 'Pelo passe completo'
                  : acesso.motivo === 'TRIAL' ? 'Pelo teste gratuito de 7 dias'
                    : 'Licença deste curso'}
                {' '}· até {new Date(acesso.licenca.fimEm).toLocaleDateString('pt-BR')}
              </li>
              <li><Icone nome="check_circle" /> Material de apoio e biblioteca de fontes nas aulas</li>
              <li><Icone nome="check_circle" /> Questões erradas vão para o seu caderno de erros</li>
            </ul>
            {acesso.motivo === 'TRIAL' && (
              <p className="caption suave">
                O teste abre cerca de 20% das aulas. <Link href="/planos">Assine o curso</Link> para
                abrir todas — seu progresso continua de onde parou.
              </p>
            )}
            <p className="caption suave" style={{ borderTop: '1px dashed var(--surface-variant)', paddingTop: 14 }}>
              <Link href="/painel">Meu painel</Link> reúne o progresso de todos os seus cursos e o
              caderno de erros.
            </p>
          </aside>
        ) : (

        /* ---- Compra ---- */
        <aside className="cartao caixa-compra">
          <span className="label-md suave">LICENÇA DESTE CURSO</span>
          <div className="preco" style={{ marginTop: 8 }}>
            {brl(tabela.MATERIA.mensal)}<small>/mês</small>
          </div>
          <p className="caption suave">
            ou {brl(tabela.MATERIA.anual)} no plano anual ({brl(porMes(tabela.MATERIA.anual, 'anual'))}/mês)
            · cancele em 2 cliques
          </p>
          {parceiro ? (
            <ComprarParceiro acao={acaoComprar} materiaId={materia.id} tabela={tabela}
                             logado={Boolean(aluno)} vende={parceiro.vende}
                             precisaCpf={aluno ? !(await temCpf(aluno.id)) : false} />
          ) : (
            <div className="pilha-sm" style={{ marginTop: 20 }}>
              <Link className="btn btn-primario btn-bloco" href="/planos">Assinar este curso</Link>
              {/* Quem já está logado não "cria conta para testar": o teste
                  se ativa em /planos, e mandá-lo para /cadastrar era
                  oferecer a ele uma segunda conta. */}
              <Link className="btn btn-contorno btn-bloco" href={aluno ? '/planos' : '/cadastrar'}>
                {aluno ? 'Ver planos e teste gratuito' : 'Testar 7 dias grátis'}
              </Link>
            </div>
          )}
          <div className="inclui-titulo">O que está incluso</div>
          <ul className="lista-inclui">
            {[
              `${plural(materia.aulasPublicadas, 'aula em vídeo', 'aulas em vídeo')} com legendas`,
              plural(materia.questoes, 'questão comentada', 'questões comentadas'),
              'Biblioteca de fontes dentro da aula',
              'Material de apoio em PDF',
              'Anotações e caderno de erros',
            ].map((t) => (
              <li key={t}><Icone nome="check_circle" /> {t}</li>
            ))}
          </ul>
          {parceiro && (
            <p className="caption suave">
              O passe completo da plataforma não inclui cursos de parceiros — este curso é
              licenciado à parte.
            </p>
          )}
          <p className="caption suave" style={{ borderTop: '1px dashed var(--surface-variant)', paddingTop: 14 }}>
            Arrependeu? Devolvemos 100% em até 7 dias, sem justificativa (CDC, art. 49).
          </p>
        </aside>
        )}
      </div>
    </Pagina>
  );
}
