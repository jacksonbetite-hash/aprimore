import Link from 'next/link';
import type { Metadata } from 'next';
import { acaoMedirMeuConsumo, acaoContestar, acaoInformarNota } from '../acoes.ts';
import FormsApuracao from '../FormsApuracao.tsx';
import ItensApuracao from '../ItensApuracao.tsx';
import { listarApuracoes, itensDaApuracao, prazoDePagamento } from '../../../lib/apuracao.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../lib/professor.ts';
import {
  consumoDaCompetencia, extratoDoPortal, totaisDoExtrato, listarFaturas, vendasNaVitrine,
} from '../../../lib/portal-financeiro.ts';
import { listarPlanos } from '../../../lib/admin-portais.ts';
import { brl } from '../../../lib/precos.ts';
import { GB, calcularExcedente, competenciaDe } from '../../../lib/portal.ts';
import FinanceiroCatalogo from '../catalogo/Financeiro.tsx';

export const metadata: Metadata = { title: 'Financeiro — Painel do professor' };

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const gb = (bytes: number) => (bytes / GB).toFixed(bytes < GB / 10 ? 3 : 1) + ' GB';
const MES = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const CHIP: Record<string, string> = {
  PAGA: 'chip-secundaria', FECHADA: 'chip-terciaria', EM_ATRASO: 'chip-erro', ABERTA: 'chip-neutra', CANCELADA: 'chip-neutra',
};

/**
 * O extrato do professor (§5.10: "transparência é o que mantém professor
 * parceiro"): cada venda com o percentual que ficou com a plataforma, o
 * consumo contra a cota, as faturas — e o botão de pagar.
 */
