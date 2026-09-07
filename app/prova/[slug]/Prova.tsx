'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoProva } from './acoes.ts';
import type { QuestaoDaProva } from '../../../lib/avaliacao.ts';

/**
 * A prova. Diferente do exercício da aula em dois pontos que importam:
 * aqui não há correção imediata — a pessoa responde tudo e entrega —, e
 * o gabarito não está no navegador. O que chega da ação, depois da
 * entrega, é a correção já feita no servidor.
 */
export default function Prova({
  questoes, avaliacaoId, tentativaId, notaMinima, acao, concluida, trilha,
}: {
  questoes: QuestaoDaProva[];
  avaliacaoId: number;
  tentativaId: number;
  notaMinima: number;
  acao: (e: EstadoProva, d: FormData) => Promise<EstadoProva>;
  /** Já aprovado antes desta visita: nota e código do certificado. */
  concluida: { nota: number | null; codigo: string } | null;
  trilha: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {} as EstadoProva);
  const [marcadas, setMarcadas] = useState<Record<number, number>>({});
  const respondidas = Object.keys(marcadas).length;
  const faltam = questoes.length - respondidas;

  const submeter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  /**
   * A ordem aqui não é detalhe.
   *
   * Terminada a ação de servidor, o Next re-renderiza a rota atual — e a
   * página, agora vendo a trilha como concluída, trocaria a correção
   * recém-calculada por um resumo de "trilha concluída". Quem acabou de
   * fazer a prova perderia de vista exatamente o que veio buscar: quanto
   * tirou e onde errou. Por isso a decisão entre "resultado desta
   * tentativa" e "resumo de quem já passou" mora aqui, no cliente, que é
   * quem sabe se houve uma entrega agora.
   */
  const r = estado.resultado;
  if (!r && concluida) {
    return (
      <section style={{ marginTop: 24 }}>
        <div className="cartao">
          <span className="chip chip-secundaria">Trilha concluída</span>
          <h2 className="headline-lg" style={{ marginTop: 12 }}>{trilha}</h2>
          <p className="suave">
            Você foi aprovado{concluida.nota !== null && ` com ${concluida.nota}%`} (mínimo de{' '}
            {notaMinima}%). O certificado já está emitido.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <Link className="btn btn-primario" href={`/certificado/${concluida.codigo}`}>
              <Icone nome="workspace_premium" tamanho={20} /> Ver o certificado
            </Link>
            <Link className="btn btn-contorno" href="/painel">Voltar às minhas trilhas</Link>
          </div>
          <p className="caption suave" style={{ marginTop: 16 }}>
            Código de verificação: <strong>{concluida.codigo}</strong>
          </p>
        </div>
      </section>
    );
  }
  if (r) {
    const porQuestao = new Map(r.correcao.map((c) => [c.questaoId, c]));
    return (
      <section style={{ marginTop: 24 }}>
        <div className="cartao" style={{ borderLeft: `6px solid var(--${r.aprovada ? 'primary' : 'error'})` }}>
          <span className={`chip ${r.aprovada ? 'chip-secundaria' : 'chip-erro'}`}>
            {r.aprovada ? 'Aprovado' : 'Não atingiu a nota mínima'}
          </span>
          <h2 className="headline-lg" style={{ marginTop: 12 }}>
            {r.nota}% · {r.acertos} de {r.total}
          </h2>
          <p className="suave">
            A nota mínima desta avaliação é {r.notaMinima}%.{' '}
            {r.aprovada
              ? 'A trilha está concluída e o certificado foi emitido.'
              : 'Reveja as aulas e tente de novo — o comentário de cada questão está abaixo.'}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            {r.aprovada && r.codigoCertificado && (
              <Link className="btn btn-primario" href={`/certificado/${r.codigoCertificado}`}>
                <Icone nome="workspace_premium" tamanho={20} /> Ver o certificado
              </Link>
            )}
            <Link className="btn btn-contorno" href="/painel">Voltar às minhas trilhas</Link>
          </div>
        </div>

        <h3 className="headline-md" style={{ margin: '28px 0 12px' }}>Correção</h3>
        {questoes.map((q, i) => {
          const c = porQuestao.get(q.id);
          if (!c) return null;
          return (
            <div className="cartao" key={q.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="chip chip-sm chip-neutra">Questão {i + 1}</span>
                <span className={`chip chip-sm ${c.acertou ? 'chip-secundaria' : 'chip-erro'}`}>
                  {c.acertou ? 'acertou' : 'errou'}
                </span>
              </div>
              <p className="enunciado" style={{ marginTop: 10 }}>{q.enunciado}</p>
              <ul style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {q.alternativas.map((a) => {
                  const suaMarca = c.marcada === a.id;
                  const certa = c.correta === a.id;
                  return (
                    <li key={a.id} className="caption" style={{
                      fontWeight: certa ? 700 : 400,
                      color: certa ? 'var(--on-secondary-fixed-variant)'
                        : suaMarca ? 'var(--on-error-container)' : undefined,
                    }}>
                      {certa ? '✔ ' : suaMarca ? '✘ ' : '· '}{a.texto}
                      {suaMarca && !certa && <span className="suave"> (sua resposta)</span>}
                    </li>
                  );
                })}
              </ul>
              <div className="caixa" style={{ marginTop: 10 }}>{c.comentario}</div>
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <form onSubmit={submeter} style={{ marginTop: 24 }}>
      <input type="hidden" name="avaliacaoId" value={avaliacaoId} />
      <input type="hidden" name="tentativaId" value={tentativaId} />
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}

      {/* top 68px, não 0: o cabeçalho do site também é sticky em top 0
          (`.topo`), e as duas barras disputariam o mesmo lugar. */}
      <div className="barra-exercicio" style={{ position: 'sticky', top: 68, zIndex: 2 }}>
        <span className="rotulo">Respondidas</span>
        <div className="progresso terciaria">
          <i style={{ width: `${questoes.length ? (respondidas / questoes.length) * 100 : 0}%` }} />
        </div>
        <span className="contador">{respondidas} / {questoes.length}</span>
      </div>

      {questoes.map((q, i) => (
        <div key={q.id} style={{ marginBottom: 32 }}>
          <span className="chip chip-primaria chip-sm">Questão {i + 1} de {questoes.length}</span>
          <p className="enunciado">{q.enunciado}</p>
          {q.alternativas.map((a, j) => {
            const marcada = marcadas[q.id] === a.id;
            return (
              <label className={`alternativa${marcada ? ' certa' : ''}`} key={a.id}
                     style={{ cursor: 'pointer' }}>
                {/* O rádio fica invisível — quem responde clica na
                    alternativa inteira —, mas NÃO pode levar
                    `pointer-events: none`: com isso o clique no rótulo
                    deixa de ser encaminhado ao controle no Chrome, e a
                    alternativa simplesmente não marca. A prova ficava
                    impossível de entregar, com o botão eternamente
                    desabilitado esperando as respostas. */}
                <input type="radio" name={`q${q.id}`} value={a.id} required
                       style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                       checked={marcada}
                       onChange={() => setMarcadas((m) => ({ ...m, [q.id]: a.id }))} />
                <span className="letra">{String.fromCharCode(65 + j)}</span>
                <span>{a.texto}</span>
              </label>
            );
          })}
        </div>
      ))}

      <div className="cartao" style={{ position: 'sticky', bottom: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primario btn-lg" type="submit" disabled={pendente || faltam > 0}>
            {pendente ? 'Corrigindo…' : 'Entregar a avaliação'}
          </button>
          <span className="caption suave">
            {faltam > 0
              ? `Faltam ${faltam} questão(ões) — responda todas para entregar.`
              : `Tudo respondido. A nota mínima é ${notaMinima}%.`}
          </span>
        </div>
      </div>
    </form>
  );
}
