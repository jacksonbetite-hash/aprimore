'use client';

import { startTransition, useActionState } from 'react';
import type { EstadoAdmin } from '../acoes.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

/** A resposta do comercial a um orçamento: valor total e um texto. */
export default function FormOrcamento({ responder, recusar, id, valorAtual }: {
  responder: Acao; recusar: Acao; id: number; valorAtual: number | null;
}) {
  const [er, enviarResponder, pr] = useActionState(responder, {});
  const [ec, enviarRecusar, pc] = useActionState(recusar, {});
  const estado = er.erro || er.ok ? er : ec;
  const reais = (c: number | null) => (c === null ? '' : (c / 100).toFixed(2).replace('.', ','));
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {estado.erro && <p className="alerta alerta-erro" role="alert">{estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status">{estado.ok}</p>}
      <form className="form-linha" onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => enviarResponder(dados));
      }}>
        <input type="hidden" name="id" value={id} />
        <div className="campos">
          <label>
            Valor total (R$)
            <input name="valor" inputMode="decimal" required defaultValue={reais(valorAtual)} placeholder="1.990,00"
                   style={{ width: 130 }} />
          </label>
          <label style={{ flex: '1 1 200px' }}>
            Resposta
            <input name="resposta" maxLength={500} placeholder="condições, prazo…" />
          </label>
          <button className="btn btn-primario btn-sm" type="submit" disabled={pr}>{pr ? 'Enviando…' : 'Propor'}</button>
        </div>
      </form>
      <form className="form-linha" onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => enviarRecusar(dados));
      }}>
        <input type="hidden" name="id" value={id} />
        <div className="campos">
          <input name="resposta" maxLength={500} placeholder="motivo (opcional)" />
          <button className="btn btn-contorno btn-sm" type="submit" disabled={pc}>{pc ? '…' : 'Recusar'}</button>
        </div>
      </form>
    </div>
  );
}
