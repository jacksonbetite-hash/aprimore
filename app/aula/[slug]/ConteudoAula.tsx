import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pagina, Icone, portalSuspenso, PortalSuspenso } from '../../componentes.tsx';
import Exercicio from '../../Exercicio.tsx';
import AbasAula from '../../AbasAula.tsx';
import {
  buscarAula, materiaisDaAula, listarAulasDaMateria, formatarDuracao,
} from '../../../lib/catalogo.ts';
import { dispositivosDaAula } from '../../../lib/vademecum.ts';
import { partirDispositivo } from '../../../lib/vademecum-texto.ts';
import { exercicioDaAula, respostasDaAula } from '../../../lib/exercicio.ts';
import { progressoDoCurso, percentual } from '../../../lib/progresso-curso.ts';
import { espectadorAtual, alunoAtual, progressoDaAula } from '../../../lib/sessao.ts';
import { podeAcessar, ofertaPara, espectadorParaCurso } from '../../../lib/licenca.ts';
import { urlDeReproducao, marcaDoAluno } from '../../../lib/video.ts';
import PlayerAula from '../../PlayerAula.tsx';
import { portalIdAtual } from '../../../lib/portal-consultas.ts';

/**
 * A página da aula, parametrizada por DE QUEM É O CURSO (§5.10.2, etapa 5)
 * — ver ConteudoMateria. `base` prefixa os links internos ('' no próprio
 * portal, `/parceiros/<mascara>` na vitrine compartilhada) e `oferta` é
 * para onde mandar quem esbarra no cadeado.
 */
