import FormsApuracao from '../FormsApuracao.tsx';
import ItensApuracao from '../ItensApuracao.tsx';
import FormPix from './FormPix.tsx';
import { acaoContestarCatalogo, acaoInformarNotaCatalogo, acaoChavePix } from '../acoes-catalogo.ts';
import { listarApuracoes, itensDaApuracao, prazoDePagamento } from '../../../lib/apuracao.ts';
import { contratoVigente, vendasDoProfessor, resumoDoProfessor } from '../../../lib/professor-catalogo.ts';
import { brl } from '../../../lib/precos.ts';
import type { Aluno } from '../../../lib/sessao.ts';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const MES = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

/**
 * O financeiro do professor do catálogo (etapa 5): contrato, chave Pix,
 * o extrato venda a venda e as apurações — o mesmo ciclo do §5.6.1 que
 * o portal usa, sem faturas e sem consumo (o vídeo é nosso).
 */
export default async function FinanceiroCatalogo({ u }: { u: Aluno }) {
  const [contrato, vendas, resumo, apuracoes] = await Promise.all([
    contratoVigente(u.id), vendasDoProfessor(u.id), resumoDoProfessor(u.id), listarApuracoes({ professorId: u.id }),
  ]);
  const itens = new Map(await Promise.all(apuracoes.map(async (a) => [a.id, await itensDaApuracao(a.id)] as const)));

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Financeiro</h1>
          <p className="suave">Cada número aqui tem uma venda por trás — nada é estimado.</p>
        </div>
      </div>

      <div className="grade-3" style={{ marginBottom: 24 }}>
        <div className="cartao">
          <span className="label-md suave">VENDIDO NO CATÁLOGO</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{brl(resumo.vendido)}</div>
          <p className="caption suave">{resumo.alunos} aluno(s) compraram os seus cursos</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">SUA COMISSÃO (BRUTA)</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>{brl(resumo.aReceber)}</div>
          <p className="caption suave">{Number(contrato?.comissaoPp ?? 0)}% sobre cada venda paga · fecha mês a mês</p>
        </div>
        <div className="cartao">
          <span className="label-md suave">CONTRATO</span>
          <div style={{ fontSize: 15, lineHeight: 1.7 }}>
            {contrato ? <>{Number(contrato.comissaoPp)}% · desde {DATA(contrato.vigenteDe)}</> : 'sem contrato vigente'}
          </div>
          <p className="caption suave">{contrato?.chavePix ? `Pix: ${contrato.chavePix}` : 'sem chave Pix cadastrada'}</p>
        </div>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Chave Pix do repasse</h2>
        <p className="caption suave" style={{ marginBottom: 12 }}>
          É para ela que a plataforma manda a comissão aprovada, até o dia 15 do mês seguinte,
          depois da sua nota fiscal.
        </p>
        <FormPix acao={acaoChavePix} atual={contrato?.chavePix ?? ''} />
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Repasse da comissão</h2>
        <p className="suave" style={{ marginBottom: 16 }}>
          Fechado mês a mês. Você tem 5 dias para contestar o extrato; aprovado, emite a nota no
          valor e a plataforma paga até o dia 15. Abaixo de R$ 100, o saldo acumula.
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
                  <FormsApuracao contestar={acaoContestarCatalogo} informarNota={acaoInformarNotaCatalogo} apuracaoId={a.id} status={a.status} />
                </td>
              </tr>
            ))}
            {apuracoes.map((a) => (
              <tr key={`itens-${a.id}`}><td colSpan={7} style={{ paddingTop: 0 }}><ItensApuracao itens={itens.get(a.id) ?? []} /></td></tr>
            ))}
            {apuracoes.length === 0 && <tr><td colSpan={7} className="suave">Nenhuma competência apurada ainda — a primeira fecha no dia 1 do mês seguinte à primeira venda.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Vendas dos seus cursos</h2>
        <p className="caption suave" style={{ marginBottom: 12 }}>Venda a venda, com o percentual gravado no ato — não o do contrato de hoje.</p>
        <table className="tabela">
          <thead><tr><th>Pago em</th><th>Referência</th><th>Curso</th><th>Valor</th><th>Comissão</th><th>A receber</th><th>Situação</th></tr></thead>
          <tbody>
            {vendas.map((v) => (
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
            {vendas.length === 0 && <tr><td colSpan={7} className="suave">Nenhuma venda ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
