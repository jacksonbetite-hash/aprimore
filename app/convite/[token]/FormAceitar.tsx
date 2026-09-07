'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoConvite } from './acoes.ts';

/** Nome e senha, só. O e-mail vem do convite e não é editável — é ele que prova o vínculo. */
export default function FormAceitar({ acao, token, nome }: {
  acao: (e: EstadoConvite, d: FormData) => Promise<EstadoConvite>;
  token: string;
  nome: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const submeter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  return (
    <form onSubmit={submeter} className="formulario">
      <input type="hidden" name="token" value={token} />
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert">
          <Icone nome="error" tamanho={20} /> {estado.erro}
        </p>
      )}
      <label>
        Seu nome
        <input name="nome" type="text" required maxLength={120} defaultValue={nome} autoComplete="name" />
      </label>
      <label>
        Crie uma senha
        <input name="senha" type="password" required minLength={8} autoComplete="new-password" />
        <span className="dica">Ao menos 8 caracteres.</span>
      </label>
      <button className="btn btn-primario btn-bloco btn-lg" type="submit" disabled={pendente}>
        {pendente ? 'Criando…' : 'Criar conta e começar'}
      </button>
    </form>
  );
}
