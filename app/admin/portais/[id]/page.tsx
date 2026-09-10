import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { FormPortal, FormSite, FormContrato } from '../Formularios.tsx';
import FormPreco from '../../precos/FormPreco.tsx';
import { acaoEditarPortal, acaoEditarSite, acaoRegistrarContrato, acaoRegistrarAceite } from '../acoes.ts';
import { acaoAlterarPreco } from '../../acoes.ts';
import {
  buscarPortal, listarPlanos, listarProfessores, historicoDeContratos,
  type Personalizacao,
} from '../../../../lib/admin-portais.ts';
import { historicoDePrecos, tabelaVigente } from '../../../../lib/precos-consultas.ts';
import { brl, PERIODOS, dataBR } from '../../../../lib/precos.ts';
import { PORTAL_PLATAFORMA } from '../../../../lib/portal.ts';
import { permissoesDaTela } from '../../guarda.ts';

export const metadata: Metadata = { title: 'Portal — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

export default async function Portal(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ criado?: string }>;
  },
) {
  const { id } = await params;
  const { criado } = await searchParams;
  const portalId = Number(id);
  if (!Number.isInteger(portalId) || portalId === PORTAL_PLATAFORMA) notFound();

  const [portal, planos, professores, contratos, precos, tabela, pode] = await Promise.all([
    buscarPortal(portalId), listarPlanos(), listarProfessores(),
    historicoDeContratos(portalId), historicoDePrecos(portalId), tabelaVigente(portalId),
    permissoesDaTela('cadastros.agir', 'financeiro.agir'),
  ]);
  if (!portal) notFound();

  const vigente = contratos.find((c) => c.vigenteAte === null);
  const personalizacao = (portal.personalizacao ?? {}) as Personalizacao;
  const precosVigentes = precos.filter((p) => p.vigenteAte === null);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">{portal.nomeExibicao}</h1>
          <p className="suave">
            <code>{portal.mascara}.aprimoreosaber.com.br</code> · {portal.status.toLowerCase()} ·{' '}
            {portal.materias} curso(s) · {portal.alunos} aluno(s)
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href={`/admin/portais/${portal.id}/alunos`}>Alunos</Link>
          <Link className="btn btn-contorno" href={`/admin/portais/${portal.id}/financeiro`}>Financeiro</Link>
          <Link className="btn btn-contorno" href={`/admin/cursos?portal=${portal.id}`}>
            Acervo do portal
          </Link>
          <Link className="btn btn-contorno" href="/admin/portais">Voltar</Link>
        </div>
      </div>

      {criado && (
        <p className="alerta alerta-ok" role="status">
          Portal criado em rascunho. Registre o contrato e o aceite antes de publicá-lo.
        </p>
      )}

      {!portal.contratoAceito && (
        <p className="alerta alerta-erro">
          <strong>Sem contrato aceito, este portal não vai ao ar (§5.6).</strong> Registre as
          condições abaixo e marque o aceite do professor.
        </p>
      )}

      {/* Quem só vê (financeiro) recebe os dados como texto; os
          formulários são de quem cadastra e de quem mexe em dinheiro. */}
      {pode['cadastros.agir'] ? (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados do portal</h2>
          <FormPortal acao={acaoEditarPortal} planos={planos} professores={professores}
            portal={portal} />
        </div>
      ) : (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 12 }}>Dados do portal</h2>
          <p>
            <strong>{portal.nomeExibicao}</strong> · {portal.tipo === 'EMPRESA' ? 'empresa' : 'professor'} ·
            responsável {portal.professorNome ?? '—'} ({portal.professorEmail ?? '—'})
          </p>
        </div>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>A página do professor</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Abertura, acervo, oferta, prova e rodapé legal — as cinco seções fixas do §5.10. O
          acervo e a oferta são montados a partir do catálogo e da tabela de preços; o que se
          escreve aqui é o texto das outras seções.
        </p>
        {pode['cadastros.agir']
          ? <FormSite acao={acaoEditarSite} portalId={portal.id} personalizacao={personalizacao} />
          : <p className="suave">Edição reservada a quem cadastra.</p>}
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Preços do portal</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Cada portal tem a própria tabela de valores, com a mesma vigência do §5.9. O curso
          avulso é a licença de uma matéria do acervo dele; o passe completo dá acesso a todo o
          acervo <strong>daquele portal</strong> — o passe da plataforma não alcança este
          acervo, e vice-versa.
        </p>
        <table className="tabela" style={{ marginBottom: 24 }}>
          <thead>
            <tr><th>Produto</th><th>Período</th><th>Valor</th><th>Desde</th></tr>
          </thead>
          <tbody>
            {(['MATERIA', 'CATALOGO'] as const).map((produto) =>
              PERIODOS.map((periodo) => {
                const linha = precosVigentes.find(
                  (p) => p.produto === produto && p.periodo === periodo);
                const centavos = tabela[produto][periodo];
                return (
                  <tr key={produto + periodo}>
                    <td>{produto === 'MATERIA' ? 'Curso avulso' : 'Passe do portal'}</td>
                    <td>{periodo}</td>
                    <td><strong>{centavos ? brl(centavos) : '—'}</strong></td>
                    <td className="suave apertado">{dataBR(linha?.vigenteDe ?? null)}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
        {pode['financeiro.agir'] && <>
          <h3 className="headline-md" style={{ marginBottom: 16 }}>Alterar um preço</h3>
          <FormPreco acao={acaoAlterarPreco} portalId={portal.id} rotuloCatalogo="Passe do portal" />
        </>}
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Contrato</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Licença mensal fixa mais percentual sobre as vendas. O acréscimo por indicação incide
          uma única vez, na primeira compra daquele aluno neste portal (§5.10.1) — nós entregamos
          o aluno, e por isso cobramos a mais na conversão; a relação daí em diante é dele.
        </p>

        {contratos.length === 0 ? (
          <div className="vazio">Nenhum contrato registrado.</div>
        ) : (
          <table className="tabela" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>Vigência</th><th>Licença/mês</th><th>Percentual</th>
                <th>Clique</th><th>Retenção</th><th>Aceite</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => (
                <tr key={c.id}>
                  <td className="apertado">
                    {DATA(c.vigenteDe)} → {c.vigenteAte ? DATA(c.vigenteAte) : 'em vigor'}
                  </td>
                  <td>{brl(c.licencaMensalCentavos)}</td>
                  <td className="apertado">
                    {c.percentualBase}% <span className="suave">+{c.acrescimoIndicacaoPp} p.p.</span>
                  </td>
                  <td className="apertado">{c.validadeCliqueDias}d</td>
                  <td className="apertado">
                    {c.diasRetencao}d
                    {Number(c.percentualReserva) > 0 && ` + ${c.percentualReserva}%`}
                  </td>
                  <td>
                    {c.aceitoEm ? (
                      <span className="chip chip-sm chip-secundaria">
                        {DATA(c.aceitoEm)}{c.aceitoIp ? ` · ${c.aceitoIp}` : ''}
                      </span>
                    ) : c.vigenteAte === null && pode['financeiro.agir'] ? (
                      <form action={acaoRegistrarAceite}>
                        <input type="hidden" name="portalId" value={portal.id} />
                        <input type="hidden" name="contratoId" value={c.id} />
                        <button className="btn btn-primario btn-sm" type="submit">
                          Registrar aceite
                        </button>
                      </form>
                    ) : <span className="suave">não aceito</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pode['financeiro.agir'] && <><h3 className="headline-md" style={{ marginBottom: 16 }}>Novo contrato</h3>
        <FormContrato acao={acaoRegistrarContrato} portalId={portal.id} planos={planos}
          atual={vigente ? {
            planoId: vigente.planoId,
            licencaMensalCentavos: vigente.licencaMensalCentavos,
            percentualBase: vigente.percentualBase,
            acrescimoIndicacaoPp: vigente.acrescimoIndicacaoPp,
            validadeCliqueDias: vigente.validadeCliqueDias,
            diasRetencao: vigente.diasRetencao,
            percentualReserva: vigente.percentualReserva,
          } : undefined} /></>}
      </div>
    </>
  );
}
