'use client';

import { startTransition, useActionState } from 'react';
import type { EstadoAdmin } from '../../../admin/acoes.ts';
import type { AvaliacaoAdmin } from '../../../../lib/avaliacao.ts';

/**
 * A avaliação final da trilha (§5.11): título, nota mínima, tentativas e
 * embaralhamento. onSubmit + startTransition, para que um erro de
 * validação não limpe o que foi digitado.
 */
export default function FormAvaliacao({ acao, materiaId, avaliacao }: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  materiaId: number;
  avaliacao: AvaliacaoAdmin | null;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  return (
    <form onSubmit={aoEnviar} className="form-editor">
      <input type="hidden" name="materiaId" value={materiaId} />
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}

      <div className="linha">
        <label>
          Título
          <input name="titulo" required maxLength={140} defaultValue={avaliacao?.titulo ?? ''}
            placeholder="Avaliação final — Integração" />
        </label>
        <label>
          Situação
          <select name="status" defaultValue={avaliacao?.status ?? 'rascunho'}>
            <option value="rascunho">Rascunho — o colaborador não vê</option>
            <option value="publicado">Publicada — disponível ao fim da trilha</option>
          </select>
        </label>
      </div>
      <label>
        Instruções (opcional)
        <textarea name="descricao" rows={2} maxLength={600} defaultValue={avaliacao?.descricao ?? ''}
          placeholder="O que a pessoa precisa saber antes de começar: tempo, quando refazer, o que conta." />
      </label>
      <div className="linha estreita">
        <label>
          Nota mínima (%)
          <input name="notaMinima" type="number" min={0} max={100} defaultValue={avaliacao?.notaMinima ?? 70} required />
        </label>
        <label>
          Tentativas
          <input name="maxTentativas" type="number" min={1} defaultValue={avaliacao?.maxTentativas ?? ''}
            placeholder="ilimitadas" />
          <span className="dica">Em branco = a pessoa refaz quantas vezes quiser.</span>
        </label>
        <label className="marcador">
          <input type="checkbox" name="embaralhar" defaultChecked={avaliacao?.embaralhar ?? true} />
          Embaralhar questões e alternativas
        </label>
      </div>
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : avaliacao ? 'Salvar avaliação' : 'Criar avaliação'}
        </button>
        {!avaliacao && <span className="dica">Depois de criar, as questões aparecem logo abaixo.</span>}
      </div>
    </form>
  );
}
