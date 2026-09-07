'use client';

import { useActionState } from 'react';
import type { EstadoAdmin } from '../acoes.ts';

export default function FormAssunto({
  acao, portalId, materiaId, empresa = false,
}: {
  acao: (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;
  portalId: number;
  materiaId: number;
  /** §5.11: na empresa o assunto se chama módulo. */
  empresa?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="form-linha">
      <input type="hidden" name="portalId" value={portalId} />
      <input type="hidden" name="materiaId" value={materiaId} />
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}
      <div className="campos">
        <label>
          {empresa ? 'Novo módulo' : 'Novo assunto'}
          <input name="nome" required maxLength={140}
            placeholder={empresa ? 'Comunicação no trabalho' : 'Direitos fundamentais'} />
        </label>
        <label>
          Ordem
          <input name="ordem" type="number" defaultValue={10} />
        </label>
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Criando…' : empresa ? 'Criar módulo' : 'Criar assunto'}
        </button>
      </div>
      <p className="dica">
        {empresa
          ? 'O módulo organiza as aulas dentro da trilha. A liberação de acesso é da trilha inteira.'
          : 'O assunto organiza as aulas dentro do curso. Não é unidade de venda — a licença é do curso inteiro (§6).'}
      </p>
    </form>
  );
}
