import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Icone, BotaoIcone } from '../../../ui.tsx';
import { FormDados, FormSenha, FormPapel, FormCortesia, FormContratoProfessor } from './FormsFicha.tsx';
import { FormApuracaoAdmin } from '../../portais/[id]/FormsFinanceiro.tsx';
import {
  acaoEditarUsuario, acaoSenhaProvisoria, acaoStatusConta, acaoDerrubarSessoes, acaoDefinirPapel,
  acaoConcederNaFicha, acaoEstenderNaFicha, acaoStatusLicencaNaFicha,
  acaoContratoProfessor, acaoAprovarApuracaoFicha, acaoRegistrarRepasseFicha, acaoPagarRepasseFicha,
} from '../acoes.ts';
import { historicoDeContratosDoProfessor } from '../../../../lib/professor-catalogo.ts';
import { listarApuracoes, prazoDePagamento } from '../../../../lib/apuracao.ts';
import { exigirTela, permissoesDaTela } from '../../guarda.ts';
import {
  buscarUsuario, outrosPerfis, licencasDaFicha, pedidosDaFicha, sessoesAbertas, auditoriaDoUsuario,
} from '../../../../lib/admin-usuarios.ts';
import { listarMateriasSimples } from '../../../../lib/admin.ts';
import { ROTULO_PAPEL, daEquipe, type Papel } from '../../../../lib/permissoes.ts';
import { brl } from '../../../../lib/precos.ts';

