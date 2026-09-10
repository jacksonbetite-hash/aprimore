'use client';

import { startTransition, useActionState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';
import type { Colaborador } from '../../../lib/empresa-equipe.ts';
import type { Lote } from '../../../lib/empresa-catalogo.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

/** Uma vaga de um lote para uma pessoa — a licença B2B do curso da plataforma (db/047). */
export default function FormVaga({ acao, lotes, pessoas }: { acao: Acao; lotes: Lote[]; pessoas: Colaborador[] }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form className="form-linha" onSubmit={(e) => {
      e.preventDefault();
      const dados = new FormData(e.currentTarget);
      startTransition(() => enviar(dados));
    }}>
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status"><Icone nome="check_circle" tamanho={20} /> {estado.ok}</p>}
      <div className="campos">
        <label>
          Lote
          <select name="loteId" required defaultValue="">
            <option value="" disabled>escolha…</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id} disabled={l.usadas >= l.quantidade}>
                {l.materiaNome} — {l.quantidade - l.usadas} de {l.quantidade} livre(s)
              </option>
            ))}
          </select>
        </label>
        <label>
          Para quem
          <select name="usuarioId" required defaultValue="">
            <option value="" disabled>escolha…</option>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.email}</option>)}
          </select>
        </label>
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Liberando…' : 'Dar a vaga'}
        </button>
      </div>
    </form>
  );
}
