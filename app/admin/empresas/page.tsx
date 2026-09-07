import Link from 'next/link';
import type { Metadata } from 'next';
import { acaoStatusInteresse } from './acoes.ts';
import {
  listarInteresses, contarInteressesPorStatus,
  ROTULO_STATUS, ROTULO_PORTE, ROTULO_PLANO, type StatusInteresse,
} from '../../../lib/empresas.ts';

export const metadata: Metadata = { title: 'Empresas & RH — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const CNPJ = (s: string) =>
  s.length === 14 ? `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}` : s;

const RECORTES: { valor: string; rotulo: string }[] = [
  { valor: 'novo', rotulo: 'Fila' },
  { valor: 'em_contato', rotulo: 'Em contato' },
  { valor: 'encerrado', rotulo: 'Encerrados' },
  { valor: '', rotulo: 'Todos' },
];

const CHIP: Record<StatusInteresse, string> = {
  novo: 'chip-terciaria', em_contato: 'chip-secundaria', encerrado: 'chip-neutra',
};

/** Os passos que fazem sentido a partir de cada situação. */
const PROXIMOS: Record<StatusInteresse, { status: StatusInteresse; rotulo: string }[]> = {
  novo: [{ status: 'em_contato', rotulo: 'Pegar' }, { status: 'encerrado', rotulo: 'Encerrar' }],
  em_contato: [{ status: 'encerrado', rotulo: 'Encerrar' }, { status: 'novo', rotulo: 'Devolver à fila' }],
  encerrado: [{ status: 'novo', rotulo: 'Reabrir' }],
};

/**
 * A fila do comercial para a vitrine corporativa (§12-B.1). Não há
 * contrato nem licença aqui — só o contato de quem pediu apresentação e
 * em que pé a conversa está. A venda, por enquanto, fecha fora do site.
 */
export default async function EmpresasAdmin(
  { searchParams }: { searchParams: Promise<{ status?: string }> },
) {
  const { status = 'novo' } = await searchParams;
  const [itens, contagem] = await Promise.all([listarInteresses(status), contarInteressesPorStatus()]);
  const porStatus = Object.fromEntries(contagem.map((c) => [c.status, c.total]));
  const naFila = porStatus['novo'] ?? 0;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Empresas &amp; RH</h1>
          <p className="suave">
            {naFila === 0 ? 'Nenhum pedido de apresentação esperando.' : `${naFila} pedido(s) de apresentação esperando contato.`}{' '}
            A modalidade está em implantação: a proposta e o contrato fecham fora do site (§12-B.1).
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href="/empresas" target="_blank">Ver a página</Link>
        </div>
      </div>

      <div className="filtros">
        {RECORTES.map((r) => (
          <Link key={r.valor || 'todos'}
            className={`chip chip-sm ${r.valor === status ? 'chip-primaria' : 'chip-contorno'}`}
            href={r.valor ? `/admin/empresas?status=${r.valor}` : '/admin/empresas?status='}>
            {r.rotulo}{porStatus[r.valor] ? ` · ${porStatus[r.valor]}` : ''}
          </Link>
        ))}
      </div>

      <div className="cartao">
        <table className="tabela">
          <thead>
            <tr><th>Empresa</th><th>Contato</th><th>Interesse</th><th>Recebido</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{i.empresa}</strong>
                  <br /><span className="suave mono">{CNPJ(i.cnpj)}</span>
                </td>
                <td>
                  {i.nome}
                  <br /><a href={`mailto:${i.email}`} style={{ color: 'var(--primary-texto)' }}>{i.email}</a>
                  {i.telefone && <><br /><span className="suave">{i.telefone}</span></>}
                </td>
                <td>
                  {ROTULO_PLANO[i.plano]}
                  <br /><span className="suave">{ROTULO_PORTE[i.porte]}</span>
                  {i.mensagem && (
                    <details style={{ marginTop: 4 }}>
                      <summary className="caption suave" style={{ cursor: 'pointer' }}>mensagem</summary>
                      <p style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{i.mensagem}</p>
                    </details>
                  )}
                </td>
                <td className="suave apertado">{DATA(i.criadoEm)}</td>
                <td>
                  <span className={`chip chip-sm ${CHIP[i.status]}`}>{ROTULO_STATUS[i.status]}</span>
                  {i.atendidoPor && (
                    <><br /><span className="caption suave">{i.atendidoPor} · {DATA(i.atendidoEm)}</span></>
                  )}
                </td>
                <td className="apertado">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PROXIMOS[i.status].map((p) => (
                      <form action={acaoStatusInteresse} key={p.status}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="status" value={p.status} />
                        <button className="btn btn-contorno btn-sm" type="submit">{p.rotulo}</button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr><td colSpan={6}><div className="vazio">Nenhum pedido neste recorte.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
