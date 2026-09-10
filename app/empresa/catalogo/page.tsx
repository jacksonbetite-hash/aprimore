import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../../ui.tsx';
import FormComprar from './FormComprar.tsx';
import {
  acaoComprarVagas, acaoPedirOrcamento, acaoAceitarOrcamento, acaoCancelarOrcamento,
} from '../acoes.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../lib/empresa.ts';
import { cursosAVenda, lotesDaEmpresa, orcamentosDaEmpresa } from '../../../lib/empresa-catalogo.ts';
import { brl } from '../../../lib/precos.ts';

export const metadata: Metadata = { title: 'Catálogo da plataforma — Painel da empresa' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const CHIP_ORC: Record<string, string> = {
  novo: 'chip-terciaria', proposto: 'chip-primaria', aceito: 'chip-secundaria',
  recusado: 'chip-erro', cancelado: 'chip-neutra',
};

/**
 * A loja do catálogo para a empresa (etapa 6): o que está à venda, as
 * vagas já compradas e os orçamentos. Comprar leva ao checkout de
 * sempre; distribuir as vagas é em "Liberar trilhas".
 */
export default async function CatalogoDaEmpresa() {
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const [cursos, lotes, orcamentos] = await Promise.all([
    cursosAVenda(), lotesDaEmpresa(portal.id), orcamentosDaEmpresa(portal.id),
  ]);
  const vigentes = lotes.filter((l) => l.vigente);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Catálogo da plataforma</h1>
          <p className="suave">
            Cursos prontos, da plataforma e de professores parceiros, para a sua equipe. Você
            compra vagas; cada vaga vai para uma pessoa em{' '}
            <Link href="/empresa/atribuicoes" style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>Liberar trilhas</Link>.
          </p>
        </div>
      </div>

      {vigentes.length > 0 && (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Vagas compradas</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>
            Cada lote vale um ano a partir do pagamento. Vaga devolvida volta ao saldo.
          </p>
          <table className="tabela">
            <thead><tr><th>Curso</th><th>Vagas</th><th>Distribuídas</th><th>Vale até</th><th>Pedido</th><th></th></tr></thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id} style={l.vigente ? undefined : { opacity: .6 }}>
                  <td><strong>{l.materiaNome}</strong></td>
                  <td className="apertado">{l.quantidade}</td>
                  <td className="apertado">{l.usadas} <span className="suave">· {l.quantidade - l.usadas} livre(s)</span></td>
                  <td className="apertado">{DATA(l.fimEm)}{!l.vigente && <span className="chip chip-sm chip-neutra" style={{ marginLeft: 8 }}>vencido</span>}</td>
                  <td className="mono suave">{l.pedidoReferencia ?? '—'}</td>
                  <td>
                    {l.vigente && l.usadas < l.quantidade && (
                      <Link className="btn btn-contorno btn-sm" href="/empresa/atribuicoes#vagas">Distribuir</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orcamentos.length > 0 && (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Orçamentos</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>
            Pedidos acima do limite de vagas do curso. O comercial responde com o valor; aceitando,
            você paga pelo checkout e as vagas entram como lote.
          </p>
          <table className="tabela">
            <thead><tr><th>Curso</th><th>Vagas</th><th>Pedido em</th><th>Situação</th><th>Proposta</th><th></th></tr></thead>
            <tbody>
              {orcamentos.map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.materiaNome}</strong>{o.mensagem && <><br /><span className="caption suave">“{o.mensagem}”</span></>}</td>
                  <td className="apertado">{o.quantidade}</td>
                  <td className="apertado suave">{DATA(o.criadoEm)}</td>
                  <td>
                    <span className={`chip chip-sm ${CHIP_ORC[o.status]}`}>{o.status}</span>
                    {o.pedidoStatus && <><br /><span className="caption suave">pedido {o.pedidoStatus.toLowerCase()}</span></>}
                  </td>
                  <td>
                    {o.valorCentavos !== null ? <strong>{brl(o.valorCentavos)}</strong> : <span className="suave">aguardando</span>}
                    {o.resposta && <><br /><span className="caption">{o.resposta}</span></>}
                  </td>
                  <td>
                    <div className="acoes-linha">
                      {o.status === 'proposto' && (
                        <form action={acaoAceitarOrcamento}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="meio" value="PIX" />
                          <button className="btn btn-primario btn-sm" type="submit">Aceitar e pagar</button>
                        </form>
                      )}
                      {o.status === 'aceito' && o.pedidoReferencia && o.pedidoStatus === 'ABERTO' && (
                        <Link className="btn btn-primario btn-sm" href={`/checkout/${o.pedidoReferencia}`}>Pagar</Link>
                      )}
                      {(o.status === 'novo' || o.status === 'proposto') && (
                        <form action={acaoCancelarOrcamento}>
                          <input type="hidden" name="id" value={o.id} />
                          <button className="btn btn-contorno btn-sm" type="submit">Cancelar</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}><Icone nome="menu_book" /> Cursos à venda</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Preço por vaga, válida por um ano. Cada curso diz até quantas vagas se compram na hora.
        </p>
        {cursos.length === 0 ? (
          <div className="vazio">Nenhum curso à venda no momento.</div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {cursos.map((c) => (
              <div key={c.id} className="cartao" style={{ background: 'var(--surface-container-low)', margin: 0 }}>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {c.capa && <img src={c.capa} alt="" width={160} height={90} style={{ borderRadius: 'var(--r-md)', objectFit: 'cover' }} />}
                  <div style={{ flex: '1 1 320px' }}>
                    <h3 style={{ margin: 0 }}>{c.nome}</h3>
                    <p className="caption suave" style={{ margin: '4px 0 8px' }}>
                      {c.areaNome} · {c.aulasPublicadas} aula(s)
                      {c.professor && ` · por ${c.professor}`}
                      {c.portalNome && ` · portal ${c.portalNome}`}
                    </p>
                    <p style={{ fontSize: 14, lineHeight: 1.6 }}>{c.ementa.split('\n')[0].slice(0, 240)}</p>
                    <p className="caption" style={{ marginTop: 8 }}>
                      <strong>{brl(c.precoAnualCentavos)}</strong> por vaga/ano ·
                      até <strong>{c.vagasSemOrcamento}</strong> vaga(s) na hora
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <FormComprar comprar={acaoComprarVagas} orcar={acaoPedirOrcamento} materiaId={c.id}
                               limite={c.vagasSemOrcamento} precoAnual={brl(c.precoAnualCentavos)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