export default async function ConteudoAula(
  { slug, portalDoCurso, base, oferta }:
  { slug: string; portalDoCurso: number; base: string; oferta: string | null },
) {
  const portalDoAluno = await portalIdAtual();
  const aula = await buscarAula(portalDoCurso, slug);
  if (!aula || aula.status !== 'publicado') notFound();

  const [espectadorBruto, aluno, leis, materiais, doAssunto] = await Promise.all([
    espectadorAtual(), alunoAtual(), dispositivosDaAula(aula.id),
    materiaisDaAula(aula.id), listarAulasDaMateria(portalDoCurso, aula.materiaId),
  ]);
  const espectador = espectadorParaCurso(espectadorBruto, portalDoCurso === portalDoAluno);
  const linkOferta = oferta ?? `${base}/materia/${aula.materiaSlug}`;

  // §6.3 — toda decisão de acesso passa por aqui
  const decisao = podeAcessar(espectador, {
    id: aula.id, materiaId: aula.materiaId,
    amostraGratuita: aula.amostraGratuita, noTrial: aula.noTrial,
  });
  // §5.10 — no portal suspenso, a aula liberada por licença continua; a
  // bloqueada não oferece compra (o portal não vende), mostra o aviso.
  if (!decisao.libera && await portalSuspenso()) return <PortalSuspenso />;

  const questoes = decisao.libera ? await exercicioDaAula(aula.id) : [];
  /* O que ele já respondeu nesta aula e o que já assistiu neste curso: é
     o que faz a página voltar no estado em que ele a deixou, em vez de
     começar do zero a cada visita. */
  const [respondidas, progressoCurso] = await Promise.all([
    decisao.libera && aluno ? respostasDaAula(aluno.id, aula.id) : Promise.resolve([]),
    progressoDoCurso(aluno?.id, aula.materiaId),
  ]);

  /* O endereço do vídeo só é calculado depois que §6.3 liberou, e vive um
     carregamento de página: é assinado, tem prazo e leva o aluno dentro
     (lib/video.ts). Aula sem gravação ainda cai no `null` — a página
     continua servindo resumo, materiais e exercício. */
  const progresso = decisao.libera && aluno ? await progressoDaAula(aluno.id, aula.id) : null;
  let videoSrc: string | null = null;
  if (decisao.libera && aula.videoProvedor && aula.videoId) {
    try {
      videoSrc = urlDeReproducao(
        { provedor: aula.videoProvedor, id: aula.videoId },
        aluno?.id ?? 0,
      );
    } catch (err) {
      // Provedor ainda não ligado ou id malformado no banco: melhor a aula
      // aparecer sem o vídeo do que a página inteira cair em 500.
      console.error(`aula ${aula.slug}: vídeo indisponível —`, err);
    }
  }

  /* O rótulo da aba diz de longe como está o exercício — é a mesma
     informação que antes só aparecia depois de rolar a pilha inteira. */
  const acertosDados = respondidas.filter((r) => r.acertou).length;
  const contadorExercicio = !decisao.libera || questoes.length === 0 ? undefined
    : respondidas.length === 0 ? `${questoes.length}`
      : respondidas.length < questoes.length ? `${respondidas.length}/${questoes.length}`
        : `✓ ${acertosDados}/${questoes.length}`;

  const doModulo = doAssunto.filter((a) => a.assuntoSlug === aula.assuntoSlug && a.status === 'publicado');
  const publicadas = doAssunto.filter((a) => a.status === 'publicado');
  const i = publicadas.findIndex((a) => a.id === aula.id);
  const proxima = publicadas[i + 1] ?? null;
  const anterior = publicadas[i - 1] ?? null;

  return (
    <Pagina ativo="catalogo">
      <div className="container aula-grade">
        <div>
          <div className="trilha-topo" style={{ marginBottom: 16 }}>
            <Link href="/catalogo">Catálogo</Link>
            <Icone nome="chevron_right" tamanho={16} />
            <Link href={`${base}/materia/${aula.materiaSlug}`}>{aula.materiaNome}</Link>
            <Icone nome="chevron_right" tamanho={16} />
            <span className="suave">{aula.assuntoNome}</span>
          </div>

          {!decisao.libera ? (
            <div className="player bloqueado">
              <div className="cadeado">
                <Icone nome="lock" />
                <p>{ofertaPara(decisao.motivo)}</p>
              </div>
            </div>
          ) : videoSrc ? (
            <PlayerAula
              aulaId={aula.id}
              src={videoSrc}
              titulo={aula.titulo}
              duracaoSegundos={aula.duracaoSegundos}
              /* §10: a marca d'água identifica quem vazou, sem entregar o
                 e-mail inteiro a quem recebeu a cópia. */
              marca={aluno ? marcaDoAluno(aluno.nome, aluno.email) : null}
              iniciarEm={progresso?.segundosAssistidos ?? 0}
              gravarProgresso={Boolean(aluno)}
            />
          ) : (
            <div className="player bloqueado">
              <div className="cadeado">
                <Icone nome="schedule" />
                <p>
                  A gravação desta aula ainda está em produção. O resumo, os
                  materiais e o exercício abaixo já estão liberados para você.
                </p>
              </div>
            </div>
          )}

          <h1 className="aula-titulo">{aula.titulo}</h1>
          <p className="aula-meta">
            {aula.professor} • Atualizado em{' '}
            {new Date(aula.atualizadaEm).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            {decisao.libera && decisao.motivo === 'TRIAL' && (
              <span className="chip chip-terciaria" style={{ marginLeft: 10 }}>Liberada pelo seu teste</span>
            )}
            {decisao.libera && decisao.motivo === 'AMOSTRA_GRATUITA' && (
              <span className="chip chip-secundaria" style={{ marginLeft: 10 }}>Aula aberta</span>
            )}
          </p>

          {!decisao.libera && (
            <p className="aviso" style={{ marginTop: 20 }}>
              {ofertaPara(decisao.motivo)}{' '}
              <Link href={linkOferta} style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {oferta ? 'Ver o curso' : 'Ver planos'}
              </Link>
            </p>
          )}

          <AbasAula
            abas={[
              {
                id: 'resumo', rotulo: 'Resumo',
                conteudo: (
                  <>
                    {aula.resumo.split('\n\n').map((paragrafo, k) => (
                      <p key={k}>{paragrafo}</p>
                    ))}
                    {leis[0] && (
                      <div className="sabia" style={{ marginTop: 24 }}>
                        <div className="titulo"><Icone nome="lightbulb" tamanho={20} /> Você sabia?</div>
                        Esta aula está ancorada em <strong>{leis[0].rotulo} da {leis[0].normaSigla}</strong>.
                        A fonte original fica ao lado, no painel — você não precisa sair daqui para conferir.
                      </div>
                    )}
                    {/* O fim do resumo é o lugar natural do convite: quem
                        leu até aqui é quem vai responder. A âncora abre a
                        aba (AbasAula ouve o hash). */}
                    <div className="convite-exercicio">
                      <div>
                        {!decisao.libera ? (
                          <>
                            <h3>Exercício com {aula.questoes} questões comentadas</h3>
                            <p>Abre junto com a aula, e toda alternativa vem explicada.</p>
                          </>
                        ) : respondidas.length > 0 ? (
                          <>
                            <h3>Você já fez este exercício</h3>
                            <p>
                              {respondidas.length} de {questoes.length}{' '}
                              {questoes.length === 1 ? 'questão respondida' : 'questões respondidas'},{' '}
                              {acertosDados} com acerto. Dá para reler os comentários e refazer questão por questão.
                            </p>
                          </>
                        ) : (
                          <>
                            <h3>Terminou o resumo? Hora do exercício</h3>
                            <p>Fixe o conteúdo desta aula com {questoes.length} questões, uma de cada vez.</p>
                          </>
                        )}
                      </div>
                      {decisao.libera
                        ? <a className="btn btn-primario" href="#exercicio"><Icone nome="edit_note" tamanho={20} /> {respondidas.length > 0 ? 'Ver o exercício' : 'Fazer o exercício'}</a>
                        : <Link className="btn btn-primario" href={linkOferta}>{oferta ? 'Ver o curso' : 'Ver planos'}</Link>}
                    </div>
                  </>
                ),
              },
              {
                /* Entre Resumo e Materiais, e não depois: a ordem das abas é
                   a ordem de estudo, e "toda aula termina em exercício"
                   (§5.3) fica visível no próprio menu. */
                id: 'exercicio', rotulo: 'Exercício', contador: contadorExercicio,
                conteudo: decisao.libera ? (
                  <Exercicio questoes={questoes} professor={aula.professor} respondidas={respondidas}
                             proxima={proxima ? { href: `${base}/aula/${proxima.slug}`, titulo: proxima.titulo } : null} />
                ) : (
                  <div className="convite-exercicio" style={{ marginTop: 0 }}>
                    <div>
                      <h3>Exercício com {aula.questoes} questões comentadas</h3>
                      <p>Abre junto com a aula, e toda alternativa vem explicada.</p>
                    </div>
                    <Link className="btn btn-primario" href={linkOferta}>{oferta ? 'Ver o curso' : 'Ver planos'}</Link>
                  </div>
                ),
              },
              {
                id: 'materiais', rotulo: 'Materiais', contador: String(materiais.length),
                conteudo: decisao.libera ? (
                  <>
                    {materiais.length === 0 && <p className="vazio">Esta aula ainda não tem material de apoio.</p>}
                    {materiais.map((m) => (
                      <div className="linha-aula" key={m.id}>
                        <span className="estado"><Icone nome="picture_as_pdf" /></span>
                        <span className="texto">
                          <strong>{m.titulo}</strong>
                          <span>PDF · {Math.round(m.bytes / 1024)} KB</span>
                        </span>
                        <span className="btn btn-contorno btn-sm">Baixar</span>
                      </div>
                    ))}
                    <p className="caption suave" style={{ marginTop: 12 }}>
                      Os PDFs saem carimbados com seu nome e e-mail.
                    </p>
                  </>
                ) : (
                  <p className="vazio">O material de apoio abre com a licença do curso.</p>
                ),
              },
              {
                id: 'artigos', rotulo: 'Artigos citados', contador: String(leis.length),
                conteudo: (
                  <>
                    <p>Dispositivos vinculados a esta aula:</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0 16px' }}>
                      {leis.map((d) => (
                        <Link className="chip chip-terciaria" href={`/vademecum?q=${encodeURIComponent(d.rotulo)}`} key={d.id}>
                          <Icone nome="menu_book" tamanho={16} /> {d.rotulo}, {d.normaSigla}
                        </Link>
                      ))}
                    </div>
                    <p className="caption suave">
                      O caminho vale nos dois sentidos: na biblioteca, cada trecho lista as aulas que o explicam.
                    </p>
                  </>
                ),
              },
            ]}
          />

          <div className="nav-aula" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 32, flexWrap: 'wrap' }}>
            {anterior
              ? <Link className="btn btn-contorno btn-sm" href={`${base}/aula/${anterior.slug}`}><Icone nome="arrow_back" tamanho={18} /> {anterior.titulo}</Link>
              : <span />}
            {proxima && (
              <Link className="btn btn-primario btn-sm" href={`${base}/aula/${proxima.slug}`}>{proxima.titulo} <Icone nome="arrow_forward" tamanho={18} /></Link>
            )}
          </div>
        </div>

        {/* ---------- Lateral: módulo + biblioteca ---------- */}
        <aside className="modulo-lateral pilha-lg">
          <div>
            <h2>{aula.assuntoNome}</h2>
            <p className="suave">{aula.materiaNome}</p>
            {/* O andamento do curso inteiro, e não só do módulo: é a
                pergunta que o aluno faz ao voltar ("quanto falta?"). */}
            {aluno && decisao.libera && publicadas.length > 0 && (
              <div className="barra-exercicio" style={{ marginTop: 12 }}>
                <span className="rotulo">Curso</span>
                <div className="progresso">
                  <i style={{ width: `${percentual(progressoCurso.aulasConcluidas, publicadas.length)}%` }} />
                </div>
                <span className="contador">{progressoCurso.aulasConcluidas} / {publicadas.length}</span>
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              {doModulo.map((a) => {
                const dela = podeAcessar(espectador, {
                  id: a.id, materiaId: aula.materiaId,
                  amostraGratuita: a.amostraGratuita, noTrial: a.noTrial,
                });
                const atual = a.id === aula.id;
                /* O ícone de "concluída" agora depende de o aluno ter
                   ASSISTIDO, e não de a aula estar destrancada: antes o
                   módulo inteiro aparecia com o visto verde desde a
                   primeira visita, e o aluno não tinha como saber por
                   onde tinha passado. */
                const vista = progressoCurso.porAula.get(Number(a.id));
                const icone = atual ? 'play_circle'
                  : !dela.libera ? 'lock'
                    : vista?.concluida ? 'check_circle'
                      : vista ? 'pause_circle' : 'radio_button_unchecked';
                const classe = atual ? 'atual' : dela.libera ? '' : 'trancada';
                return (
                  <Link className={`item-modulo ${classe}`} href={`${base}/aula/${a.slug}`} key={a.id}>
                    <Icone nome={icone} />
                    <span>
                      <span className="titulo">{a.titulo}</span>
                      <span className="duracao">
                        {formatarDuracao(a.duracaoSegundos)}
                        {atual ? ' • Assistindo'
                          : vista?.concluida ? ' • Concluída'
                            : vista ? ' • Começada' : ''}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="painel-lei">
            <header>
              <strong><Icone nome="menu_book" tamanho={18} /> Biblioteca</strong>
              <span className="caption">nesta aula</span>
            </header>
            <div className="corpo">
              {leis.length === 0 && <p className="caption suave">Esta aula não cita dispositivos.</p>}
              {leis.map((d) => (
                <div className="artigo" key={d.id}>
                  <div className="ref">
                    <span>{d.normaSigla} · {d.rotulo}</span>
                    <Link href={`/vademecum?norma=${d.normaSlug}&artigo=${d.id}`}>abrir ↗</Link>
                  </div>
                  {/* O artigo vem do acervo com um bloco por linha — caput,
                      inciso, parágrafo. Jogado num div só, o navegador
                      juntaria tudo num parágrafo corrido e o inciso colaria
                      no caput. */}
                  {partirDispositivo(d.texto).map((bloco, i) => (
                    <p className="texto-lei" key={i}>
                      {bloco.rotulo && <strong>{bloco.rotulo} </strong>}
                      {bloco.texto}
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <div className="carimbo">✔ Texto conferido em 28/08/2026 · fonte: LexML / Planalto</div>
          </div>
        </aside>
      </div>
    </Pagina>
  );
}
