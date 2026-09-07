'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';
import type { Setor } from '../../../lib/empresa-equipe.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

const aoEnviar = (enviar: (d: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  // §5.11 e a lição do FormEmpresa: com `<form action>`, o React limpa os
  // campos ao fim de toda ação — inclusive no erro de validação.
  e.preventDefault();
  const dados = new FormData(e.currentTarget);
  startTransition(() => enviar(dados));
};

/** Cadastro individual do colaborador, com senha provisória. */
export default function FormColaborador({ acao, setores }: { acao: Acao; setores: Setor[] }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form onSubmit={aoEnviar(enviar)} className="form-editor">
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status"><Icone nome="check_circle" tamanho={20} /> {estado.ok}</p>}
      <div className="linha">
        <label>
          Nome
          <input name="nome" required maxLength={120} autoComplete="off" />
        </label>
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="off" />
        </label>
      </div>
      <div className="linha estreita">
        <label>
          Setor
          <select name="setorId" defaultValue="">
            <option value="">sem setor</option>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <span className="dica">Entrando num setor com trilha atribuída, a pessoa já recebe.</span>
        </label>
        <label>
          Matrícula (opcional)
          <input name="matricula" maxLength={40} autoComplete="off" placeholder="identificador interno" />
        </label>
        <label>
          Senha provisória
          <input name="senha" type="text" required minLength={8} autoComplete="off" />
          <span className="dica">Ao menos 8 caracteres.</span>
        </label>
      </div>
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Cadastrando…' : 'Cadastrar pessoa'}
        </button>
      </div>
    </form>
  );
}

/**
 * O formulário curto de setor, na mesma família visual das áreas.
 *
 * Export nomeado, e não `FormColaborador.Setor`: propriedade pendurada
 * num componente de cliente não atravessa a fronteira do servidor — a
 * referência chega indefinida e a página inteira quebra na renderização.
 */
export function FormSetor({ acao }: { acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form onSubmit={aoEnviar(enviar)} className="form-linha">
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}
      <div className="campos">
        <label>
          Novo setor
          <input name="nome" required maxLength={80} placeholder="Vendas" />
        </label>
        <label>
          Ordem
          <input name="ordem" type="number" defaultValue={10} />
        </label>
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Criando…' : 'Criar setor'}
        </button>
      </div>
    </form>
  );
}
