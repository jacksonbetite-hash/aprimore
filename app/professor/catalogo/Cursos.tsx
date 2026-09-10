import Link from 'next/link';
import FormMateria from '../../admin/cursos/FormMateria.tsx';
import { LinkIcone } from '../../ui.tsx';
import { acaoCriarMateriaCatalogo } from '../acoes-catalogo.ts';
import { listarAreas, listarMateriasDoProfessor, niveisDoPortal } from '../../../lib/admin-cursos.ts';
import { PORTAL_PLATAFORMA } from '../../../lib/portal.ts';
import type { Aluno } from '../../../lib/sessao.ts';

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria', rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria', aprovado: 'chip-primaria', arquivado: 'chip-neutra',
};
const ROTULO: Record<string, string> = {
  publicado: 'publicado', rascunho: 'rascunho', em_revisao: 'em revisão',
  aprovado: 'aprovado — a plataforma vai publicar', arquivado: 'arquivado',
};

/**
 * Os cursos do professor SEM portal, no catálogo da plataforma (etapa 5).
 * As áreas são as da casa (ele escolhe, não cria); o formulário é o da
 * retaguarda em modo catálogo — sem vitrine, destaque e onda, e com a
 * situação limitada ao que ele decide (publicar é da revisão).
 */
export default async function CursosCatalogo({ u }: { u: Aluno }) {
  const [areas, materias, niveis] = await Promise.all([
    listarAreas(PORTAL_PLATAFORMA), listarMateriasDoProfessor(u.id), niveisDoPortal(PORTAL_PLATAFORMA),
  ]);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Meus cursos no catálogo</h1>
          <p className="suave">
            {materias.length} curso(s). Publicação com revisão: quando o curso estiver pronto,
            mude a situação para <em>em revisão</em> e a plataforma publica.
          </p>
        </div>
      </div>

      <div className="cartao">
        <table className="tabela">
          <thead><tr><th>Curso</th><th>Área</th><th>Aulas</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>
            {materias.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/professor/cursos/${m.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{m.nome}</Link>
                  <br /><span className="suave mono">{m.slug}</span>
                </td>
                <td>{m.areaNome}</td>
                <td className="apertado">{m.aulasPublicadas}/{m.aulas} no ar</td>
                <td><span className={`chip chip-sm ${CHIP[m.status]}`}>{ROTULO[m.status] ?? m.status}</span></td>
                <td>
                  <div className="acoes-linha">
                    <LinkIcone href={`/professor/cursos/${m.id}`} icone="edit" rotulo="Abrir o curso" />
                    {m.status === 'publicado' && (
                      <LinkIcone href={`/materia/${m.slug}`} icone="open_in_new" rotulo="Ver no catálogo" externo />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {materias.length === 0 && (
              <tr><td colSpan={5}><div className="vazio">Nenhum curso ainda. Crie o primeiro abaixo.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Novo curso</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Nasce em rascunho, assinado por você. Escolha a área da plataforma em que ele entra.
        </p>
        <FormMateria acao={acaoCriarMateriaCatalogo} areas={areas} portalId={PORTAL_PLATAFORMA}
                     ehPlataforma niveis={niveis} catalogo nomeProfessor={u.nome} />
      </div>
    </>
  );
}