export default async function FinanceiroDoProfessor() {
  const u = (await alunoAtual())!;
  const portal = await portalDoProfessor(u.id);
  if (!portal) return <FinanceiroCatalogo u={u} />;
  const atual = competenciaDe(new Date());
  const [consumo, extrato, totais, faturas, vitrine, planos, apuracoes] = await Promise.all([
    consumoDaCompetencia(portal.id, atual), extratoDoPortal(portal.id), totaisDoExtrato(portal.id),
    listarFaturas(portal.id), vendasNaVitrine(portal.id), listarPlanos(), listarApuracoes(portal.id),
  ]);
  const itens = new Map(await Promise.all(apuracoes.map(async (a) => [a.id, await itensDaApuracao(a.id)] as const)));
  const plano = planos.find((p) => p.nome === portal.planoNome);
  const excedente = plano ? calcularExcedente(consumo.bytesArmazenados, consumo.bytesTrafegados, plano) : null;
  const comissaoVitrine = vitrine.filter((v) => v.status === 'PAGO').reduce((t, v) => t + v.aReceber, 0);
  const seu = totais.vendido - totais.retido;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Financeiro</h1>
          <p className="suave">Cada número aqui tem uma venda ou uma medição por trás — nada é estimado.</p>
        </div>
      </div>

      <div className="grade-4" style={{ marginBottom: 24 }}>
        <div className="cartao">
          <span className="label-md suave">VENDIDO NO SEU PORTAL</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{brl(totais.vendido)}</div>
          <p className="caption suave">{totais.vendas} venda(s) · {brl(totais.reembolsado)} reembolsado</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">SUA PARTE</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{brl(seu)}</div>
          <p className="caption suave">cai direto na sua conta de recebimento ({brl(totais.retido)} ficam com a plataforma)</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">COMISSÃO NA VITRINE</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{brl(comissaoVitrine)}</div>
          <p className="caption suave">seus cursos vendidos pela plataforma; repasse mensal</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">CONSUMO · {MES(new Date(atual))}</span>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>
            Vídeo: <strong>{gb(consumo.bytesArmazenados)}</strong>{plano && <span className="suave"> / {plano.gbArmazenamento} GB</span>}<br />
            Exibição: <strong>{gb(consumo.bytesTrafegados)}</strong>{plano && <span className="suave"> / {plano.gbBandaMes} GB</span>}
          </div>
          <p className="caption suave">
            {excedente && excedente.gbExcedentes > 0 ? <>Excedente: {excedente.gbExcedentes} GB = {brl(excedente.centavos)}</> : 'Dentro da cota'}
          </p>
          <form action={acaoMedirMeuConsumo} style={{ marginTop: 6 }}>
            <button className="btn btn-contorno btn-sm" type="submit">Medir agora</button>
          </form>
        </div>
      </div>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Faturas</h2>
        <table className="tabela">
          <thead><tr><th>Competência</th><th>Licença</th><th>Excedente</th><th>Ajustes</th><th>Total</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead>
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
                <td>
                  {f.referencia && f.status !== 'PAGA' && (
                    <Link className="btn btn-primario btn-sm" href={`/para-professores/pagamento/${f.referencia}`}>Pagar</Link>
                  )}
                </td>
              </tr>
            ))}
            {faturas.length === 0 && <tr><td colSpan={8} className="suave">Nenhuma fatura ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Extrato venda a venda</h2>
        <p className="suave" style={{ marginBottom: 16 }}>
          O percentual gravado no ato de cada venda. <strong>★</strong> marca aluno trazido por
          anúncio da plataforma (+{portal.contrato ? Number(portal.contrato.acrescimoIndicacaoPp) : 5} p.p., só na 1ª compra).
        </p>
        <table className="tabela">
          <thead><tr><th>Pago em</th><th>Aluno</th><th>Produto</th><th>Valor</th><th>Plataforma</th><th>Sua parte</th><th>Situação</th></tr></thead>
          <tbody>
            {extrato.map((v) => (
              <tr key={v.referencia}>
                <td>{DATA(v.pagoEm)}</td>
                <td>{v.alunoNome}</td>
                <td>{v.escopo === 'CATALOGO' ? 'Passe completo' : v.materiaNome}</td>
                <td className="apertado">{brl(v.centavos)}</td>
                <td className="apertado">{v.percentual ? `${Number(v.percentual)}%` : '—'}{v.indicado && ' ★'} · {brl(v.retido)}</td>
                <td className="apertado"><strong>{brl(v.centavos - v.retido)}</strong></td>
                <td><span className={`chip chip-sm ${v.status === 'PAGO' ? 'chip-secundaria' : 'chip-erro'}`}>{v.status.toLowerCase()}</span></td>
              </tr>
            ))}
            {extrato.length === 0 && <tr><td colSpan={7} className="suave">Nenhuma venda ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      {apuracoes.length > 0 && (
        <div className="cartao" style={{ marginBottom: 24 }}>
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Repasse da comissão de vitrine</h2>
          <p className="suave" style={{ marginBottom: 16 }}>
            Fechado mês a mês. Você tem 5 dias para contestar o extrato; aprovado, emite a nota no
            valor e a plataforma paga até o dia 15. Abaixo de R$ 100, o saldo acumula para o mês seguinte.
          </p>
          <table className="tabela">
            <thead><tr><th>Competência</th><th>Vendas</th><th>Reembolsos</th><th>Saldo ant.</th><th>Comissão</th><th>Situação</th><th>Ações</th></tr></thead>
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
                    {a.status === 'EM_CONFERENCIA' && <><br /><span className="caption suave">conteste até {DATA(a.prazoContestacao)}</span></>}
                    {a.status === 'APROVADA' && <><br /><span className="caption suave">{a.nfNumero ? `NF ${a.nfNumero} · ` : 'emita a nota · '}pagamento até {DATA(prazoDePagamento(a.competencia))}</span></>}
                    {a.resposta && <><br /><span className="caption">resposta: {a.resposta}</span></>}
                    {a.status === 'PAGA' && <><br /><span className="caption suave">NF {a.nfNumero} · pago em {DATA(a.pagaEm)} · {a.comprovante}</span></>}
                  </td>
                  <td>
                    <FormsApuracao contestar={acaoContestar} informarNota={acaoInformarNota} apuracaoId={a.id} status={a.status} />
                  </td>
                </tr>
              ))}
              {apuracoes.map((a) => (
                <tr key={`itens-${a.id}`}><td colSpan={7} style={{ paddingTop: 0 }}><ItensApuracao itens={itens.get(a.id) ?? []} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vitrine.length > 0 && (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Vendas na vitrine da plataforma</h2>
          <p className="suave" style={{ marginBottom: 16 }}>Cursos seus comprados por alunos da plataforma. A comissão é apurada e repassada mensalmente.</p>
          <table className="tabela">
            <thead><tr><th>Pago em</th><th>Curso</th><th>Valor</th><th>Comissão</th><th>A receber</th><th>Situação</th></tr></thead>
            <tbody>
              {vitrine.map((v) => (
                <tr key={v.referencia}>
                  <td>{DATA(v.pagoEm)}</td>
                  <td>{v.materiaNome}</td>
                  <td className="apertado">{brl(v.centavos)}</td>
                  <td className="apertado">{v.comissao ? `${Number(v.comissao)}%` : '—'}</td>
                  <td className="apertado"><strong>{brl(v.aReceber)}</strong></td>
                  <td><span className={`chip chip-sm ${v.status === 'PAGO' ? 'chip-secundaria' : 'chip-erro'}`}>{v.status.toLowerCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
