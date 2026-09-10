import Link from 'next/link';
import { Icone } from '../componentes.tsx';
import { Anel } from '../AnelProgresso.tsx';
import { trilhasDoColaborador, proximaAula } from '../../lib/empresa-relatorio.ts';
import type { Aluno } from '../../lib/sessao.ts';
import type { Portal } from '../../lib/portal.ts';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : null);
const CORES = ['var(--primary)', 'var(--primary-container)', '#a974ff'];

/**
 * "Minhas trilhas" — a tela inicial do colaborador (§5.11, etapa 5).
 *
 * Não é a "Minha jornada" do aluno com outro título: o colaborador não
 * compra, não tem caderno de erros da plataforma e não escolhe o que
 * estudar. O que ele precisa saber é outra coisa — o que a empresa
 * mandou fazer, até quando, e o que falta. Por isso a ordem da tela é a
 * do prazo: obrigatórias primeiro, atrasadas em vermelho, e o botão que
 * leva à próxima aula, não ao catálogo.
 *
 * Daqui saíram a barra lateral, a barra superior e a cor do portal:
 * agora são de `app/painel/layout.tsx`, compartilhadas com as outras
 * telas do painel. Enquanto moravam aqui, o menu era redesenhado a cada
 * navegação — e em `/conta` quem aparecia era o menu da plataforma,
 * outro completamente.
 */
