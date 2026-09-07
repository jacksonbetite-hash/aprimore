'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';
import type { Setor, Colaborador } from '../../../lib/empresa-equipe.ts';

/**
 * Editar a pessoa na própria linha. Não dá para usar o `EdicaoNaLinha`
 * genérico (nome + ordem): aqui os campos são nome, setor e matrícula —
 * e o setor é o que mais muda, porque é ele que carrega as trilhas.
 */
export default function EdicaoColaborador({ acao, pessoa, setores }: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  pessoa: Colaborador;
  setores: Setor[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const submeter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  return (
    <details className="edicao-linha">
      <summary className="btn-icone" aria-label={`Editar ${pessoa.nome}`}>
        <Icone nome="edit" tamanho={20} />
        <span className="dica-icone" aria-hidden="true">Editar</span>
      </summary>
      <form onSubmit={submeter} className="edicao-campos">
        <input type="hidden" name="id" value={pessoa.id} />
        {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
        {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}
        <label>
          Nome
          <input name="nome" defaultValue={pessoa.nome} required maxLength={120} />
        </label>
        <label>
          Setor
          <select name="setorId" defaultValue={pessoa.setorId ?? ''}>
            <option value="">sem setor</option>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <label>
          Matrícula
          <input name="matricula" defaultValue={pessoa.matricula ?? ''} maxLength={40} />
        </label>
        <button className="btn-icone btn-icone-primario" type="submit" disabled={pendente}
                aria-label="Salvar">
          <Icone nome="check" tamanho={20} />
          <span className="dica-icone" aria-hidden="true">Salvar</span>
        </button>
      </form>
    </details>
  );
}
