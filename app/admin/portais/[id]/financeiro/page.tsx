import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { FormFechar, FormApurar, FormApuracaoAdmin } from '../FormsFinanceiro.tsx';
import {
  acaoFecharFatura, acaoMedirConsumo, acaoApurar, acaoAprovarApuracao, acaoRegistrarRepasse, acaoPagarRepasse,
} from '../../acoes.ts';
import { listarApuracoes, itensDaApuracao, prazoDePagamento } from '../../../../../lib/apuracao.ts';
import ItensApuracao from '../../../../professor/ItensApuracao.tsx';
import { buscarPortal, historicoDeContratos } from '../../../../../lib/admin-portais.ts';
import {
  consumoDaCompetencia, extratoDoPortal, totaisDoExtrato, listarFaturas, vendasNaVitrine,
} from '../../../../../lib/portal-financeiro.ts';
import { listarPlanos } from '../../../../../lib/admin-portais.ts';
import { brl } from '../../../../../lib/precos.ts';
import {
  PORTAL_PLATAFORMA, GB, calcularExcedente, competenciaDe, competenciaAnterior,
} from '../../../../../lib/portal.ts';
import { permissoesDaTela } from '../../../guarda.ts';

export const metadata: Metadata = { title: 'Financeiro do portal — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const gb = (bytes: number) => (bytes / GB).toFixed(bytes < GB / 10 ? 3 : 1) + ' GB';
const MES = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const CHIP: Record<string, string> = {
  PAGA: 'chip-secundaria', FECHADA: 'chip-neutra', EM_ATRASO: 'chip-erro',
  ABERTA: 'chip-neutra', CANCELADA: 'chip-neutra',
};

/**
 * Financeiro do portal — §5.10.2, etapa 4: consumo do mês contra a cota,
 * faturas com o fechamento, e o extrato venda a venda com o percentual
 * que ficou conosco. Tudo o que o professor vai ver no painel dele nasce
 * das mesmas consultas — o admin só enxerga primeiro.
 */
export default async function FinanceiroDoPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portalId = Number(id);
  if (!Number.isInteger(portalId) || portalId === PORTAL_PLATAFORMA) notFound();

  const hoje = new Date();
  const atual = competenciaDe(hoje);
  const [portal, contratos, planos, consumo, extrato, totais, faturas, vitrine, apuracoes] = await Promise.all([
    buscarPortal(portalId), historicoDeContratos(portalId), listarPlanos(),
    consumoDaCompetencia(portalId, atual), extratoDoPortal(portalId), totaisDoExtrato(portalId),
    listarFaturas(portalId), vendasNaVitrine(portalId), listarApuracoes(portalId),
  ]);
  // O financeiro lê esta tela inteira e não aperta botão nenhum
  // (lib/permissoes.ts); cada ação reconfere no servidor.
  const { 'financeiro.agir': agir } = await permissoesDaTela('financeiro.agir');
  const itens = new Map(await Promise.all(apuracoes.map(async (a) => [a.id, await itensDaApuracao(a.id)] as const)));
  const comissaoTotal = vitrine.filter((v) => v.status === 'PAGO').reduce((t, v) => t + v.aReceber, 0);
  if (!portal) notFound();

  const contrato = contratos.find((c) => c.vigenteAte === null);
  const plano = planos.find((p) => p.id === contrato?.planoId);
  const excedente = plano
    ? calcularExcedente(consumo.bytesArmazenados, consumo.bytesTrafegados, plano)
    : null;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Financeiro · {portal.nomeExibicao}</h1>
          <p className="suave">
            {contrato
              ? <>Contrato vigente: {brl(contrato.licencaMensalCentavos)}/mês + {Number(contrato.percentualBase)}% (+{Number(contrato.acrescimoIndicacaoPp)} p.p. por indicação)</>
              : 'Sem contrato vigente'}
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href={`/admin/portais/${portalId}/alunos`}>Alunos</Link>
          <Link className="btn btn-contorno" href={`/admin/portais/${portalId}`}>Voltar ao portal</Link>
        </div>
      </div>

      <div className="grade-3" style={{ marginBottom: 24 }}>
        <div className="cartao">
          <span className="label-md suave">VENDIDO NO PORTAL</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{brl(totais.vendido)}</div>
          <p className="caption suave">{totais.vendas} venda(s) paga(s) · {brl(totais.reembolsado)} reembolsado</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">NOSSO PERCENTUAL</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>{brl(totais.retido)}</div>
          <p className="caption suave">retido no split, venda a venda</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">CONSUMO · {MES(new Date(atual))}</span>
          <div style={{ fontSize: 15, lineHeight: 1.7 }}>
            Armazenado: <strong>{gb(consumo.bytesArmazenados)}</strong>{plano && <span className="suave"> / {plano.gbArmazenamento} GB</span>}<br />
            Trafegado: <strong>{gb(consumo.bytesTrafegados)}</strong>{plano && <span className="suave"> / {plano.gbBandaMes} GB</span>}
          </div>
          <p className="caption suave">
            {excedente && excedente.gbExcedentes > 0
              ? <>Excedente até agora: {excedente.gbExcedentes} GB = {brl(excedente.centavos)}</>
              : 'Dentro da cota'}
            {consumo.medidoEm && <> · medido {DATA(consumo.medidoEm)}</>}
          </p>
          {agir && <form action={acaoMedirConsumo} style={{ marginTop: 8 }}>
            <input type="hidden" name="portalId" value={portalId} />
            <button className="btn btn-contorno btn-sm" type="submit">Medir armazenamento agora</button>
          </form>}
        </div>
      </div>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Faturas</h2>
        <p className="suave" style={{ marginBottom: 16 }}>
          A 1ª mensalidade nasce na contratação. As seguintes fecham por competência: licença +
          excedente + ajustes. Pagamento pelo mesmo webhook (<code>PF-</code>).
        </p>
        <table className="tabela" style={{ marginBottom: 20 }}>
          <thead>
            <tr><th>Competência</th><th>Licença</th><th>Excedente</th><th>Ajustes</th><th>Total</th><th>Vencimento</th><th>Situação</th><th>Referência</th></tr>
          </thead>
          <tbody>
            {faturas.map((f) => (
              <tr key={f.id}>
                <td>{MES(f.competencia)}</td>
                <td className="apertado">{brl(f.centavosLicenca)}</td>
                <td className="apertado">{brl(f.centavosExcedente)}</td>
                <td className="apertado">{brl(f.centavosAjustes)}</td>
                <td className="apertado"><strong>{brl(f.centavosTotal)}</strong></td>
                <td>{DATA(f.vencimento)}</td>
                <td><span className={`chip chip-sm ${CHIP[f.status] ?? 'chip-neutra'}`}>{f.status.toLowerCase().replace('_', ' ')}</span></td>
                <td className="mono suave">{f.referencia ?? '—'}</td>
              </tr>
            ))}
            {faturas.length === 0 && <tr><td colSpan={8} className="suave">Nenhuma fatura ainda.</td></tr>}
          </tbody>
        </table>
        {agir && <>
          <h3 className="headline-md" style={{ marginBottom: 12 }}>Fechar uma competência</h3>
          <FormFechar acao={acaoFecharFatura} portalId={portalId}
                      competenciaSugerida={competenciaAnterior(hoje)} />
        </>}
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Extrato venda a venda</h2>
        <p className="suave" style={{ marginBottom: 16 }}>
          O percentual gravado em cada pedido no ato da venda — não o do contrato de hoje.
          <strong> ★</strong> marca aluno trazido por anúncio nosso (§5.10.1).
        </p>
        <table className="tabela">
          <thead>
            <tr><th>Pago em</th><th>Referência</th><th>Aluno</th><th>Produto</th><th>Valor</th><th>%</th><th>Retido</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {extrato.map((v) => (
              <tr key={v.referencia}>
                <td>{DATA(v.pagoEm)}</td>
                <td className="mono">{v.referencia}</td>
                <td>{v.alunoNome}<br /><span className="suave">{v.alunoEmail}</span></td>
                <td>{v.escopo === 'CATALOGO' ? 'Passe completo' : v.materiaNome}</td>
                <td className="apertado">{brl(v.centavos)}</td>
                <td className="apertado">{v.percentual ? `${Number(v.percentual)}%` : '—'}{v.indicado && ' ★'}</td>
                <td className="apertado"><strong>{brl(v.retido)}</strong></td>
                <td><span className={`chip chip-sm ${v.status === 'PAGO' ? 'chip-secundaria' : 'chip-erro'}`}>{v.status.toLowerCase()}</span></td>
              </tr>
            ))}
            {extrato.length === 0 && <tr><td colSpan={8} className="suave">Nenhuma venda ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao" style={{ marginTop: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Vendas na nossa vitrine — comissão ao professor</h2>
        <p className="suave" style={{ marginBottom: 16 }}>
          Cursos deste portal comprados por alunos da plataforma (§5.10.2, etapa 5). A venda é
          nossa; o professor recebe a comissão do contrato, apurada mensalmente (§5.6.1).
          Total a repassar: <strong>{brl(comissaoTotal)}</strong>.
        </p>
        <table className="tabela">
          <thead>
            <tr><th>Pago em</th><th>Referência</th><th>Curso</th><th>Valor</th><th>Comissão</th><th>A receber</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {vitrine.map((v) => (
              <tr key={v.referencia}>
                <td>{DATA(v.pagoEm)}</td>
                <td className="mono">{v.referencia}</td>
                <td>{v.materiaNome}</td>
                <td className="apertado">{brl(v.centavos)}</td>
                <td className="apertado">{v.comissao ? `${Number(v.comissao)}%` : '—'}</td>
                <td className="apertado"><strong>{brl(v.aReceber)}</strong></td>
                <td><span className={`chip chip-sm ${v.status === 'PAGO' ? 'chip-secundaria' : 'chip-erro'}`}>{v.status.toLowerCase()}</span></td>
              </tr>
            ))}
            {vitrine.length === 0 && <tr><td colSpan={7} className="suave">Nenhuma venda na vitrine ainda.</td></tr>}
          </tbody>
        </table>

        <h3 className="headline-md" style={{ margin: '24px 0 6px' }}>Apurações (§5.6.1)</h3>
        <p className="suave" style={{ marginBottom: 12 }}>
          Fechamento mensal da comissão: conferência de 5 dias, nota fiscal do professor, repasse com comprovante.
        </p>
        <table className="tabela" style={{ marginBottom: 16 }}>
          <thead><tr><th>Competência</th><th>Vendas</th><th>Reembolsos</th><th>Saldo ant.</th><th>Comissão</th><th>Situação</th><th>Nota</th><th>Ações</th></tr></thead>
          <tbody>
            {apuracoes.map((a) => (
              <tr key={a.id}>
                <td>{MES(a.competencia)}</td>
                <td className="apertado">{brl(a.centavosVendas)}</td>
                <td className="apertado">{brl(a.centavosReembolsos)}</td>
                <td className="apertado">{brl(a.centavosSaldoAnterior)}</td>
                <td className="apertado"><strong>{brl(a.centavosComissao)}</strong></td>
                <td>
                  <span className={`chip chip-sm ${a.status === 'PAGA' ? 'chip-secundaria' : a.status === 'CONTESTADA' ? 'chip-erro' : 'chip-neutra'}`}>
                    {a.status.toLowerCase().replace('_', ' ')}
                  </span>
                  {a.status === 'EM_CONFERENCIA' && <><br /><span className="caption suave">contesta até {DATA(a.prazoContestacao)}</span></>}
                  {a.status === 'APROVADA' && <><br /><span className={`caption ${prazoDePagamento(a.competencia) < hoje ? 'chip-erro' : 'suave'}`}>pagar até {DATA(prazoDePagamento(a.competencia))}</span></>}
                  {a.contestacao && <><br /><span className="caption">“{a.contestacao}”</span></>}
                </td>
                <td className="mono">{a.nfNumero ?? '—'}</td>
                <td>
                  {agir ? (
                    <FormApuracaoAdmin aprovar={acaoAprovarApuracao} pagar={acaoRegistrarRepasse} pagarGateway={acaoPagarRepasse}
                      portalId={portalId} apuracaoId={a.id} status={a.status} contestacao={a.contestacao} temNota={Boolean(a.nfNumero)} />
                  ) : <span className="suave">—</span>}
                </td>
              </tr>
            ))}
            {apuracoes.map((a) => (
              <tr key={`itens-${a.id}`}><td colSpan={8} style={{ paddingTop: 0 }}><ItensApuracao itens={itens.get(a.id) ?? []} /></td></tr>
            ))}
            {apuracoes.length === 0 && <tr><td colSpan={8} className="suave">Nenhuma competência apurada ainda.</td></tr>}
          </tbody>
        </table>
        {agir && <FormApurar acao={acaoApurar} portalId={portalId} competenciaSugerida={competenciaAnterior(hoje)} />}
      </div>
    </>
  );
}
