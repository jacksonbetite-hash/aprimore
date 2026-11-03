'use client';

import { startTransition, useActionState, useState } from 'react';
import { Icone } from '../../ui.tsx';
import type { EstadoEquipe } from '../acoes.ts';
import type { Setor, PedidoAcesso } from '../../../lib/empresa-equipe.ts';
import type { MateriaAdmin } from '../../../lib/admin-cursos.ts';

type Acao = (e: EstadoEquipe, d: FormData) => Promise<EstadoEquipe>;

const DATA = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR');

/**
 * A fila de "Fale com o RH" da página pública (db/048). Cada pedido
 * aberto vira, num clique, um convite por link — com setor, trilhas e
 * prazo escolhidos aqui, porque quem pediu não conhece os setores
 * cadastrados (o que ela escreveu vai em texto, ao lado). O link volta
 * uma vez só, como no convite comum.
 *
 * O estado da ação vive NESTE componente, e não na linha do pedido, por
 * um motivo que custou uma rodada de e2e: a ação revalida a página, o
 * pedido atendido sai da lista de abertos e a linha dele desmonta — com
 * o link dentro. O pai sobrevive à revalidação; a linha, não.
 */
export default function PedidosAcesso({ pedidos, setores, trilhas, atender, recusar }: {
  pedidos: PedidoAcesso[]; setores: Setor[]; trilhas: MateriaAdmin[];
  atender: Acao; recusar: (d: FormData) => Promise<void>;
}) {
  const [estado, enviar, pendente] = useActionState(atender, {} as EstadoEquipe);
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [ultimo, setUltimo] = useState<{ nome: string; email: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const abertos = pedidos.filter((p) => p.status === 'novo');
  const fechados = pedidos.filter((p) => p.status !== 'novo').slice(0, 20);

  const submeter = (pedido: PedidoAcesso) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCopiado(false);
    setUltimo({ nome: pedido.nome, email: pedido.email });
    const dados = new FormData(e.currentTarget);
    startTransition(() => enviar(dados));
  };

  return (
    <>
      {estado.link && ultimo && (
        <div className="alerta alerta-ok" role="status" style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          <strong>{ultimo.nome} — {estado.ok}</strong>
          <code style={{ wordBreak: 'break-all', background: 'var(--surface-container)', padding: '8px 10px', borderRadius: 8 }}>
            {estado.link}
          </code>
          <div>
            <button className="btn btn-contorno btn-sm" type="button"
              onClick={() => { navigator.clipboard?.writeText(estado.link!).then(() => setCopiado(true)).catch(() => {}); }}>
              <Icone nome={copiado ? 'check' : 'content_copy'} tamanho={18} /> {copiado ? 'Copiado' : 'Copiar o link'}
            </button>
            <span className="caption suave" style={{ marginLeft: 10 }}>
              Mande para {ultimo.email}. Por segurança, o link não é mostrado de novo.
            </span>
          </div>
        </div>
      )}
      {estado.erro && (
        <p className="alerta alerta-erro" role="alert"><Icone nome="error" tamanho={20} /> {estado.erro}</p>
      )}

      {abertos.length === 0 && (
        <div className="vazio">Nenhum pedido em aberto. Quem pedir acesso pela página pública aparece aqui.</div>
      )}
      <div style={{ display: 'grid', gap: 14 }}>
        {abertos.map((pedido) => (
          <div className="cartao" key={pedido.id} style={{ boxShadow: 'none', background: 'var(--surface-container-low)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <strong>{pedido.nome}</strong> <span className="suave">· {pedido.email}</span>
                <br />
                <span className="caption suave">
                  pediu em {DATA(pedido.criadoEm)}
                  {pedido.setor && <> · setor informado: <strong>{pedido.setor}</strong></>}
                </span>
                {pedido.mensagem && (
                  <p className="body-sm" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{pedido.mensagem}</p>
                )}
              </div>
              <div className="acoes-linha">
                <button className="btn btn-primario btn-sm" type="button"
                        onClick={() => setAbertoId((v) => (v === pedido.id ? null : pedido.id))}>
                  <Icone nome="link" tamanho={18} /> {abertoId === pedido.id ? 'Fechar' : 'Convidar'}
                </button>
                <form action={recusar}>
                  <input type="hidden" name="id" value={pedido.id} />
                  <button className="btn btn-contorno btn-sm" type="submit">Recusar</button>
                </form>
              </div>
            </div>

            {abertoId === pedido.id && (
              <form onSubmit={submeter(pedido)} className="form-editor" style={{ marginTop: 16 }}>
                <input type="hidden" name="id" value={pedido.id} />
                <div className="linha estreita">
                  <label>
                    Setor
                    <select name="setorId" defaultValue="">
                      <option value="">sem setor</option>
                      {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </label>
                  <label>
                    Prazo para concluir (dias)
                    <input name="prazoDias" type="number" min={1} placeholder="sem prazo" />
                  </label>
                </div>
                {trilhas.length > 0 && (
                  <fieldset style={{ border: '1px solid var(--surface-variant)', borderRadius: 12, padding: 14 }}>
                    <legend className="caption suave">Trilhas liberadas no aceite (além das do setor)</legend>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {trilhas.map((t) => (
                        <label className="marcador" key={t.id} style={{ margin: 0 }}>
                          <input type="checkbox" name="trilhas" value={t.id} /> {t.nome}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <div className="acoes">
                  <button className="btn btn-primario" type="submit" disabled={pendente}>
                    {pendente ? 'Gerando…' : 'Gerar o convite por link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>

      {fechados.length > 0 && (
        <table className="tabela" style={{ marginTop: 20 }}>
          <thead><tr><th>Pessoa</th><th>Pedido em</th><th>Situação</th><th>Atendido por</th></tr></thead>
          <tbody>
            {fechados.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}<br /><span className="suave">{p.email}</span></td>
                <td className="apertado suave">{DATA(p.criadoEm)}</td>
                <td><span className={`chip chip-sm ${p.status === 'convidado' ? 'chip-secundaria' : 'chip-neutra'}`}>{p.status}</span></td>
                <td className="apertado suave">{p.atendidoPor ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
