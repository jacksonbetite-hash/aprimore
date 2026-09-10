import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { FormCortesiaPortal } from '../FormsFinanceiro.tsx';
import { acaoCortesiaPortal } from '../../acoes.ts';
import { buscarPortal } from '../../../../../lib/admin-portais.ts';
import { alunosDoPortal, licencasDoPortal } from '../../../../../lib/portal-financeiro.ts';
import { listarMateriasSimples } from '../../../../../lib/admin.ts';
import { brl } from '../../../../../lib/precos.ts';
import { PORTAL_PLATAFORMA } from '../../../../../lib/portal.ts';
import { permissoesDaTela } from '../../../guarda.ts';

export const metadata: Metadata = { title: 'Alunos do portal — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

/**
 * A base de alunos do portal — §5.10.2, etapa 4.
 *
 * Esses dados são do PROFESSOR: ele é o controlador (LGPD, §12.1); a
 * plataforma é o operador. O admin entra aqui para dar suporte, e cada
 * ação fica em auditoria. A tela diz isso com todas as letras porque é
 * a diferença entre operar e bisbilhotar.
 */
export default async function AlunosDoPortal(
  { params, searchParams }: {
    params: Promise<{ id: string }>; searchParams: Promise<{ busca?: string }>;
  },
) {
  const { id } = await params;
  const { busca = '' } = await searchParams;
  const portalId = Number(id);
  if (!Number.isInteger(portalId) || portalId === PORTAL_PLATAFORMA) notFound();

  const [portal, alunos, licencas, materias] = await Promise.all([
    buscarPortal(portalId), alunosDoPortal(portalId, busca),
    licencasDoPortal(portalId, 100), listarMateriasSimples(portalId),
  ]);
  if (!portal) notFound();
  const { 'licencas.conceder': conceder } = await permissoesDaTela('licencas.conceder');

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Alunos · {portal.nomeExibicao}</h1>
          <p className="suave">{alunos.length} aluno(s) na base do portal</p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href={`/admin/portais/${portalId}/financeiro`}>Financeiro</Link>
          <Link className="btn btn-contorno" href={`/admin/portais/${portalId}`}>Voltar ao portal</Link>
        </div>
      </div>

      <p className="aviso" style={{ marginBottom: 20 }}>
        <strong>Dados do professor.</strong> Esta base pertence a {portal.professorNome ?? 'o professor'},
        que responde por ela como controlador (LGPD). O acesso da plataforma é para suporte
        e fica registrado em auditoria — não exporte nem use para contato comercial nosso.
      </p>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <form method="get" className="form-linha" style={{ marginBottom: 16 }}>
          <div className="campos">
            <label>
              Buscar
              <input name="busca" type="search" defaultValue={busca} placeholder="nome ou e-mail" />
            </label>
          </div>
          <button className="btn btn-contorno" type="submit">Filtrar</button>
        </form>
        <table className="tabela">
          <thead>
            <tr><th>Aluno</th><th>Cadastro</th><th>Último acesso</th><th>Licenças ativas</th><th>Gasto</th><th>Conta</th></tr>
          </thead>
          <tbody>
            {alunos.map((a) => (
              <tr key={a.id}>
                <td>{a.nome}<br /><span className="suave">{a.email}</span></td>
                <td>{DATA(a.criadoEm)}</td>
                <td>{DATA(a.ultimoLoginEm)}</td>
                <td className="apertado">{a.licencasAtivas}</td>
                <td className="apertado">{brl(a.gastoCentavos)}</td>
                <td><span className="chip chip-sm chip-neutra">{a.statusConta.toLowerCase()}</span></td>
              </tr>
            ))}
            {alunos.length === 0 && (
              <tr><td colSpan={6} className="suave">Nenhum aluno {busca ? 'com esse filtro' : 'ainda'}.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {conceder && <div className="cartao" style={{ marginBottom: 24 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Cortesia</h2>
        <p className="suave" style={{ marginBottom: 16 }}>
          Licença gratuita a um aluno do portal — reposição por falha nossa, brinde acordado
          com o professor. Não gera venda nem percentual.
        </p>
        <FormCortesiaPortal acao={acaoCortesiaPortal} portalId={portalId}
          alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, email: a.email }))}
          materias={materias} />
      </div>}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Licenças do portal</h2>
        <table className="tabela">
          <thead>
            <tr><th>Aluno</th><th>Escopo</th><th>Origem</th><th>Vigência</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {licencas.map((l) => (
              <tr key={l.id}>
                <td>{l.alunoNome}<br /><span className="suave">{l.alunoEmail}</span></td>
                <td>{l.escopo === 'CATALOGO' ? 'Passe completo' : l.materiaNome}</td>
                <td><span className="chip chip-sm chip-neutra">{l.origem.toLowerCase()}</span></td>
                <td className="apertado">{DATA(l.inicioEm)} → {DATA(l.fimEm)}</td>
                <td>
                  <span className={`chip chip-sm ${l.vigente ? 'chip-secundaria' : 'chip-neutra'}`}>
                    {l.vigente ? 'vigente' : l.status.toLowerCase()}
                  </span>
                </td>
              </tr>
            ))}
            {licencas.length === 0 && <tr><td colSpan={5} className="suave">Nenhuma licença ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
