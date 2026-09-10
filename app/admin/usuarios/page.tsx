import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../../componentes.tsx';
import { exigirTela, permissoesDaTela } from '../guarda.ts';
import { listarUsuarios, contarPorPapel, portaisParaCadastro } from '../../../lib/admin-usuarios.ts';
import { ROTULO_PAPEL, type Papel } from '../../../lib/permissoes.ts';

export const metadata: Metadata = { title: 'Usuários — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const CHIP_PAPEL: Record<string, string> = {
  admin: 'chip-primaria', financeiro: 'chip-primaria', suporte: 'chip-primaria',
  professor: 'chip-terciaria', gestor: 'chip-terciaria', aluno: 'chip-neutra', revisor: 'chip-neutra',
};
const CHIP_CONTA: Record<string, string> = {
  ATIVA: 'chip-secundaria', INATIVA_AVISO: 'chip-terciaria',
  BLOQUEADA_INATIVIDADE: 'chip-erro', ENCERRADA: 'chip-erro',
};
const PAPEIS_ORDEM: Papel[] = ['aluno', 'professor', 'gestor', 'admin', 'financeiro', 'suporte', 'revisor'];

/**
 * O cadastro de usuários — docs/plano-perfis-e-acessos.md, §3. Uma lista
 * para todos os papéis e todos os portais; a ficha abre pelo nome.
 *
 * Nesta etapa cada linha é um `usuario` — uma pessoa POR portal (§5.10).
 * A coluna "onde" diz de qual base a linha é; a ficha mostra os outros
 * perfis com o mesmo e-mail.
 */
export default async function Usuarios(
  { searchParams }: {
    searchParams: Promise<{ q?: string; papel?: string; portal?: string; status?: string; licenca?: string }>;
  },
) {
  await exigirTela('cadastros.ver');
  const { q = '', papel = '', portal = '', status = '', licenca = '' } = await searchParams;
  const portalId = portal === '' ? null : Number(portal);

  const [usuarios, porPapel, portais, pode] = await Promise.all([
    listarUsuarios({
      busca: q, papel, portalId: Number.isInteger(portalId) ? portalId : null,
      status, comLicenca: licenca === '1',
    }),
    contarPorPapel(), portaisParaCadastro(), permissoesDaTela('cadastros.agir'),
  ]);
  const contagem = Object.fromEntries(porPapel.map((p) => [p.papel, p.total]));
  const filtrando = q || papel || portal !== '' || status || licenca;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Usuários</h1>
          <p className="suave">
            Todo mundo que tem conta — alunos, colaboradores, professores, gestores e a equipe —
            em todos os portais. {usuarios.length} {usuarios.length === 1 ? 'conta' : 'contas'}
            {filtrando ? ' neste recorte' : ' (as mais recentes)'}.
          </p>
        </div>
        {pode['cadastros.agir'] && (
          <div className="acoes">
            <Link className="btn btn-primario" href="/admin/usuarios/novo">
              <Icone nome="person" tamanho={18} /> Novo usuário
            </Link>
          </div>
        )}
      </div>

      <div className="filtros" style={{ marginBottom: 16 }}>
        <Link className={`chip chip-sm ${papel === '' ? 'chip-primaria' : 'chip-contorno'}`}
              href="/admin/usuarios">Todos</Link>
        {PAPEIS_ORDEM.filter((p) => contagem[p]).map((p) => (
          <Link key={p} className={`chip chip-sm ${papel === p ? 'chip-primaria' : 'chip-contorno'}`}
                href={`/admin/usuarios?papel=${p}`}>
            {ROTULO_PAPEL[p]} · {contagem[p]}
          </Link>
        ))}
      </div>

      <div className="cartao">
        <form method="get" className="form-linha" style={{ marginBottom: 16 }}>
          {papel && <input type="hidden" name="papel" value={papel} />}
          <div className="campos">
            <label>
              Buscar
              <input name="q" type="search" defaultValue={q} placeholder="nome, e-mail ou CPF"
                     aria-label="Buscar usuário" />
            </label>
            <label>
              Onde
              <select name="portal" defaultValue={portal}>
                <option value="">qualquer portal</option>
                <option value="0">Plataforma</option>
                {portais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.tipo === 'EMPRESA' ? 'Empresa' : 'Professor'} · {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Conta
              <select name="status" defaultValue={status}>
                <option value="">qualquer estado</option>
                <option value="ATIVA">ativa</option>
                <option value="INATIVA_AVISO">inativa (aviso)</option>
                <option value="BLOQUEADA_INATIVIDADE">bloqueada por inatividade</option>
                <option value="ENCERRADA">encerrada</option>
              </select>
            </label>
            <label className="lembrar" style={{ alignSelf: 'center' }}>
              <input type="checkbox" name="licenca" value="1" defaultChecked={licenca === '1'} />
              <span>só com licença vigente</span>
            </label>
            <button className="btn btn-contorno" type="submit">Filtrar</button>
          </div>
        </form>

        <table className="tabela">
          <thead>
            <tr>
              <th>Pessoa</th><th>Papel</th><th>Onde</th><th>Documento</th>
              <th>Licenças</th><th>Último acesso</th><th>Conta</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/admin/usuarios/${u.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                    {u.nome}
                  </Link>
                  <br /><span className="suave">{u.email}</span>
                </td>
                <td>
                  <span className={`chip chip-sm ${CHIP_PAPEL[u.papel] ?? 'chip-neutra'}`}>
                    {u.portalTipo === 'EMPRESA' && u.papel === 'aluno' ? 'colaborador' : u.papel}
                  </span>
                  {u.opera.length > 0 && (
                    <><br /><span className="caption suave">opera {u.opera.join(', ')}</span></>
                  )}
                </td>
                <td>
                  {u.portalNome ?? <span className="suave">Plataforma</span>}
                  {u.setorNome && <><br /><span className="caption suave">{u.setorNome}</span></>}
                </td>
                <td className="mono suave">{u.documentoMascarado ?? '—'}</td>
                <td className="apertado">
                  {u.licencasVigentes > 0 ? `${u.licencasVigentes} vigente(s)` : <span className="suave">nenhuma</span>}
                </td>
                <td className="apertado suave">{DATA(u.ultimoLoginEm)}</td>
                <td>
                  <span className={`chip chip-sm ${CHIP_CONTA[u.statusConta] ?? 'chip-neutra'}`}>
                    {u.statusConta.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr><td colSpan={7}><div className="vazio">Ninguém neste recorte.</div></td></tr>
            )}
          </tbody>
        </table>
        <p className="dica" style={{ marginTop: '.8rem' }}>
          O documento aparece mascarado na lista e inteiro só na ficha (LGPD). Uma pessoa com
          conta em mais de um portal aparece uma vez por portal — a ficha mostra os outros.
        </p>
      </div>
    </>
  );
}
