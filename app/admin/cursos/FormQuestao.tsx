'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { EstadoAdmin } from '../acoes.ts';
import type { QuestaoAdmin } from '../../../lib/admin-cursos.ts';

const VAZIA = { texto: '', correta: false, comentario: '' };

/**
 * Uma questão inteira num formulário só — enunciado e alternativas.
 *
 * Alternativa não tem vida própria: "exatamente uma correta" é invariante
 * do conjunto, e salvar em partes deixaria a questão passar por estados
 * inválidos que o aluno poderia ver.
 *
 * O comentário é obrigatório em TODA alternativa, e não só na certa. É o
 * §5.3, e é o que separa exercício de gabarito: quem errou precisa saber
 * por que aquela alternativa parecia certa.
 */
export default function FormQuestao({
  acao, portalId, aulaId, avaliacaoId, questao, aoFechar,
}: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  portalId: number;
  aulaId: number;
  /** §5.11: a mesma questão, quando pertence à avaliação final de uma trilha. */
  avaliacaoId?: number;
  questao?: QuestaoAdmin;
  aoFechar?: () => void;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});

  /**
   * Questão NOVA salva com sucesso fecha o formulário.
   *
   * Sem isso ele continuava aberto com o texto da questão que acabou de
   * ser gravada, e o botão "Criar questão" ali, convidando a salvar a
   * mesma coisa de novo — foi o que aconteceu ao cadastrar um exercício
   * inteiro de uma sentada. Na EDIÇÃO o formulário fica aberto de
   * propósito: quem está corrigindo um comentário quer ver o resultado
   * sem reabrir a questão.
   */
  const jaFechou = useRef(false);
  useEffect(() => {
    if (!questao && estado.ok && aoFechar && !jaFechou.current) {
      jaFechou.current = true;
      aoFechar();
    }
  }, [estado.ok, questao, aoFechar]);

  const iniciais = questao?.alternativas.length
    ? questao.alternativas.map((a) => ({ texto: a.texto, correta: a.correta, comentario: a.comentario }))
    : [ { ...VAZIA }, { ...VAZIA }, { ...VAZIA }, { ...VAZIA } ];
  const [alternativas, setAlternativas] = useState(iniciais);
  const [correta, setCorreta] = useState(
    String(Math.max(0, iniciais.findIndex((a) => a.correta))),
  );

  return (
    <form action={enviar} className="form-editor">
      <input type="hidden" name="portalId" value={portalId} />
      <input type="hidden" name="aulaId" value={aulaId} />
      {avaliacaoId && <input type="hidden" name="avaliacaoId" value={avaliacaoId} />}
      {questao && <input type="hidden" name="id" value={questao.id} />}
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}

      <label>
        Enunciado
        <textarea name="enunciado" defaultValue={questao?.enunciado} required rows={3} />
      </label>

      <div className="linha estreita">
        <label>
          Tipo
          <select name="tipo" defaultValue={questao?.tipo ?? 'multipla_escolha'}>
            <option value="multipla_escolha">Múltipla escolha</option>
            <option value="certo_errado">Certo ou errado</option>
          </select>
        </label>
        <label>
          Origem
          <input name="origem" defaultValue={questao?.origem ?? 'autoral'}
            placeholder="autoral, CESPE 2023…" />
        </label>
        <label>
          Dificuldade
          <select name="dificuldade" defaultValue={questao?.dificuldade ?? 'introdutorio'}>
            <option value="introdutorio">Introdutório</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </label>
        <label>
          Ordem
          <input name="ordem" type="number" defaultValue={questao?.ordem ?? 10} />
        </label>
      </div>

      {alternativas.map((alt, i) => (
        <div key={i} className="cartao" style={{ padding: 16, marginBottom: 0 }}>
          <div className="linha">
            <label>
              Alternativa {String.fromCharCode(65 + i)}
              <input name={`texto${i}`} defaultValue={alt.texto}
                placeholder={i < 2 ? 'obrigatória' : 'deixe em branco para não usar'} />
            </label>
            <label className="marcador">
              <input type="radio" name="correta" value={i} checked={correta === String(i)}
                onChange={() => setCorreta(String(i))} />
              É a correta
            </label>
          </div>
          <label>
            Comentário
            <textarea name={`comentario${i}`} defaultValue={alt.comentario} rows={2}
              placeholder="Por que esta alternativa está certa — ou por que parecia certa e não está." />
          </label>
        </div>
      ))}

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : questao ? 'Salvar questão' : 'Criar questão'}
        </button>
        {alternativas.length < 8 && (
          <button className="btn btn-contorno" type="button"
            onClick={() => setAlternativas([...alternativas, { ...VAZIA }])}>
            Mais uma alternativa
          </button>
        )}
        {aoFechar && (
          <button className="btn btn-contorno" type="button" onClick={aoFechar}>Cancelar</button>
        )}
        <span className="dica">
          Comentário obrigatório em todas (§5.3) — inclusive nas erradas.
        </span>
      </div>
    </form>
  );
}