export default async function PainelEmpresa({ aluno, portal }: { aluno: Aluno; portal: Portal }) {
  const trilhas = await trilhasDoColaborador(portal.id, aluno.id);
  const proximas = new Map(
    await Promise.all(trilhas.map(async (t) =>
      [t.materiaId, await proximaAula(aluno.id, t.materiaId)] as const)),
  );

  const atrasadas = trilhas.filter((t) => t.situacao === 'atrasada');
  const concluidas = trilhas.filter((t) => t.situacao === 'concluida');
  const pendentes = trilhas.filter((t) => t.situacao !== 'concluida');
  const cargaTotal = trilhas.reduce((t, x) => t + x.aulasTotal, 0);

  return (
    <>
    <div className="saudacao">
      <h2>Olá, <em>{aluno.nome.split(' ')[0]}!</em></h2>
      <p>
        {trilhas.length === 0
          ? 'Ainda não há treinamento liberado para você.'
          : pendentes.length === 0
            ? 'Você concluiu tudo o que foi liberado. Bom trabalho.'
            : `Você tem ${pendentes.length === 1 ? '1 trilha' : `${pendentes.length} trilhas`} para concluir.`}
      </p>
    </div>

    {atrasadas.length > 0 && (
      <p className="alerta alerta-erro" role="alert">
        <Icone nome="schedule" tamanho={20} />{' '}
        <strong>
          {atrasadas.length === 1
            ? 'Uma trilha está com o prazo vencido'
            : `${atrasadas.length} trilhas estão com o prazo vencido`}:
        </strong>{' '}
        {atrasadas.map((t) => t.trilha).join(', ')}.
      </p>
    )}

    {trilhas.length === 0 ? (
      <div className="cartao">
        <h3 className="headline-md">Nada liberado ainda</h3>
        <p className="suave" style={{ marginTop: 8 }}>
          Quem libera as trilhas é o setor responsável pelo treinamento na sua empresa.
          {portal.personalizacao.contato && <> Fale com {portal.personalizacao.contato}.</>}
        </p>
      </div>
    ) : (
      <>
        <div className="grade-4" style={{ marginBottom: 24 }}>
          <div className="cartao">
            <span className="label-md suave">TRILHAS</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{trilhas.length}</div>
            <p className="caption suave">liberadas para você</p>
          </div>
          <div className="cartao">
            <span className="label-md suave">CONCLUÍDAS</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{concluidas.length}</div>
            <p className="caption suave">com certificado emitido</p>
          </div>
          <div className="cartao">
            <span className="label-md suave">AULAS</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
              {trilhas.reduce((t, x) => t + x.aulasConcluidas, 0)}
              <span className="suave" style={{ fontSize: 16, fontWeight: 600 }}> / {cargaTotal}</span>
            </div>
            <p className="caption suave">assistidas no total</p>
          </div>
          <div className="cartao">
            <span className="label-md suave">NO PRAZO</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
              {trilhas.length - atrasadas.length}
            </div>
            <p className="caption suave">
              {atrasadas.length ? `${atrasadas.length} atrasada(s)` : 'nenhuma atrasada'}
            </p>
          </div>
        </div>

        <h3 className="label-md suave" style={{ marginBottom: 16 }}>SUAS TRILHAS</h3>
        <div className="pilha-md">
          {trilhas.map((t, i) => {
            const prox = proximas.get(t.materiaId);
            const prazo = DATA(t.prazoEm);
            // Curso da plataforma comprado como vaga (db/047): mora no
            // portal 0 e é servido aqui dentro pela rota de curso parceiro,
            // que exige a licença. Não tem avaliação final nem certificado.
            const daPlataforma = t.materiaPortalId === 0;
            const base = daPlataforma ? '/parceiros/plataforma' : '';
            const podeProva = !daPlataforma && t.aulasTotal > 0 && t.aulasConcluidas >= t.aulasTotal;
            return (
              <div className="cartao" key={`${t.materiaId}`}
                   style={t.situacao === 'atrasada' ? { borderLeft: '4px solid var(--error)' } : undefined}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Anel pct={t.percentual} cor={CORES[i % CORES.length]} />
                  <div style={{ flex: '1 1 260px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0 }}>
                        <Link href={`${base}/materia/${t.trilhaSlug}`}>{t.trilha}</Link>
                      </h3>
                      {daPlataforma && <span className="chip chip-sm chip-terciaria">curso da plataforma</span>}
                      {t.obrigatoria && <span className="chip chip-sm chip-primaria">obrigatória</span>}
                      {t.situacao === 'concluida' && <span className="chip chip-sm chip-secundaria">concluída</span>}
                      {t.situacao === 'atrasada' && <span className="chip chip-sm chip-erro">prazo vencido</span>}
                    </div>
                    <p className="caption suave" style={{ marginTop: 6 }}>
                      {t.aulasConcluidas} de {t.aulasTotal} aula(s)
                      {prazo && ` · prazo ${prazo}`}
                      {t.nota !== null && ` · nota ${t.nota}%`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {t.situacao === 'concluida' && t.codigoCertificado ? (
                      <Link className="btn btn-contorno" href={`/certificado/${t.codigoCertificado}`}>
                        <Icone nome="workspace_premium" tamanho={20} /> Certificado
                      </Link>
                    ) : podeProva ? (
                      <Link className="btn btn-primario" href={`/prova/${t.trilhaSlug}`}>
                        <Icone nome="fact_check" tamanho={20} /> Fazer a avaliação
                      </Link>
                    ) : null}
                    {prox && t.situacao !== 'concluida' && !podeProva && (
                      <Link className={`btn ${podeProva ? 'btn-contorno' : 'btn-primario'}`} href={`${base}/aula/${prox.slug}`}>
                        <Icone nome="play_arrow" tamanho={20} />
                        {t.aulasConcluidas === 0 ? 'Começar' : 'Continuar'}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}

    {portal.personalizacao.sobre && (
      <div className="cartao" style={{ marginTop: 24 }}>
        <h3 className="headline-md">Sobre o programa</h3>
        {portal.personalizacao.sobre.split('\n\n').map((p, i) => (
          <p key={i} style={{ marginTop: 10 }}>{p}</p>
        ))}
      </div>
    )}

    <p className="caption suave" style={{ marginTop: 24 }}>
      Quem libera trilhas é o setor responsável pelo treinamento na sua empresa
      {portal.personalizacao.contato && <> — {portal.personalizacao.contato}</>}. O seu
      progresso fica registrado e é visível para quem administra o portal.
    </p>
    </>
  );
}
