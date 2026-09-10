import type { Metadata } from 'next';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../lib/professor.ts';
import { alunosDoPortal, licencasDoPortal } from '../../../lib/portal-financeiro.ts';
import { brl } from '../../../lib/precos.ts';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Alunos — Painel do professor' };

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

/** A base do portal — dele (§5.10, LGPD: o professor é o controlador). */
export default async function AlunosDoProfessor({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const { busca = '' } = await searchParams;
  const u = (await alunoAtual())!;
  const portal = await portalDoProfessor(u.id);
  if (!portal) redirect('/professor');   // o professor do catálogo não tem esta tela
  const [alunos, licencas] = await Promise.all([alunosDoPortal(portal.id, busca), licencasDoPortal(portal.id, 100)]);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Alunos</h1>
          <p className="suave">{alunos.length} aluno(s) na sua base</p>
        </div>
      </div>

      <p className="aviso" style={{ marginBottom: 20 }}>
        <strong>Estes dados são seus, e a responsabilidade também.</strong> Pela LGPD você é o
        controlador da base do portal; a plataforma só guarda e processa. Use-os para atender
        seus alunos — não para lista de terceiros.
      </p>

      <div className="cartao" style={{ marginBottom: 24 }}>
        <form method="get" className="form-linha" style={{ marginBottom: 16 }}>
          <div className="campos">
            <label>Buscar<input name="busca" type="search" defaultValue={busca} placeholder="nome ou e-mail" /></label>
          </div>
          <button className="btn btn-contorno" type="submit">Filtrar</button>
        </form>
        <table className="tabela">
          <thead><tr><th>Aluno</th><th>Cadastro</th><th>Último acesso</th><th>Licenças ativas</th><th>Gasto</th></tr></thead>
          <tbody>
            {alunos.map((a) => (
              <tr key={a.id}>
                <td>{a.nome}<br /><span className="suave">{a.email}</span></td>
                <td>{DATA(a.criadoEm)}</td>
                <td>{DATA(a.ultimoLoginEm)}</td>
                <td className="apertado">{a.licencasAtivas}</td>
                <td className="apertado">{brl(a.gastoCentavos)}</td>
              </tr>
            ))}
            {alunos.length === 0 && <tr><td colSpan={5} className="suave">Nenhum aluno {busca ? 'com esse filtro' : 'ainda'}.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Licenças</h2>
        <table className="tabela">
          <thead><tr><th>Aluno</th><th>Escopo</th><th>Origem</th><th>Vigência</th><th>Situação</th></tr></thead>
          <tbody>
            {licencas.map((l) => (
              <tr key={l.id}>
                <td>{l.alunoNome}<br /><span className="suave">{l.alunoEmail}</span></td>
                <td>{l.escopo === 'CATALOGO' ? 'Passe completo' : l.materiaNome}</td>
                <td><span className="chip chip-sm chip-neutra">{l.origem.toLowerCase()}</span></td>
                <td className="apertado">{DATA(l.inicioEm)} → {DATA(l.fimEm)}</td>
                <td><span className={`chip chip-sm ${l.vigente ? 'chip-secundaria' : 'chip-neutra'}`}>{l.vigente ? 'vigente' : l.status.toLowerCase()}</span></td>
              </tr>
            ))}
            {licencas.length === 0 && <tr><td colSpan={5} className="suave">Nenhuma licença ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
