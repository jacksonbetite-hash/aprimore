import Link from 'next/link';
import { Icone } from '../componentes.tsx';
import FormPerfil from '../FormPerfil.tsx';
import { acaoSalvarPerfil } from '../acoes-perfil.ts';
import { acaoCancelar, acaoReembolsar } from '../acoes-comerciais.ts';
import { licencasDo } from '../../lib/sessao.ts';
import { portalIdAtual } from '../../lib/portal-consultas.ts';
import { lerPerfil } from '../../lib/perfil.ts';
import { pedidosDo, assinaturasDo } from '../../lib/checkout.ts';
import { licencaVigente } from '../../lib/licenca.ts';
import { brl } from '../../lib/precos.ts';
import type { Aluno } from '../../lib/sessao.ts';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const ROTULO_MEIO: Record<string, string> = {
  PIX: 'Pix', CARTAO: 'Cartão de crédito', PIX_AUTOMATICO: 'Pix Automático',
};

/**
 * O conteúdo de "Minha conta" — sem casca nenhuma em volta.
 *
 * Mora fora da página porque a MESMA tela aparece em dois lugares, com
 * molduras diferentes: em `/conta`, na plataforma e no portal de um
 * professor, com o menu do aluno; e em `/painel/conta`, dentro do painel
 * do colaborador, com o menu da empresa.
 *
 * Era essa duplicidade que produzia o defeito relatado: o colaborador
 * abria a própria conta e o menu inteiro trocava para o da PLATAFORMA
 * — com caderno de erros, vade-mécum e planos de venda, nada disso
 * existente na empresa. Com o conteúdo aqui, cada casca fica com o seu
 * menu e a tela é uma só.
 */
export default async function ConteudoConta({ aluno }: { aluno: Aluno }) {
  const [licencas, pedidos, assinaturas, perfil] = await Promise.all([
    licencasDo(aluno.id), pedidosDo(aluno.id), assinaturasDo(aluno.id),
    lerPerfil(aluno.id, await portalIdAtual()),
  ]);
  const agora = new Date();

  return (
    <>
      {/* Nome, e-mail e senha: a conta de acesso. Antes só se podia
          olhar — corrigir o próprio nome exigia suporte. */}
      {perfil && (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 16 }}>Meus dados de acesso</h2>
          <FormPerfil acao={acaoSalvarPerfil} nome={perfil.nome} email={perfil.email}
                      temSenha={perfil.temSenha} />
        </div>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Assinaturas</h2>
        {assinaturas.length === 0 ? (
          <p className="vazio">
            Nenhuma assinatura. Compras via Pix avulso não renovam sozinhas — você paga
            de novo quando quiser.
          </p>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>O quê</th><th>Plano</th><th>Meio</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {assinaturas.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.escopo === 'CATALOGO' ? 'Passe completo' : a.materiaNome}</strong></td>
                  <td className="suave">{a.periodo}</td>
                  <td className="suave">{ROTULO_MEIO[a.meio] ?? a.meio}</td>
                  <td>
                    <span className={`chip ${a.status === 'ATIVA' ? 'chip-secundaria' : 'chip-neutra'}`}>
                      {a.status.toLowerCase()}
                    </span>
                    {a.protocolo && (
                      <div className="caption suave">protocolo {a.protocolo}</div>
                    )}
                    {a.status === 'ATIVA' && a.proximaCobranca && (
                      <div className="caption suave">próxima em {DATA(a.proximaCobranca)}</div>
                    )}
                  </td>
                  <td>
                    {a.status === 'ATIVA' && (
                      <form action={acaoCancelar}>
                        <input type="hidden" name="assinaturaId" value={a.id} />
                        <button className="btn btn-contorno btn-sm" type="submit">Cancelar</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="caption suave" style={{ marginTop: 14 }}>
          Cancelar leva dois cliques e gera protocolo. O acesso continua até o fim do
          período já pago — sem reembolso proporcional depois dos 7 dias legais.
        </p>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Pedidos e recibos</h2>
        {pedidos.length === 0 ? (
          <p className="vazio">Nenhuma compra ainda.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>Pedido</th><th>O quê</th><th>Valor</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong className="apertado">{p.referencia}</strong>
                    <div className="caption suave">{DATA(p.criadoEm)}</div>
                  </td>
                  <td>{p.escopo === 'CATALOGO' ? 'Passe completo' : p.materiaNome}</td>
                  <td className="apertado">{brl(p.centavos)}</td>
                  <td>
                    <span className={`chip ${
                      p.status === 'PAGO' ? 'chip-secundaria'
                      : p.status === 'ABERTO' ? 'chip-terciaria' : 'chip-neutra'}`}>
                      {p.status.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <div className="acoes-linha">
                      {p.status === 'ABERTO' && (
                        <Link className="btn btn-primario btn-sm" href={`/checkout/${p.referencia}`}>
                          Pagar
                        </Link>
                      )}
                      {p.podeReembolsar && (
                        <form action={acaoReembolsar}>
                          <input type="hidden" name="pedidoId" value={p.id} />
                          <button className="btn btn-contorno btn-sm" type="submit">
                            Pedir reembolso
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="caption suave" style={{ marginTop: 14 }}>
          <Icone nome="replay" tamanho={16} /> Arrependimento em 7 dias: devolução integral,
          sem justificativa, mesmo que você já tenha assistido (CDC, art. 49).
        </p>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Licenças</h2>
        {licencas.map((l) => {
          const vigente = licencaVigente(
            { ...l, inicioEm: new Date(l.inicioEm), fimEm: new Date(l.fimEm) }, agora,
          );
          return (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--surface-container)', flexWrap: 'wrap' }}>
              <span>
                <strong className="label-md">
                  {l.escopo === 'CATALOGO' ? 'Passe completo' : l.materiaNome}
                </strong>
                <div className="caption suave">
                  Origem: {l.origem.toLowerCase()} · Vence em {DATA(l.fimEm)}
                </div>
              </span>
              <span className={`chip ${vigente ? 'chip-secundaria' : 'chip-neutra'}`}>
                {vigente ? 'vigente' : l.status.toLowerCase()}
              </span>
            </div>
          );
        })}
        {licencas.length === 0 && <p className="vazio">Nenhuma licença ainda.</p>}
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 8 }}>Seus dados (LGPD)</h2>
        <p className="suave" style={{ fontSize: 15, marginBottom: 16 }}>
          Você pode pedir acesso, correção, portabilidade e exclusão dos seus dados a
          qualquer momento. Não guardamos seu CPF no cadastro — só na compra, para nota
          fiscal e marca d'água.
        </p>
        <div className="acoes-linha">
          <span className="btn btn-contorno btn-sm">Exportar meus dados</span>
          <span className="btn btn-contorno btn-sm">Excluir minha conta</span>
        </div>
        <p className="caption suave" style={{ marginTop: 12 }}>
          O portal do titular (§12.1) entra junto com o encarregado nomeado.
        </p>
      </div>
    </>
  );
}
