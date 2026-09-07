'use client';

import { useState } from 'react';
import FormQuestao from './FormQuestao.tsx';
import type { EstadoAdmin } from '../acoes.ts';
import type { QuestaoAdmin } from '../../../lib/admin-cursos.ts';

/**
 * O exercício da aula: a lista de questões, cada uma abrindo o próprio
 * formulário. Uma de cada vez — abrir todas transformaria a tela num
 * paredão de textarea e faria o navegador engasgar em aula com dez
 * questões.
 */
export default function Exercicio({
  questoes, portalId, aulaId, avaliacaoId, salvar, excluir,
}: {
  questoes: QuestaoAdmin[];
  portalId: number;
  aulaId: number;
  /** §5.11: as questões de uma avaliação final, em vez das de uma aula. */
  avaliacaoId?: number;
  salvar: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  excluir: (d: FormData) => Promise<void>;
}) {
  const [aberta, setAberta] = useState<number | 'nova' | null>(null);

  return (
    <>
      {questoes.length === 0 && aberta !== 'nova' && (
        <div className="vazio">
          {avaliacaoId
            ? 'Esta avaliação ainda não tem questão. Sem questão ela não pode ser publicada.'
            : 'Esta aula ainda não tem exercício. O §5.3 pede pelo menos uma questão comentada.'}
        </div>
      )}

      {questoes.map((q, i) => (
        <div className="cartao" key={q.id} style={{ padding: 20 }}>
          <div className="cabecalho-tela">
            <div>
              <strong>Questão {i + 1}</strong>
              <p className="suave" style={{ marginTop: 4 }}>{q.enunciado}</p>
              <p className="caption suave">
                {q.alternativas.length} alternativa(s) ·{' '}
                {q.origem} · {q.dificuldade}
              </p>
            </div>
            <div className="acoes">
              <button className="btn btn-contorno btn-sm" type="button"
                onClick={() => setAberta(aberta === q.id ? null : q.id)}>
                {aberta === q.id ? 'Fechar' : 'Editar'}
              </button>
              <form action={excluir}>
                <input type="hidden" name="portalId" value={portalId} />
                <input type="hidden" name="aulaId" value={aulaId} />
                {avaliacaoId && <input type="hidden" name="avaliacaoId" value={avaliacaoId} />}
                <input type="hidden" name="id" value={q.id} />
                <button className="btn btn-contorno btn-sm" type="submit">Excluir</button>
              </form>
            </div>
          </div>

          {aberta === q.id ? (
            <div style={{ marginTop: 16 }}>
              <FormQuestao acao={salvar} portalId={portalId} aulaId={aulaId} avaliacaoId={avaliacaoId}
                questao={q} aoFechar={() => setAberta(null)} />
            </div>
          ) : (
            <ul style={{ marginTop: 12, display: 'grid', gap: 6 }}>
              {q.alternativas.map((a) => (
                <li key={a.id} className="caption">
                  <span className={`chip chip-sm ${a.correta ? 'chip-secundaria' : 'chip-neutra'}`}>
                    {a.correta ? 'correta' : 'errada'}
                  </span>{' '}
                  {a.texto}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {aberta === 'nova' ? (
        <div className="cartao" style={{ padding: 20 }}>
          <h3 className="headline-md" style={{ marginBottom: 16 }}>Nova questão</h3>
          <FormQuestao acao={salvar} portalId={portalId} aulaId={aulaId} avaliacaoId={avaliacaoId}
            aoFechar={() => setAberta(null)} />
        </div>
      ) : (
        <button className="btn btn-primario" type="button" onClick={() => setAberta('nova')}>
          Adicionar questão
        </button>
      )}
    </>
  );
}
