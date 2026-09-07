'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

/**
 * Dar acesso de administração a mais alguém do RH.
 *
 * A senha é definida aqui, e não enviada por e-mail, porque o sistema
 * ainda não envia e-mail (§5.11, transversal T). É a solução honesta
 * enquanto isso: quem convida vê a senha, passa por um canal seguro e a
 * tela diz para trocar no primeiro acesso. Quando o envio existir, este
 * campo dá lugar a um convite por link, como o do colaborador.
 */
export default function FormGestor({ acao }: { acao: Acao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});

  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  return (
    <form onSubmit={aoEnviar} className="formulario">
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p className="alerta alerta-ok" role="status">
          <Icone nome="check_circle" tamanho={20} /> {estado.ok}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          Nome
          <input name="nome" type="text" required maxLength={120} autoComplete="off" />
        </label>
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="off" />
        </label>
      </div>
      <label>
        Senha provisória
        <input name="senha" type="text" required minLength={8} autoComplete="off" />
        <span className="dica">
          Ao menos 8 caracteres. A pessoa troca em <strong>Minha conta</strong> depois de entrar.
        </span>
      </label>

      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Criando…' : 'Dar acesso'}
        </button>
      </div>
    </form>
  );
}