export const metadata: Metadata = { title: 'Usuário — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const MES = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const QUANDO = (d: Date) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const cpfComPontos = (s: string | null) =>
  s && s.length === 11 ? `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}` : null;

/** O que o pedido chama de "tipo de licença", pela origem gravada. */
const TIPO_LICENCA: Record<string, string> = {
  COMPRA: 'compra', TRIAL: 'teste gratuito', PROMOCIONAL: 'promocional',
  CORTESIA: 'cortesia', B2B: 'empresa (B2B)', MIGRACAO: 'migração',
};
const CHIP_CONTA: Record<string, string> = {
  ATIVA: 'chip-secundaria', INATIVA_AVISO: 'chip-terciaria',
  BLOQUEADA_INATIVIDADE: 'chip-erro', ENCERRADA: 'chip-erro',
};
const CHIP_PEDIDO: Record<string, string> = {
  PAGO: 'chip-secundaria', ABERTO: 'chip-neutra', EXPIRADO: 'chip-neutra',
  CANCELADO: 'chip-neutra', REEMBOLSADO: 'chip-erro',
};
const PROXIMOS_ESTADOS: Record<string, { status: string; rotulo: string; perigo?: boolean }[]> = {
  ATIVA: [{ status: 'BLOQUEADA_INATIVIDADE', rotulo: 'Bloquear', perigo: true }, { status: 'ENCERRADA', rotulo: 'Encerrar', perigo: true }],
  INATIVA_AVISO: [{ status: 'ATIVA', rotulo: 'Marcar como ativa' }, { status: 'BLOQUEADA_INATIVIDADE', rotulo: 'Bloquear', perigo: true }],
  BLOQUEADA_INATIVIDADE: [{ status: 'ATIVA', rotulo: 'Reativar' }, { status: 'ENCERRADA', rotulo: 'Encerrar', perigo: true }],
  ENCERRADA: [{ status: 'ATIVA', rotulo: 'Reabrir' }],
};

/**
 * A ficha — docs/plano-perfis-e-acessos.md, §3: dados cadastrais, os
 * portais que a pessoa opera, os outros perfis com o mesmo e-mail, as
 * licenças com o TIPO que o pedido nomeia, pedidos, sessões e auditoria.
 *
 * O que cada bloco deixa fazer vem da tabela de permissões, e o servidor
 * reconfere em cada ação. Abrir a ficha de alguém de um portal de
 * professor mostra o aviso de LGPD: a base é do professor, o acesso é
 * suporte.
 */
export default async function FichaUsuario(
  { params, searchParams }: {
    params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }>;
  },
) {
  const eu = await exigirTela('cadastros.ver');
  const { id } = await params;
  const { criado } = await searchParams;
  const usuarioId = Number(id);
  if (!Number.isInteger(usuarioId)) notFound();

  const [u, outros, licencas, pedidos, sessoes, auditoria, pode] = await Promise.all([
    buscarUsuario(usuarioId), outrosPerfis(usuarioId), licencasDaFicha(usuarioId),
    pedidosDaFicha(usuarioId), sessoesAbertas(usuarioId), auditoriaDoUsuario(usuarioId),
    permissoesDaTela('cadastros.agir', 'licencas.suporte', 'licencas.conceder', 'equipe.agir', 'financeiro.agir'),
  ]);
  if (!u) notFound();
  const [materias, contratos, apuracoes] = await Promise.all([
    listarMateriasSimples(u.portalId),
    u.portalId === 0 && u.papel === 'professor' ? historicoDeContratosDoProfessor(u.id) : Promise.resolve([]),
    u.portalId === 0 && u.papel === 'professor' ? listarApuracoes({ professorId: u.id }) : Promise.resolve([]),
  ]);

  const colaborador = u.portalTipo === 'EMPRESA' && u.papel === 'aluno';
  const rotuloPapel = colaborador ? 'Colaborador' : ROTULO_PAPEL[u.papel as Papel] ?? u.papel;
  const daPlataforma = u.portalId === 0;
  const podeTrocarPapel = pode['equipe.agir'] && daPlataforma && (u.papel === 'aluno' || daEquipe(u.papel));
  // Ninguém encerra a própria conta nem se rebaixa por esta tela.
  const souEu = eu.id === u.id;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">{u.nome}</h1>
          <p className="suave">
            {u.email} · {rotuloPapel} · {u.portalNome ? `${u.portalTipo === 'EMPRESA' ? 'empresa' : 'portal'} ${u.portalNome}` : 'plataforma'}
            {' '}· <span className={`chip chip-sm ${CHIP_CONTA[u.statusConta]}`}>{u.statusConta.toLowerCase().replace(/_/g, ' ')}</span>
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href="/admin/usuarios">Voltar à lista</Link>
        </div>
      </div>

      {criado && (
        <p className="alerta alerta-ok" role="status">
          <Icone nome="check_circle" tamanho={20} />
          {criado === 'ligado'
            ? (daEquipe(u.papel)
              ? 'A conta já existia com esse e-mail: o papel foi atualizado e a senha, trocada pela informada.'
              : 'Essa pessoa já tinha conta (a credencial é uma por e-mail): nasceu só o perfil aqui, '
                + 'e ela entra com a senha que já usa — a provisória informada foi ignorada.')
            : 'Conta criada. Passe a senha provisória por um canal seguro e peça a troca no primeiro acesso.'}
        </p>
      )}

      {u.portalTipo === 'PROFESSOR' && !daPlataforma && (
        <p className="aviso" style={{ marginBottom: 20 }}>
          <strong>Dados do professor.</strong> Esta conta está na base do portal {u.portalNome},
          de que o professor é o controlador (LGPD). O acesso da plataforma é para suporte e
          fica registrado em auditoria.
        </p>
      )}

      <div className="grade-2">
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 12 }}>Dados cadastrais</h2>
          {pode['cadastros.agir'] ? (
            <FormDados acao={acaoEditarUsuario} usuario={u} />
          ) : (
            <dl className="lista-dados">
              <div><dt>E-mail</dt><dd>{u.email}</dd></div>
              <div><dt>CPF</dt><dd className="mono">{cpfComPontos(u.cpf) ?? '—'}</dd></div>
              <div><dt>Nascimento</dt><dd>{DATA(u.nascimento)}</dd></div>
            </dl>
          )}
          <dl className="lista-dados" style={{ marginTop: 16 }}>
            <div><dt>Conta criada</dt><dd>{DATA(u.criadoEm)}</dd></div>
            <div><dt>Último acesso</dt><dd>{DATA(u.ultimoLoginEm)}</dd></div>
            <div><dt>Senha</dt><dd>{u.temSenha ? 'definida' : <span className="chip chip-sm chip-erro">sem senha</span>}</dd></div>
            {u.consentimentoResponsavelEm && (
              <div><dt>Aceite do responsável</dt><dd>{DATA(u.consentimentoResponsavelEm)}</dd></div>
            )}
            {colaborador && (
              <>
                <div><dt>Setor</dt><dd>{u.setorNome ?? '—'}</dd></div>
                <div><dt>Matrícula</dt><dd>{u.matricula ?? '—'}</dd></div>
              </>
            )}
          </dl>
        </div>

        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 12 }}>Vínculos</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>
            Onde esta conta existe e o que ela opera.
          </p>
          <ul className="lista-vinculos">
            <li>
              <span className="chip chip-sm chip-primaria">{rotuloPapel.toLowerCase()}</span>{' '}
              em <strong>{u.portalNome ?? 'Plataforma'}</strong>
              {u.portalMascara && <span className="suave mono"> · {u.portalMascara}</span>}
              <span className="caption suave"> (esta conta)</span>
            </li>
            {u.opera.map((o) => (
              <li key={`${o.como}-${o.portalId}`}>
                <span className="chip chip-sm chip-terciaria">{o.como === 'professor' ? 'professor de' : `${o.como} de`}</span>{' '}
                <Link href={`/admin/portais/${o.portalId}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{o.nome}</Link>
                <span className="caption suave"> · {o.tipo === 'EMPRESA' ? 'empresa' : 'portal de professor'}</span>
              </li>
            ))}
            {outros.map((o) => (
              <li key={o.id}>
                <span className="chip chip-sm chip-neutra">{o.portalTipo === 'EMPRESA' && o.papel === 'aluno' ? 'colaborador' : o.papel}</span>{' '}
                em <Link href={`/admin/usuarios/${o.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{o.portalNome}</Link>
                <span className="caption suave"> · mesmo e-mail, outra conta{o.statusConta !== 'ATIVA' ? ` (${o.statusConta.toLowerCase().replace(/_/g, ' ')})` : ''}</span>
              </li>
            ))}
          </ul>
          {outros.length > 0 && (
            <p className="dica" style={{ marginTop: 10 }}>
              A mesma conta, a mesma senha: o que muda de um portal para outro é o perfil —
              licenças, progresso, setor. Senha provisória e troca de e-mail valem para todos.
            </p>
          )}

          {podeTrocarPapel && !souEu && (
            <div style={{ marginTop: 16 }}>
              <FormPapel acao={acaoDefinirPapel} usuarioId={u.id} papelAtual={u.papel} />
            </div>
          )}
        </div>
      </div>

      {pode['cadastros.agir'] && (
        <div className="grade-2">
          <div className="cartao">
            <h2 className="headline-md" style={{ marginBottom: 12 }}>Senha</h2>
            <FormSenha acao={acaoSenhaProvisoria} usuarioId={u.id} />
          </div>
          <div className="cartao">
            <h2 className="headline-md" style={{ marginBottom: 12 }}>Estado da conta</h2>
            <p className="caption suave" style={{ marginBottom: 12 }}>
              Bloqueio e encerramento derrubam as sessões na hora; progresso e licenças ficam
              guardados (§6.5). {colaborador && 'Reabrir um colaborador passa pelo teto de contas do plano.'}
            </p>
            {souEu ? (
              <p className="suave">A sua própria conta se administra pelo perfil, não por aqui.</p>
            ) : (
              <div className="acoes-linha">
                {(PROXIMOS_ESTADOS[u.statusConta] ?? []).map((p) => (
                  <form action={acaoStatusConta} key={p.status}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="status" value={p.status} />
                    <button className={`btn btn-sm ${p.perigo ? 'btn-perigo' : 'btn-contorno'}`} type="submit">{p.rotulo}</button>
                  </form>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Licenças</h2>
        <p className="caption suave" style={{ marginBottom: 12 }}>
          Todas, com o tipo de cada uma: compra, teste gratuito, promocional, cortesia,
          liberada pela empresa (B2B) ou migração. Licenças somam; nenhuma anula outra (§6.3).
        </p>
        <table className="tabela">
          <thead>
            <tr><th>Tipo</th><th>Escopo</th><th>Origem</th><th>Vigência</th><th>Situação</th>{pode['licencas.suporte'] && <th>Ações</th>}</tr>
          </thead>
          <tbody>
            {licencas.map((l) => (
              <tr key={l.id}>
                <td><span className="chip chip-sm chip-neutra">{TIPO_LICENCA[l.origem] ?? l.origem.toLowerCase()}</span></td>
                <td>
                  {l.escopo === 'CATALOGO' ? 'Passe completo' : l.materiaNome}
                  {l.materiaPortalNome && <><br /><span className="caption suave">curso de {l.materiaPortalNome}</span></>}
                </td>
                <td className="suave">
                  {l.pedidoReferencia && <span className="mono">{l.pedidoReferencia}</span>}
                  {l.campanhaNome && <>campanha {l.campanhaNome}</>}
                  {l.atribuicaoObrigatoria !== null && (l.atribuicaoObrigatoria ? 'atribuição obrigatória' : 'atribuição')}
                  {!l.pedidoReferencia && !l.campanhaNome && l.atribuicaoObrigatoria === null && '—'}
                </td>
                <td className="apertado">{DATA(l.inicioEm)} → {DATA(l.fimEm)}</td>
                <td>
                  <span className={`chip chip-sm ${l.vigente ? 'chip-secundaria' : 'chip-neutra'}`}>
                    {l.vigente ? 'vigente' : l.status.toLowerCase().replace('_', ' ')}
                  </span>
                </td>
                {pode['licencas.suporte'] && (
                  <td>
                    <div className="acoes-linha">
                      <form action={acaoEstenderNaFicha}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="licencaId" value={l.id} />
                        <input type="hidden" name="dias" value="30" />
                        <BotaoIcone icone="more_time" rotulo="Estender por 30 dias" />
                      </form>
                      {l.status !== 'CANCELADA' && l.status !== 'EXPIRADA' && (
                        <form action={acaoStatusLicencaNaFicha}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="licencaId" value={l.id} />
                          <input type="hidden" name="status" value={l.status === 'SUSPENSA' ? 'ATIVA' : 'SUSPENSA'} />
                          <BotaoIcone icone={l.status === 'SUSPENSA' ? 'replay' : 'block'}
                            rotulo={l.status === 'SUSPENSA' ? 'Reativar' : 'Suspender'}
                            variante={l.status === 'SUSPENSA' ? 'contorno' : 'perigo'} />
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {licencas.length === 0 && (
              <tr><td colSpan={6}><div className="vazio">Nenhuma licença.</div></td></tr>
            )}
          </tbody>
        </table>
        {pode['licencas.conceder'] && u.papel === 'aluno' && (
          <div style={{ marginTop: 16 }}>
            <h3 className="headline-md" style={{ marginBottom: 10 }}>Conceder cortesia</h3>
            <FormCortesia acao={acaoConcederNaFicha} usuarioId={u.id} materias={materias} />
          </div>
        )}
      </div>

      {/* Professor do catálogo (db/046): o contrato e as apurações dele
          moram aqui, porque ele não tem portal — e a ficha é o único
          lugar que já reúne tudo o que é da pessoa. */}
      {daPlataforma && u.papel === 'professor' && u.opera.every((o) => o.como !== 'professor') && (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Professor do catálogo</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>
            Vende no catálogo da plataforma, sem portal. A comissão é gravada em cada venda pelo
            contrato vigente no ato; o repasse mensal segue o ciclo do §5.6.1, por Pix.
          </p>
          {contratos.length === 0 ? (
            <p className="suave" style={{ marginBottom: 12 }}>Sem contrato de catálogo — esta conta é professor, mas não vende no catálogo.</p>
          ) : (
            <table className="tabela" style={{ marginBottom: 16 }}>
              <thead><tr><th>Vigência</th><th>Comissão</th><th>Chave Pix</th><th>Aceite</th><th>Registrado por</th></tr></thead>
              <tbody>
                {contratos.map((c) => (
                  <tr key={c.id}>
                    <td className="apertado">{DATA(c.vigenteDe)} → {c.vigenteAte ? DATA(c.vigenteAte) : 'em vigor'}</td>
                    <td className="apertado"><strong>{Number(c.comissaoPp)}%</strong></td>
                    <td className="mono">{c.chavePix ?? '—'}</td>
                    <td className="apertado">{DATA(c.aceitoEm)}</td>
                    <td className="caption">{c.registradoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pode['financeiro.agir'] && (
            <FormContratoProfessor acao={acaoContratoProfessor} usuarioId={u.id}
              atualPp={contratos.find((c) => c.vigenteAte === null) ? Number(contratos.find((c) => c.vigenteAte === null)!.comissaoPp) : null} />
          )}
          {apuracoes.length > 0 && (
            <>
              <h3 className="headline-md" style={{ margin: '20px 0 8px' }}>Apurações</h3>
              <table className="tabela">
                <thead><tr><th>Competência</th><th>Vendas</th><th>Reembolsos</th><th>Comissão</th><th>Situação</th><th>Nota</th>{pode['financeiro.agir'] && <th>Ações</th>}</tr></thead>
                <tbody>
                  {apuracoes.map((a) => (
                    <tr key={a.id}>
                      <td>{MES(a.competencia)}</td>
                      <td className="apertado">{brl(a.centavosVendas)}</td>
                      <td className="apertado">{brl(a.centavosReembolsos)}</td>
                      <td className="apertado"><strong>{brl(a.centavosComissao)}</strong></td>
                      <td>
                        <span className={`chip chip-sm ${a.status === 'PAGA' ? 'chip-secundaria' : a.status === 'CONTESTADA' ? 'chip-erro' : 'chip-neutra'}`}>
                          {a.status.toLowerCase().replace('_', ' ')}
                        </span>
                        {a.status === 'APROVADA' && <><br /><span className={`caption ${prazoDePagamento(a.competencia) < new Date() ? 'chip-erro' : 'suave'}`}>pagar até {DATA(prazoDePagamento(a.competencia))}</span></>}
                        {a.contestacao && <><br /><span className="caption">“{a.contestacao}”</span></>}
                      </td>
                      <td className="mono">{a.nfNumero ?? '—'}</td>
                      {pode['financeiro.agir'] && (
                        <td>
                          <FormApuracaoAdmin aprovar={acaoAprovarApuracaoFicha} pagar={acaoRegistrarRepasseFicha} pagarGateway={acaoPagarRepasseFicha}
                            portalId={0} apuracaoId={a.id} status={a.status} contestacao={a.contestacao} temNota={Boolean(a.nfNumero)} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Quem chega à ficha tem `cadastros.ver`, e o pedido do suporte
          ("o pagamento entrou?") é o motivo de o bloco existir aqui. */}
      {(
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Pedidos e pagamentos</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>
            Só leitura — para responder "o pagamento entrou?". Reembolso é pedido pelo próprio
            aluno no painel dele (CDC, art. 49).
          </p>
          <table className="tabela">
            <thead><tr><th>Quando</th><th>Referência</th><th>Produto</th><th>Meio</th><th>Valor</th><th>Situação</th></tr></thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td className="apertado suave">{DATA(p.pagoEm ?? p.criadoEm)}</td>
                  <td className="mono">{p.referencia}</td>
                  <td>{p.escopo === 'CATALOGO' ? 'Passe completo' : p.materiaNome} <span className="suave">· {p.periodo}</span></td>
                  <td className="suave">{p.meio.toLowerCase().replace('_', ' ')}</td>
                  <td className="apertado">{brl(p.centavos)}</td>
                  <td>
                    <span className={`chip chip-sm ${CHIP_PEDIDO[p.status] ?? 'chip-neutra'}`}>{p.status.toLowerCase()}</span>
                    {p.reembolsoProtocolo && <><br /><span className="caption suave mono">{p.reembolsoProtocolo}</span></>}
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && <tr><td colSpan={6}><div className="vazio">Nenhum pedido.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="grade-2">
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Sessões abertas</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>
            Aparelhos em que a pessoa está conectada. Derrubar obriga a entrar de novo em todos.
          </p>
          <table className="tabela">
            <thead><tr><th>Desde</th><th>Expira</th><th>Navegador</th></tr></thead>
            <tbody>
              {sessoes.map((s) => (
                <tr key={s.id}>
                  <td className="apertado">{QUANDO(s.criadaEm)}</td>
                  <td className="apertado suave">{DATA(s.expiraEm)}</td>
                  <td className="caption suave">{s.userAgent ?? '—'}</td>
                </tr>
              ))}
              {sessoes.length === 0 && <tr><td colSpan={3} className="suave">Nenhuma sessão aberta.</td></tr>}
            </tbody>
          </table>
          {pode['cadastros.agir'] && sessoes.length > 0 && !souEu && (
            <form action={acaoDerrubarSessoes} style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={u.id} />
              <button className="btn btn-contorno btn-sm" type="submit">Derrubar todas as sessões</button>
            </form>
          )}
        </div>

        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Auditoria</h2>
          <p className="caption suave" style={{ marginBottom: 12 }}>O que foi feito nesta conta, por quem.</p>
          {auditoria.length === 0 ? (
            <div className="vazio">Nada registrado.</div>
          ) : (
            <table className="tabela">
              <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th></tr></thead>
              <tbody>
                {auditoria.map((a) => (
                  <tr key={a.id}>
                    <td className="apertado suave">{QUANDO(a.criadoEm)}</td>
                    <td className="caption">{a.ator}</td>
                    <td>
                      <span className="chip chip-sm chip-neutra">{a.acao}</span>
                      <br /><span className="caption suave mono">{JSON.stringify(a.detalhe)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
