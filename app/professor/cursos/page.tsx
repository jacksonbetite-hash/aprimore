import Link from 'next/link';
import type { Metadata } from 'next';
import FormArea from '../../admin/cursos/FormArea.tsx';
import FormMateria from '../../admin/cursos/FormMateria.tsx';
import { BotaoIcone, LinkIcone, EdicaoNaLinha } from '../../ui.tsx';
import {
  acaoSalvarArea, acaoEditarAreaLinha, acaoExcluirArea, acaoCriarMateria, acaoStatusMateria,
} from '../acoes.ts';
import { listarAreas, listarMaterias, niveisDoPortal } from '../../../lib/admin-cursos.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../lib/professor.ts';
import CursosCatalogo from '../catalogo/Cursos.tsx';

export const metadata: Metadata = { title: 'Cursos e aulas — Painel do professor' };

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria', rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria', aprovado: 'chip-primaria', arquivado: 'chip-neutra',
};

/**
 * O acervo do professor: áreas → cursos. Mesmos formulários da
 * retaguarda; o portal vem da sessão (acoes.ts), nunca do formulário.
 */
export default async function CursosDoProfessor() {
  const u = (await alunoAtual())!;
  const portal = await portalDoProfessor(u.id);
  if (!portal) return <CursosCatalogo u={u} />;
  const [areas, materias, niveis] = await Promise.all([
    listarAreas(portal.id), listarMaterias(portal.id), niveisDoPortal(portal.id),
  ]);
  const invisiveis = materias.filter((m) => m.status === 'publicado' && m.aulasPublicadas === 0);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Cursos e aulas</h1>
          <p className="suave">
            {areas.length} área(s) · {materias.length} curso(s). Publicação é direta — o
            conteúdo publicado é de sua responsabilidade (contrato).
          </p>
        </div>
        {/* O vídeo é de cada aula, e é aqui que se procura por ele. O
            atalho leva à tela onde todas as aulas aparecem juntas, com
            quem já tem gravação e quem não tem. */}
        <div className="acoes">
          <Link className="btn btn-contorno" href="/professor/videos">Vídeos das aulas</Link>
        </div>
      </div>

      {invisiveis.length > 0 && (
        <p className="alerta alerta-erro">
          <strong>
            {invisiveis.length === 1
              ? 'Um curso publicado ainda não aparece no seu portal'
              : `${invisiveis.length} cursos publicados ainda não aparecem no seu portal`}:{' '}
            {invisiveis.map((m) => m.nome).join(', ')}.
          </strong>{' '}
          A página do portal só mostra curso que já tem <em>aula publicada</em>. Abra o curso,
          crie um <strong>assunto</strong>, crie a <strong>aula</strong> (é dentro dela que se
          envia o vídeo) e publique a aula.
        </p>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Áreas</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Como o seu acervo se organiza na página do portal. Crie as suas — não precisa
          seguir as da plataforma. Para trocar o nome ou a ordem de uma área, use o lápis
          na coluna Ações.
        </p>
        <FormArea acao={acaoSalvarArea} portalId={portal.id} />
        <table className="tabela" style={{ marginTop: 16 }}>
          <thead><tr><th>Área</th><th>Ordem</th><th>Cursos</th><th>Ações</th></tr></thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.nome}</strong><br /><span className="suave mono">{a.slug}</span></td>
                <td className="apertado">{a.ordem}</td>
                <td>{a.materias || <span className="suave">nenhum</span>}</td>
                <td>
                  <div className="acoes-linha">
                    <EdicaoNaLinha acao={acaoEditarAreaLinha} nome={a.nome} ordem={a.ordem}
                                   oQue={`a área ${a.nome}`}>
                      <input type="hidden" name="id" value={a.id} />
                    </EdicaoNaLinha>
                    {a.materias === 0 && (
                      <form action={acaoExcluirArea}>
                        <input type="hidden" name="id" value={a.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {areas.length === 0 && <tr><td colSpan={4}><div className="vazio">Crie a primeira área — o curso precisa de uma.</div></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Cursos</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          O vídeo não fica aqui: ele é <strong>de cada aula</strong>. Abra o curso → crie o
          assunto → crie a aula → dentro da aula está o envio do arquivo de vídeo. Para
          enviar, trocar ou tirar o vídeo de várias aulas de uma vez, use{' '}
          <Link href="/professor/videos">Vídeos das aulas</Link>.
        </p>
        <table className="tabela">
          <thead><tr><th>Curso</th><th>Área</th><th>Aulas no ar</th><th>Situação</th><th>No portal</th><th>Vitrine</th><th>Ações</th></tr></thead>
          <tbody>
            {materias.map((m) => {
              const noAr = m.status === 'publicado' && m.aulasPublicadas > 0;
              return (
                <tr key={m.id}>
                  {/* A miniatura da capa na primeira coluna: é aqui que o
                      professor confere de relance qual curso está com a
                      imagem errada — a vitrine ele vê de fora, e de fora
                      não dá para consertar. Quadro cinza = sem capa, e o
                      cartão está usando o desenho da área. */}
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {m.capa ? (
                        <img src={m.capa} alt="" width={64} height={36} loading="lazy"
                             style={{
                               borderRadius: 6, objectFit: 'cover', flexShrink: 0,
                               border: '1px solid var(--surface-variant)',
                             }} />
                      ) : (
                        <span aria-hidden="true" style={{
                          width: 64, height: 36, borderRadius: 6, flexShrink: 0,
                          background: 'var(--surface-container-high)',
                        }} />
                      )}
                      <span>
                        <Link href={`/professor/cursos/${m.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{m.nome}</Link>
                        <br /><span className="suave">/materia/{m.slug}</span>
                      </span>
                    </div>
                  </td>
                  <td>{m.areaNome}</td>
                  <td className="apertado">{m.aulasPublicadas}/{m.aulas}</td>
                  <td><span className={`chip chip-sm ${CHIP[m.status]}`}>{m.status.replace('_', ' ')}</span></td>
                  {/* Publicar o curso não o coloca no ar: a página do portal
                      só lista curso com aula publicada. Dizer isso na linha
                      evita a pergunta "cadastrei e não apareceu". */}
                  <td>
                    {noAr
                      ? <span className="chip chip-sm chip-secundaria">visível</span>
                      : m.status !== 'publicado'
                        ? <span className="suave">não — curso {m.status.replace('_', ' ')}</span>
                        : <span className="chip chip-sm chip-erro">sem aula publicada</span>}
                  </td>
                  <td>{m.naVitrinePlataforma ? <span className="chip chip-sm chip-terciaria">na plataforma</span> : <span className="suave">só no portal</span>}</td>
                  <td>
                    <div className="acoes-linha">
                      <LinkIcone href={`/professor/cursos/${m.id}`} icone="menu_book"
                                 rotulo="Assuntos e aulas" />
                      <form action={acaoStatusMateria}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="status" value={m.status === 'publicado' ? 'rascunho' : 'publicado'} />
                        <BotaoIcone
                          icone={m.status === 'publicado' ? 'visibility_off' : 'visibility'}
                          rotulo={m.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                          variante={m.status === 'publicado' ? 'contorno' : 'primario'} />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {materias.length === 0 && <tr><td colSpan={7}><div className="vazio">Nenhum curso ainda.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {areas.length > 0 && (
        <div className="cartao" style={{ marginBottom: 0 }}>
          <h2 className="headline-md" style={{ marginBottom: 16 }}>Novo curso</h2>
          <FormMateria acao={acaoCriarMateria} areas={areas} portalId={portal.id} ehPlataforma={false}
                       niveis={niveis} />
        </div>
      )}
    </>
  );
}
