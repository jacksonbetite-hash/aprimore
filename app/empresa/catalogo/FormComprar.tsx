'use client';

import { startTransition, useActionState, useState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoAdmin } from '../../admin/acoes.ts';

type Acao = (e: EstadoAdmin, d: FormData) => Promise<EstadoAdmin>;

/**
 * A compra de vagas de UM curso. A mesma caixa serve aos dois caminhos:
 * até o limite do curso, "Comprar" leva ao checkout; acima, o botão vira
 * "Pedir orçamento" e o campo de mensagem aparece — a pessoa não precisa
 * saber a regra de cor, a tela muda na frente dela.
 */
export default function FormComprar({ comprar, orcar, materiaId, limite, precoAnual }: {
  comprar: Acao; orcar: Acao; materiaId: number; limite: number; precoAnual: string;
}) {
  const [quantidade, setQuantidade] = useState(1);
  const porOrcamento = quantidade > limite;
  const [estadoComprar, enviarComprar, pendenteComprar] = useActionState(comprar, {});
  const [estadoOrcar, enviarOrcar, pendenteOrcar] = useActionState(orcar, {});
  const estado = porOrcamento ? estadoOrcar : estadoComprar;
  const pendente = pendenteComprar || pendenteOrcar;

  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => (porOrcamento ? enviarOrcar(dados) : enviarComprar(dados)));
  }

  return (
    <form onSubmit={aoEnviar} className="form-linha">
      <input type="hidden" name="materiaId" value={materiaId} />
      {estado.erro && <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>}
      {estado.ok && <p className="alerta alerta-ok" role="status"><Icone nome="check_circle" tamanho={20} /> {estado.ok}</p>}
      <div className="campos">
        <label>
          Vagas
          <input name="quantidade" type="number" min={1} max={100000} value={quantidade}
                 onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))} required />
        </label>
        {!porOrcamento && (
          <label>
            Pagar com
            <select name="meio" defaultValue="PIX">
              <option value="PIX">Pix</option>
              <option value="CARTAO">Cartão</option>
            </select>
          </label>
        )}
        {porOrcamento && (
          <label style={{ flex: '1 1 260px' }}>
            Mensagem ao comercial (opcional)
            <input name="mensagem" maxLength={500} placeholder="prazo, setores, condições…" />
          </label>
        )}
        <button className="btn btn-primario" type="submit" disabled={pendente}>
          {pendente ? 'Enviando…' : porOrcamento ? 'Pedir orçamento' : 'Comprar'}
        </button>
      </div>
      <p className="dica">
        {porOrcamento
          ? `Acima de ${limite} vaga(s) deste curso a compra é por orçamento: o comercial responde com o valor e você paga pelo mesmo checkout.`
          : `${quantidade} vaga(s) × ${precoAnual} ao ano. Até ${limite} vaga(s), paga na hora; acima, orçamento.`}
      </p>
    </form>
  );
}
