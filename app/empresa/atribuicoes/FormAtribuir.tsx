'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';
import type { Setor, Colaborador } from '../../../lib/empresa-equipe.ts';
import type { MateriaAdmin } from '../../../lib/admin-cursos.ts';

/**
 * Um alvo por atribuição — pessoa OU setor —, e por isso um `<select>`
 * só, com dois grupos. Dois campos separados convidariam a preencher os
 * dois, e o banco (CHECK `atribuicao_um_alvo`) recusaria com uma
 * mensagem que ninguém entende.
 */
export default function FormAtribuir({ acao, trilhas, setores, pessoas }: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  trilhas: MateriaAdmin[];
  setores: Setor[];
  pessoas: Colaborador[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const submeter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  return (
    <form onSubmit={submeter} className="form-editor">
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status"><Icone nome="check_circle" tamanho={20} /> {estado.ok}</p>}

      <div className="linha">
        <label>
          Trilha
          <select name="materiaId" required defaultValue="">
            <option value="" disabled>escolha…</option>
            {trilhas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}{t.status !== 'publicado' ? ' (rascunho)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Para quem
          <select name="alvo" required defaultValue="">
            <option value="" disabled>escolha…</option>
            {setores.length > 0 && (
              <optgroup label="Setores — alcança quem entrar depois">
                {setores.map((s) => (
                  <option key={`s${s.id}`} value={`s:${s.id}`}>
                    {s.nome} ({s.pessoas} pessoa{s.pessoas === 1 ? '' : 's'})
                  </option>
                ))}
              </optgroup>
            )}
            {pessoas.length > 0 && (
              <optgroup label="Pessoas">
                {pessoas.map((p) => (
                  <option key={`u${p.id}`} value={`u:${p.id}`}>{p.nome} · {p.email}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>

      <div className="linha estreita">
        <label>
          Prazo para concluir
          <input name="prazoEm" type="date" />
          <span className="dica">Passado o prazo sem conclusão, a pessoa aparece como atrasada no acompanhamento.</span>
        </label>
        <label className="marcador">
          <input type="checkbox" name="obrigatoria" defaultChecked />
          Treinamento obrigatório
          <span className="dica">Aparece primeiro, e em destaque, na tela do colaborador.</span>
        </label>
      </div>

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Liberando…' : 'Liberar trilha'}
        </button>
      </div>
    </form>
  );
}
