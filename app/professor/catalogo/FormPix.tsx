'use client';

import { startTransition, useActionState } from 'react';
import type { EstadoAdmin } from '../../admin/acoes.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

export default function FormPix({ acao, atual }: { acao: Acao; atual: string }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form className="form-linha" onSubmit={(e) => {
      e.preventDefault();
      const dados = new FormData(e.currentTarget);
      startTransition(() => enviar(dados));
    }}>
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}
      <div className="campos">
        <label>
          Chave Pix
          <input name="chave" defaultValue={atual} required maxLength={120} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" />
        </label>
        <button className="btn btn-primario" type="submit" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  );
}
