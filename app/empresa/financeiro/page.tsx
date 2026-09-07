import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../../ui.tsx';
import { acaoMedirMeuConsumo } from '../acoes.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa, ocupacaoDeContas, planosDeEmpresa } from '../../../lib/empresa.ts';
import { consumoDaCompetencia, listarFaturas } from '../../../lib/portal-financeiro.ts';
import { listarPlanos } from '../../../lib/admin-portais.ts';
import { brl } from '../../../lib/precos.ts';
import { GB, calcularExcedente, competenciaDe } from '../../../lib/portal.ts';

export const metadata: Metadata = { title: 'Financeiro — Painel da empresa' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const MES = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const gb = (bytes: number) => (bytes / GB).toFixed(bytes < GB / 10 ? 3 : 1) + ' GB';
const CHIP: Record<string, string> = {
  PAGA: 'chip-secundaria', FECHADA: 'chip-terciaria', EM_ATRASO: 'chip-erro',
  ABERTA: 'chip-neutra', CANCELADA: 'chip-neutra',
};

/**
 * O financeiro da empresa — §5.11, etapa 7.
 *
 * Metade do do professor, e é essa a diferença do produto: a empresa
 * PAGA, não recebe. Não há extrato de vendas, subconta, split nem
 * apuração — há mensalidade, excedente de armazenamento e o teto de
 * contas, que é o que ela realmente compra.
 */
export default async function FinanceiroDaEmpresa() {
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const atual = competenciaDe(new Date());
  const [consumo, faturas, planos, todosPlanos, ocupacao] = await Promise.all([
    consumoDaCompetencia(portal.id, atual), listarFaturas(portal.id),
    planosDeEmpresa(), listarPlanos(), ocupacaoDeContas(portal.id),
  ]);
  const plano = todosPlanos.find((p) => p.nome === portal.planoNome);
  const excedente = plano
    ? calcularExcedente(consumo.bytesArmazenados, consumo.bytesTrafegados, plano) : null;
  const emAberto = faturas.filter((f) => f.status !== 'PAGA' && f.status !== 'CANCELADA');
  const maior = planos.filter((p) => p.nome !== portal.planoNome
    && p.licencaMensalCentavos > (portal.contrato?.licencaMensalCentavos ?? 0));

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Financeiro</h1>
          <p className="suave">
            Plano {portal.planoNome ?? '—'}
            {portal.contrato && ` · ${brl(portal.contrato.licencaMensalCentavos)}/mês`}
          </p>
        </div>
      </div>

      {portal.status === 'SUSPENSO' && (
        <p className="alerta alerta-erro">
          <strong>O portal está suspenso por fatura em atraso.</strong> Quem já tem trilha
          liberada continua estudando; o cadastro de gente nova fica travado até o pagamento.
        </p>
      )}

      <div className="grade-4" style={{ marginBottom: 24 }}>
        <div className="cartao">
          <span className="label-md suave">MENSALIDADE</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
            {portal.contrato ? brl(portal.contrato.licencaMensalCentavos) : '—'}
          </div>
          <p className="caption suave">
            contrato aceito em {DATA(portal.contrato?.aceitoEm ?? null)}
          </p>
        </div>
        <div className="cartao">
          <span className="label-md suave">PESSOAS NO PLANO</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
            {ocupacao.usadas}
            {ocupacao.limite !== null && (
              <span className="suave" style={{ fontSize: 16, fontWeight: 600 }}> / {ocupacao.limite}</span>
            )}
          </div>
          <p className="caption suave">
            {ocupacao.livres === null ? 'sem teto' : `${ocupacao.livres} vaga(s) livre(s)`}
          </p>
        </div>
        <div className="cartao">
          <span className="label-md suave">CONSUMO · {MES(new Date(atual))}</span>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>
            Vídeo: <strong>{gb(consumo.bytesArmazenados)}</strong>
            {plano && <span className="suave"> / {plano.gbArmazenamento} GB</span>}<br />
            Exibição: <strong>{gb(consumo.bytesTrafegados)}</strong>
            {plano && <span className="suave"> / {plano.gbBandaMes} GB</span>}
          </div>
          <form action={acaoMedirMeuConsumo} style={{ marginTop: 6 }}>
            <button className="btn btn-contorno btn-sm" type="submit">Medir agora</button>
          </form>
        </div>
        <div className="cartao">
          <span className="label-md suave">EXCEDENTE PREVISTO</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
            {excedente ? brl(excedente.centavos) : brl(0)}
          </div>
          <p className="caption suave">
            {excedente && excedente.gbExcedentes > 0
              ? `${excedente.gbExcedentes} GB acima da cota`
              : 'dentro da cota do plano'}
          </p>
        </div>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>
          <Icone nome="receipt_long" /> Faturas
        </h2>
        <table className="tabela">
          <thead>
            <tr><th>Competência</th><th>Mensalidade</th><th>Excedente</th><th>Ajustes</th><th>Total</th><th>Vencimento</th><th>Situação</th><th></th></tr>
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
                <td>
                  {f.referencia && f.status !== 'PAGA' && (
                    <Link className="btn btn-primario btn-sm" href={`/empresas/pagamento/${f.referencia}`}>Pagar</Link>
                  )}
                </td>
              </tr>
            ))}
            {faturas.length === 0 && <tr><td colSpan={8} className="suave">Nenhuma fatura ainda.</td></tr>}
          </tbody>
        </table>
        {emAberto.length > 0 && (
          <p className="caption suave" style={{ marginTop: 12 }}>
            Fatura em atraso por mais de 10 dias suspende o portal: quem já tem trilha
            liberada continua, mas o cadastro de gente nova para.
          </p>
        )}
      </div>

      {maior.length > 0 && (
        <div className="cartao" style={{ marginBottom: 0 }}>
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Precisa de mais vagas?</h2>
          <p className="caption suave" style={{ marginBottom: 16 }}>
            O teto de pessoas é o que muda entre os planos. A troca vale a partir da próxima
            competência e é feita pelo suporte — fale com a gente pelo contato do rodapé.
          </p>
          <div className="grade-3">
            {maior.map((p) => (
              <div className="cartao" key={p.id}>
                <h3>{p.nome}</h3>
                <div className="preco" style={{ marginTop: 8 }}>{brl(p.licencaMensalCentavos)}<small>/mês</small></div>
                <p className="caption suave">
                  até {p.limiteContas ?? 'ilimitadas'} pessoas · {p.gbArmazenamento} GB de vídeo
                  {p.centavosDominioProprio === 0 && ' · domínio próprio incluído'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
