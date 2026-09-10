import Link from 'next/link';
import type { Metadata } from 'next';
import { exigirTela } from '../guarda.ts';
import {
  receitaPorMes, faturasEmAberto, pedidosRecentes, reembolsosRecentes, totaisFinanceiros,
} from '../../../lib/financeiro-consolidado.ts';
import { apuracoesEmAberto, prazoDePagamento } from '../../../lib/apuracao.ts';
import { pode } from '../../../lib/permissoes.ts';
import { brl } from '../../../lib/precos.ts';

export const metadata: Metadata = { title: 'Financeiro — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const MES = (d: Date | string) =>
  new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const MES_CURTO = (ym: string) => {
  const [a, m] = ym.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};
const CHIP_PEDIDO: Record<string, string> = {
  PAGO: 'chip-secundaria', ABERTO: 'chip-neutra', EXPIRADO: 'chip-neutra',
  CANCELADO: 'chip-neutra', REEMBOLSADO: 'chip-erro',
};

/**
 * A visão consolidada do dinheiro — §5.9. Só leitura, de propósito: esta
 * é a tela do perfil Financeiro (docs/plano-perfis-e-acessos.md), e tudo o
 * que ela lista aponta para o lugar onde a ação acontece — que abre para
 * quem tem `financeiro.agir` e fica só de leitura para quem não tem.
 */
export default async function Financeiro() {
  const u = await exigirTela('financeiro.ver');
  const [receita, faturas, apuracoes, pedidos, reembolsos, totais] = await Promise.all([
    receitaPorMes(6), faturasEmAberto(), apuracoesEmAberto(),
    pedidosRecentes(40), reembolsosRecentes(15), totaisFinanceiros(),
  ]);
  const hoje = new Date();
  const esteMes = receita[receita.length - 1];
  const soLeitura = !pode(u.papel, 'financeiro.agir');

  const indicadores = [
    { rotulo: 'Líquido no mês', valor: brl(esteMes.liquido), destaque: true,
      nota: `${brl(esteMes.vendasPlataforma)} vendas + ${brl(esteMes.retidoPortais)} retido + ${brl(esteMes.mensalidades)} mensalidades − ${brl(esteMes.reembolsos)} reembolsos` },
    { rotulo: 'Faturas de portal em aberto', valor: brl(totais.centavosFaturasAbertas),
      nota: totais.faturasEmAtraso > 0 ? `${totais.faturasEmAtraso} em atraso` : 'nenhuma em atraso' },
    { rotulo: 'Repasses a pagar', valor: brl(totais.centavosApuracoesAprovadas),
      nota: `${totais.apuracoesAguardando} apuração(ões) esperando alguém` },
    { rotulo: 'Pedidos aguardando pagamento', valor: String(totais.pedidosAbertos),
      nota: `${brl(totais.centavosAbertos)} em Pix/cartão ainda não confirmado` },
  ];

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Financeiro</h1>
          <p className="suave">
            Receita por fonte, o que está em aberto e as últimas movimentações — de toda a
            operação, plataforma e portais.
          </p>
        </div>
      </div>

      {soLeitura && (
        <p className="aviso" style={{ marginBottom: 20 }}>
          <strong>Só leitura.</strong> O seu perfil enxerga o financeiro inteiro e não altera
          nada: preço, contrato, fatura, apuração e repasse ficam com a administração.
        </p>
      )}

      <div className="grade-4">
        {indicadores.map((i) => (
          <div className="cartao indicador" key={i.rotulo}>
            <div className="rotulo">{i.rotulo}</div>
            <div className={`valor${i.destaque ? ' destaque' : ''}`}>{i.valor}</div>
            <div className="nota">{i.nota}</div>
          </div>
        ))}
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Receita por fonte</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Venda na plataforma é inteira nossa (a comissão do parceiro sai pela apuração). Da
          venda no portal do professor, só o percentual retido no split. Mensalidade é a
          fatura de portal paga no mês. Reembolso desconta no mês em que foi devolvido.
        </p>
        <table className="tabela">
          <thead>
            <tr>
              <th>Mês</th><th>Vendas na plataforma</th><th>Vendas nos portais</th>
              <th>Nosso % dos portais</th><th>Mensalidades</th><th>Reembolsos</th><th>Líquido</th>
            </tr>
          </thead>
          <tbody>
            {receita.map((r) => (
              <tr key={r.mes}>
                <td>{MES_CURTO(r.mes)}</td>
                <td className="apertado">{brl(r.vendasPlataforma)}</td>
                <td className="apertado suave">{brl(r.vendasPortais)}</td>
                <td className="apertado">{brl(r.retidoPortais)}</td>
                <td className="apertado">{brl(r.mensalidades)}</td>
                <td className="apertado">{r.reembolsos ? `− ${brl(r.reembolsos)}` : '—'}</td>
                <td className="apertado"><strong>{brl(r.liquido)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grade-2">
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Faturas de portal em aberto</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>
            Mensalidade + excedente + ajustes, por competência. A régua de atraso suspende o
            portal; o aluno com licença vigente continua (§5.10).
          </p>
          <table className="tabela">
            <thead><tr><th>Portal</th><th>Competência</th><th>Total</th><th>Vence</th><th>Situação</th></tr></thead>
            <tbody>
              {faturas.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/admin/portais/${f.portalId}/financeiro`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                      {f.portalNome}
                    </Link>
                    <br /><span className="caption suave">{f.tipo === 'EMPRESA' ? 'empresa' : 'professor'}</span>
                  </td>
                  <td>{MES(f.competencia)}</td>
                  <td className="apertado"><strong>{brl(f.centavosTotal)}</strong></td>
                  <td className="apertado">{DATA(f.vencimento)}</td>
                  <td><span className={`chip chip-sm ${f.status === 'EM_ATRASO' ? 'chip-erro' : 'chip-neutra'}`}>{f.status.toLowerCase().replace('_', ' ')}</span></td>
                </tr>
              ))}
              {faturas.length === 0 && <tr><td colSpan={5} className="suave">Nenhuma fatura em aberto.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Apurações esperando alguém</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>
            Comissão de vitrine (§5.6.1): conferência do professor, resposta à contestação,
            nota fiscal e repasse até o dia 15 do mês seguinte.
          </p>
          <table className="tabela">
            <thead><tr><th>Portal</th><th>Competência</th><th>Comissão</th><th>Situação</th></tr></thead>
            <tbody>
              {apuracoes.map((a) => (
                <tr key={a.id}>
                  <td>
                    {/* Dono portal → financeiro do portal; dono professor do
                        catálogo (db/046) → a ficha dele, onde a apuração se aprova. */}
                    <Link href={a.portalId !== null ? `/admin/portais/${a.portalId}/financeiro` : `/admin/usuarios/${a.professorId}`}
                          style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                      {a.nomeExibicao}
                    </Link>
                    {a.portalId === null && <><br /><span className="caption suave">professor do catálogo</span></>}
                  </td>
                  <td>{MES(a.competencia)}</td>
                  <td className="apertado"><strong>{brl(a.centavosComissao)}</strong></td>
                  <td>
                    <span className={`chip chip-sm ${a.status === 'CONTESTADA' ? 'chip-erro' : 'chip-neutra'}`}>
                      {a.status.toLowerCase().replace('_', ' ')}
                    </span>
                    {a.status === 'APROVADA' && (
                      <><br /><span className={`caption ${prazoDePagamento(a.competencia) < hoje ? 'chip-erro' : 'suave'}`}>
                        pagar até {DATA(prazoDePagamento(a.competencia))}
                      </span></>
                    )}
                  </td>
                </tr>
              ))}
              {apuracoes.length === 0 && <tr><td colSpan={4} className="suave">Nenhuma apuração pendente.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Últimos pedidos</h2>
        <p className="caption suave" style={{ marginBottom: 12 }}>
          De toda a operação. "Nossa parte" é o valor inteiro na plataforma e o percentual
          retido no portal do professor.
        </p>
        <table className="tabela">
          <thead>
            <tr><th>Quando</th><th>Referência</th><th>Aluno</th><th>Onde</th><th>Produto</th><th>Valor</th><th>Nossa parte</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id}>
                <td className="apertado suave">{DATA(p.pagoEm ?? p.criadoEm)}</td>
                <td className="mono">{p.referencia}</td>
                <td>
                  <Link href={`/admin/usuarios/${p.alunoId}`} style={{ color: 'var(--primary-texto)' }}>{p.alunoNome}</Link>
                  <br /><span className="caption suave">{p.alunoEmail}</span>
                </td>
                <td>{p.portalNome ?? <span className="suave">plataforma</span>}</td>
                <td>{p.escopo === 'CATALOGO' ? 'Passe completo' : p.materiaNome}</td>
                <td className="apertado">{brl(p.centavos)}</td>
                <td className="apertado"><strong>{p.status === 'PAGO' ? brl(p.nossaParte) : '—'}</strong></td>
                <td><span className={`chip chip-sm ${CHIP_PEDIDO[p.status] ?? 'chip-neutra'}`}>{p.status.toLowerCase()}</span></td>
              </tr>
            ))}
            {pedidos.length === 0 && <tr><td colSpan={8} className="suave">Nenhum pedido ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Reembolsos</h2>
        <p className="caption suave" style={{ marginBottom: 12 }}>
          Arrependimento em 7 dias é obrigação legal (CDC, art. 49), não escolha — por isso
          o botão está no painel do aluno e o registro aqui é só conferência.
        </p>
        <table className="tabela">
          <thead><tr><th>Quando</th><th>Protocolo</th><th>Pedido</th><th>Aluno</th><th>Valor</th><th>Motivo</th></tr></thead>
          <tbody>
            {reembolsos.map((r) => (
              <tr key={r.id}>
                <td className="apertado suave">{DATA(r.criadoEm)}</td>
                <td className="mono">{r.protocolo}</td>
                <td className="mono">{r.referencia}</td>
                <td>{r.alunoNome}</td>
                <td className="apertado">{brl(r.centavos)}</td>
                <td className="suave">{r.motivo}</td>
              </tr>
            ))}
            {reembolsos.length === 0 && <tr><td colSpan={6} className="suave">Nenhum reembolso.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
