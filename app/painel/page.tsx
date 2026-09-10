import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Icone } from '../componentes.tsx';
import { Anel } from '../AnelProgresso.tsx';
import LateralAluno from '../LateralAluno.tsx';
import BotaoSair from '../BotaoSair.tsx';
import PainelEmpresa from './PainelEmpresa.tsx';
import { portalAtual } from '../../lib/portal-consultas.ts';
import {
  alunoAtual, licencasDo, progressoPorMateria, continuarDeOndeParou,
  estatisticas, cadernoDeErros,
} from '../../lib/sessao.ts';
import { licencaVigente } from '../../lib/licenca.ts';
import { corSegura } from '../../lib/portal.ts';
import { formatarDuracao } from '../../lib/catalogo.ts';

export const metadata: Metadata = { title: 'Minha jornada' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date) => new Date(d).toLocaleDateString('pt-BR');
// Três tons do mesmo roxo: os anéis distinguem cursos sem trazer uma
// segunda cor de marca para o painel. O verde e o âmbar ficam reservados
// para o que significa "certo" e "em curso".
const CORES = ['var(--primary)', 'var(--primary-container)', '#a974ff'];

export default async function Painel(
  { searchParams }: { searchParams: Promise<{ 'sem-acesso'?: string; bemvindo?: string; trial?: string }> },
) {
  const busca = await searchParams;
  const aluno = await alunoAtual();
  if (!aluno) redirect('/entrar?destino=/painel');

  // §5.11 — no portal de uma empresa, quem entra é colaborador: o painel
  // é o das trilhas atribuídas, não a jornada de quem compra curso.
  const portal = await portalAtual();
  if (portal.tipo === 'EMPRESA') return <PainelEmpresa aluno={aluno} portal={portal} />;

  const [licencas, progresso, continuar, stats, erros] = await Promise.all([
    licencasDo(aluno.id), progressoPorMateria(aluno.id), continuarDeOndeParou(aluno.id),
    estatisticas(aluno.id), cadernoDeErros(aluno.id),
  ]);

  const agora = new Date();
  const comDatas = licencas.map((l) => ({ ...l, inicioEm: new Date(l.inicioEm), fimEm: new Date(l.fimEm) }));
  const ativas = comDatas.filter((l) => licencaVigente(l, agora));
  const trial = ativas.find((l) => l.origem === 'TRIAL');
  const diasTrial = trial
    ? Math.max(0, Math.ceil((trial.fimEm.getTime() - agora.getTime()) / 86_400_000))
    : null;
  const pctRetomar = continuar
    ? Math.round((continuar.segundosAssistidos / continuar.duracaoSegundos) * 100)
    : 0;
  /* Sem aula pendente E com curso liberado: não é aluno novo, é aluno em
     dia. `continuarDeOndeParou` só devolve aula NÃO concluída, então a
     ausência dela, para quem tem curso, significa "assistiu tudo". */
  const concluiuTudo = !continuar && progresso.length > 0
    && progresso.every((m) => m.aulasConcluidas === m.aulasTotal);

  // §5.10 — a cor do portal também vale na área do aluno: fora daqui o
  // aluno via a página do professor no tema dele e o painel no nosso.
  // Só uma cor validada (#rgb/#rrggbb) chega ao CSS: cor é dado, não código.
  const cor = corSegura(portal.personalizacao.corPrimaria);

  return (
    <div className="app">
      {cor && (
        <style>{`:root{--primary:${cor};--primary-texto:${cor};--primary-container:${cor};--on-primary-fixed-variant:${cor}}`}</style>
      )}
      <LateralAluno papel={aluno.papel} />

      <div className="conteudo">
        <div className="barra-superior">
          {/* §5.10 — dentro do portal de um professor a marca é a DELE.
              O nome da casa estava fixo aqui, e o aluno do portal via a
              nossa marca no topo da própria área de estudo. */}
          <Link className="marca" href="/">{portal.nomeExibicao}</Link>
          <div className="usuario">
            <span className="sino"><Icone nome="notifications" tamanho={24} /></span>
            <span className="avatar">{aluno.nome.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
            <strong className="label-md">{aluno.nome.split(' ')[0]}</strong>
            <BotaoSair />
          </div>
        </div>

        <div className="miolo">
          {busca['sem-acesso'] && (
            <p className="alerta alerta-erro" role="alert">
              <Icone nome="lock" tamanho={20} /> Sua conta não tem acesso à administração.
            </p>
          )}
          {busca.trial && (
            <p className="alerta alerta-ok" role="status">
              <Icone nome="celebration" tamanho={20} />
              Teste de 7 dias ativado! Você já pode estudar — o progresso e as anotações
              ficam guardados mesmo depois que ele terminar.
            </p>
          )}
          {busca.bemvindo && (
            <p className="alerta alerta-ok" role="status">
              <Icone nome="celebration" tamanho={20} />
              Conta criada! Comece pela 1ª aula de cada assunto — ela é aberta — ou ative seu teste de 7 dias.
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="saudacao">
              <h2>Olá, <em>{aluno.nome.split(' ')[0]}!</em> 👋</h2>
              <p>Pronto para avançar mais um pouco hoje?</p>
            </div>
            {diasTrial !== null && (
              <span className="aviso" style={{ borderRadius: 'var(--r-md)', borderLeftWidth: 4, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <Icone nome="timer" tamanho={20} />
                Teste Grátis: <strong>{diasTrial === 1 ? 'Falta 1 dia' : `Faltam ${diasTrial} dias`}</strong>
              </span>
            )}
          </div>

          <div className="grade-2" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
            {continuar ? (
              <div className="retomar">
                <span className="play"><Icone nome="play_arrow" tamanho={28} /></span>
                <span className="chip chip-primaria" style={{ justifySelf: 'start' }}>CONTINUE DE ONDE PAROU</span>
                <div>
                  <h3>{continuar.titulo}</h3>
                  <p className="trilha">{continuar.materiaNome}</p>
                </div>
                <div>
                  <div className="rotulo-progresso">
                    <span>Progresso da Aula</span><b>{pctRetomar}%</b>
                  </div>
                  <div className="progresso"><i style={{ width: `${pctRetomar}%` }} /></div>
                </div>
                <Link className="btn btn-primario" style={{ justifySelf: 'start' }} href={`${continuar.base}/aula/${continuar.slug}`}>
                  Retomar Aula <Icone nome="arrow_forward" tamanho={20} />
                </Link>
              </div>
            ) : concluiuTudo ? (
              /* Quem já assistiu tudo o que tem liberado não está
                 "começando a jornada": o convite de vitrine no lugar do
                 retomar era o painel tratando aluno antigo como visitante. */
              <div className="retomar">
                <span className="chip chip-secundaria" style={{ justifySelf: 'start' }}>EM DIA</span>
                <h3>Você concluiu todas as aulas liberadas</h3>
                <p className="trilha">
                  {erros.length > 0
                    ? `Boa hora para revisar: ${erros.length} ${erros.length === 1 ? 'questão espera' : 'questões esperam'} no seu caderno de erros.`
                    : 'Reveja uma aula quando quiser — seu progresso fica guardado — ou abra um curso novo.'}
                </p>
                <Link className="btn btn-primario" style={{ justifySelf: 'start' }}
                      href={erros.length > 0 ? `${erros[0].base}/aula/${erros[0].aulaSlug}` : '/catalogo'}>
                  {erros.length > 0 ? 'Revisar o caderno de erros' : 'Ver o catálogo'}
                  <Icone nome="arrow_forward" tamanho={20} />
                </Link>
              </div>
            ) : (
              <div className="retomar">
                <span className="chip chip-secundaria" style={{ justifySelf: 'start' }}>COMECE POR AQUI</span>
                <h3>Sua jornada começa agora</h3>
                <p className="trilha">
                  A 1ª aula de cada assunto é aberta. Escolha um curso e comece sem pagar nada.
                </p>
                <Link className="btn btn-primario" style={{ justifySelf: 'start' }} href="/catalogo">
                  Ver o catálogo <Icone nome="arrow_forward" tamanho={20} />
                </Link>
              </div>
            )}

            <div className="pilha-md">
              <Link className="cartao-vade" href="/vademecum">
                <Icone nome="menu_book" className="balanca" />
                <span className="lupa"><Icone nome="search" tamanho={22} /></span>
                <h3>Biblioteca</h3>
                <p>Busca direta nas fontes originais</p>
              </Link>
              {/* Âncora do item "Caderno de erros" do menu Ferramentas. */}
              <Link id="caderno" className="atalho" href={erros.length ? `${erros[0].base}/aula/${erros[0].aulaSlug}` : '/catalogo'}>
                <span className="texto">
                  <strong>Caderno de Erros</strong>
                  <span>{erros.length ? `${erros.length} para revisar` : 'Revise suas dificuldades'}</span>
                </span>
                <Icone nome="chevron_right" tamanho={22} />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="label-md suave" style={{ marginBottom: 16 }}>SEU DESEMPENHO</h3>
            {progresso.length === 0 ? (
              <p className="vazio">
                Você ainda não tem curso liberado. Comece pelo teste gratuito de 7 dias —
                seu progresso aparece aqui.
              </p>
            ) : (
              <div className="grade-2">
                {progresso.map((p, i) => {
                  const cor = CORES[i % CORES.length];
                  return (
                    <Link className="cartao desempenho" href={`${p.base}/materia/${p.materiaSlug}`} key={p.materiaSlug}>
                      <Anel pct={p.percentual} cor={cor} />
                      <div>
                        <div className="nome">{p.materiaNome}</div>
                        <div className="detalhe">{p.aulasConcluidas} de {p.aulasTotal} aulas</div>
                        <div className="pontos" style={{ ['--cor-anel' as string]: cor }}>
                          {Array.from({ length: Math.max(3, p.aulasTotal) }).slice(0, 4).map((_, k) => (
                            <i className={k < Math.round((p.percentual / 100) * 4) ? 'cheio' : ''} key={k} />
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="sabia">
            <div className="titulo"><Icone nome="lightbulb" tamanho={20} /> Você sabia?</div>
            {stats.respondidas > 0 ? (
              <>
                Você já respondeu <strong>{stats.respondidas} questões</strong> com{' '}
                <strong>{stats.percentual}% de acerto</strong>. Revisar o Caderno de Erros 24 horas
                após errar aumenta a retenção do conteúdo em até 60%.
              </>
            ) : (
              <>
                Toda aula daqui termina em exercício, e <strong>toda alternativa tem comentário</strong> —
                inclusive as que você não marcou. É assim que o erro vira aprendizado.
              </>
            )}
          </div>

          <div className="cartao">
            <h2 className="headline-md" style={{ marginBottom: 16 }}>Suas licenças</h2>
            {comDatas.length === 0 && <p className="vazio">Nenhuma licença ainda.</p>}
            {comDatas.map((l) => {
              const vigente = licencaVigente(l, agora);
              return (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--surface-container)', flexWrap: 'wrap' }}>
                  <div>
                    <strong className="label-md">
                      {l.escopo === 'CATALOGO' ? 'Passe completo' : l.materiaNome}
                    </strong>
                    <div className="caption suave">
                      Origem: {l.origem.toLowerCase()}{l.campanhaNome && ` (${l.campanhaNome})`} · Vence em {DATA(l.fimEm)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`chip ${vigente ? 'chip-secundaria' : 'chip-neutra'}`}>
                      {vigente ? 'Ativa' : l.status.toLowerCase()}
                    </span>
                    {l.origem === 'TRIAL' && vigente && (
                      <Link className="btn btn-primario btn-sm" href="/planos">Assinar curso</Link>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="caption suave" style={{ marginTop: 14 }}>
              Licenças somam, nunca se anulam. Ao assinar o passe completo, as suas licenças de
              curso continuam valendo até expirar.
            </p>
          </div>

          <Link className="atalho" href="/conta">
            <span className="texto">
              <strong>Minha conta</strong>
              <span>Assinaturas, pedidos, reembolso e seus dados</span>
            </span>
            <Icone nome="chevron_right" tamanho={22} />
          </Link>
        </div>
      </div>
    </div>
  );
}
