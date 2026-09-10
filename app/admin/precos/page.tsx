import Link from 'next/link';
import type { Metadata } from 'next';
import FormPreco from './FormPreco.tsx';
import { acaoAlterarPreco } from '../acoes.ts';
import { brl, PERIODOS, MESES, porMes, dataBR } from '../../../lib/precos.ts';
import { historicoDePrecos, tabelaVigente } from '../../../lib/precos-consultas.ts';
import { PORTAL_PLATAFORMA } from '../../../lib/portal.ts';
import { permissoesDaTela } from '../guarda.ts';

export const metadata: Metadata = { title: 'Preços — Administração' };

export default async function Precos() {
  // A administração é a retaguarda da plataforma (§5.9). O painel do
  // professor, com os preços do portal dele, é trabalho à parte (§5.10).
  const [historico, tabela, pode] = await Promise.all([
    historicoDePrecos(), tabelaVigente(PORTAL_PLATAFORMA), permissoesDaTela('financeiro.agir'),
  ]);
  const vigentes = historico.filter((h) => h.vigenteAte === null);
  const passados = historico.filter((h) => h.vigenteAte !== null);

  return (
    <>
      <h1 className="headline-lg">Tabela de valores</h1>
      <p className="suave">
        O preço novo vale a partir da data que você escolher e <strong>não afeta licença já
        vigente</strong>. O anterior não é apagado: vira histórico. Esta é a tabela da
        plataforma; a de cada portal de professor fica em{' '}
        <Link href="/admin/portais" style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
          Portais de professor
        </Link> (§5.10).
      </p>

      <div className="cartao">
        <h2 className="headline-md">Vigente hoje</h2>
        <table className="tabela">
          <thead>
            <tr><th>Produto</th><th>Período</th><th>Valor</th><th>Por mês</th><th>Desde</th></tr>
          </thead>
          <tbody>
            {(['MATERIA', 'CATALOGO'] as const).map((produto) =>
              PERIODOS.map((periodo) => {
                const linha = vigentes.find((v) => v.produto === produto && v.periodo === periodo);
                const centavos = tabela[produto][periodo];
                return (
                  <tr key={produto + periodo}>
                    <td>{produto === 'MATERIA' ? 'Curso avulso' : 'Passe completo'}</td>
                    <td>{periodo}</td>
                    <td><strong>{centavos ? brl(centavos) : '—'}</strong></td>
                    <td className="suave">
                      {centavos && MESES[periodo] > 1 ? `${brl(porMes(centavos, periodo))}/mês` : '—'}
                    </td>
                    <td className="suave apertado">{dataBR(linha?.vigenteDe ?? null)}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>

      {/* O financeiro lê a tabela e não a altera (lib/permissoes.ts):
          o formulário some, e a ação recusa mesmo que ele apareça. */}
      {pode['financeiro.agir'] && (
        <div className="cartao">
          <h2 className="headline-md">Alterar um preço</h2>
          <FormPreco acao={acaoAlterarPreco} />
        </div>
      )}

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md">Histórico</h2>
        {passados.length === 0 ? (
          <div className="vazio">Nenhum preço foi alterado ainda.</div>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>Produto</th><th>Período</th><th>Valor</th><th>Vigeu de</th><th>até</th><th>Quem</th></tr>
            </thead>
            <tbody>
              {passados.map((h) => (
                <tr key={h.id}>
                  <td>{h.produto === 'MATERIA' ? 'Curso' : 'Passe'}</td>
                  <td>{h.periodo}</td>
                  <td>{brl(h.centavos)}</td>
                  <td className="suave apertado">{dataBR(h.vigenteDe)}</td>
                  <td className="suave apertado">{dataBR(h.vigenteAte)}</td>
                  <td className="suave">{h.criadoPor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
