import Link from 'next/link';
import { notFound } from 'next/navigation';
import FormMateria from '../../admin/cursos/FormMateria.tsx';
import FormAssunto from '../../admin/cursos/FormAssunto.tsx';
import FormAula from '../../admin/cursos/FormAula.tsx';
import { BotaoIcone, LinkIcone, EdicaoNaLinha } from '../../ui.tsx';
import Enviar from '../Enviar.tsx';
import {
  acaoEditarMateriaCatalogo, acaoStatusMateriaCatalogo, acaoSalvarAssuntoCatalogo,
  acaoEditarAssuntoLinhaCatalogo, acaoExcluirAssuntoCatalogo, acaoCriarAulaCatalogo,
  acaoStatusAulaCatalogo,
} from '../acoes-catalogo.ts';
import {
  buscarMateria, listarAreas, listarAssuntos, listarAulas, niveisDoPortal,
} from '../../../lib/admin-cursos.ts';
import { formatarDuracao } from '../../../lib/catalogo.ts';
import { PORTAL_PLATAFORMA } from '../../../lib/portal.ts';
import { queryOne } from '../../../lib/db.ts';
import type { Aluno } from '../../../lib/sessao.ts';

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria', rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria', aprovado: 'chip-primaria', arquivado: 'chip-neutra',
};

/**
 * Um curso do professor do catálogo (etapa 5). A posse é conferida AQUI
 * também, não só nas ações: curso de outro professor na URL é 404.
 */
export default async function CursoCatalogo({ u, materiaId, criada }: { u: Aluno; materiaId: number; criada?: string }) {
  const dono = await queryOne('SELECT 1 FROM materia WHERE id = $1 AND portal_id = 0 AND professor_id = $2', [materiaId, u.id]);
  if (!dono) notFound();
  const [materia, areas, assuntos, aulas, niveis] = await Promise.all([
    buscarMateria(PORTAL_PLATAFORMA, materiaId), listarAreas(PORTAL_PLATAFORMA),
    listarAssuntos(PORTAL_PLATAFORMA, materiaId), listarAulas(PORTAL_PLATAFORMA, materiaId),
    niveisDoPortal(PORTAL_PLATAFORMA),
  ]);
  if (!materia) notFound();
  const pronto = aulas.some((a) => a.status === 'publicado');

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">{materia.nome}</h1>
          <p className="suave">
            {materia.areaNome} · {assuntos.length} assunto(s) · {materia.aulasPublicadas}/{materia.aulas} aula(s) no ar ·{' '}
            <span className={`chip chip-sm ${CHIP[materia.status]}`}>{materia.status.replace('_', ' ')}</span>
          </p>
        </div>
        <div className="acoes">
          {materia.status === 'publicado' && (
            <Link className="btn btn-contorno" href={`/materia/${materia.slug}`} target="_blank">Ver no catálogo</Link>
          )}
          {materia.status === 'rascunho' && (
            <form action={acaoStatusMateriaCatalogo}>
              <input type="hidden" name="id" value={materiaId} />
              <input type="hidden" name="status" value="em_revisao" />
              <button className="btn btn-primario" type="submit" disabled={!pronto}
                      title={pronto ? undefined : 'publique ao menos uma aula antes'}>
                Enviar para revisão
              </button>
            </form>
          )}
          {materia.status === 'em_revisao' && (
            <form action={acaoStatusMateriaCatalogo}>
              <input type="hidden" name="id" value={materiaId} />
              <input type="hidden" name="status" value="rascunho" />
              <button className="btn btn-contorno" type="submit">Voltar a rascunho</button>
            </form>
          )}
          <Link className="btn btn-contorno" href="/professor/cursos">Voltar</Link>
        </div>
      </div>

      {criada && <p className="alerta alerta-ok" role="status">Curso criado. Agora crie os assuntos e as aulas.</p>}

      {materia.status === 'em_revisao' && (
        <p className="alerta" style={{ background: 'var(--surface-container)' }}>
          <strong>Em revisão pela plataforma.</strong> Quando for publicado, o curso entra no
          catálogo e as vendas começam. Você ainda pode editar aulas e questões enquanto isso.
        </p>
      )}
      {materia.status === 'publicado' && materia.aulasPublicadas === 0 && (
        <p className="alerta alerta-erro">
          <strong>Publicado, mas sem aula no ar:</strong> o catálogo só mostra curso com aula publicada.
        </p>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Capa do curso</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          A imagem do cartão no catálogo. Sem capa, sai um quadro do vídeo da primeira aula.
        </p>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {materia.capa ? (
            <img src={materia.capa} alt="Capa atual do curso" width={240} height={135}
                 style={{ borderRadius: 'var(--r-md)', objectFit: 'cover', border: '1px solid var(--surface-variant)' }} />
          ) : (
            <div style={{ width: 240, height: 135, borderRadius: 'var(--r-md)', display: 'grid', placeItems: 'center',
                          background: 'var(--surface-container)', color: 'var(--on-surface-variant)', fontSize: 13, textAlign: 'center', padding: 8 }}>
              sem capa
            </div>
          )}
          <div style={{ flex: 1, minWidth: 260 }}>
            <Enviar tipo="imagem" materiaId={materiaId} rotulo="Enviar capa"
                    aceita="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    dica="JPG, PNG ou WebP, até 5 MB, proporção 16:9 (1280 × 720 px é o ideal)." />
          </div>
        </div>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados do curso</h2>
        <FormMateria acao={acaoEditarMateriaCatalogo} areas={areas} portalId={PORTAL_PLATAFORMA}
                     materia={materia} ehPlataforma niveis={niveis} catalogo nomeProfessor={u.nome} />
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Assuntos</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>A ordem em que o aluno estuda. Cada aula pertence a um assunto.</p>
        <FormAssunto acao={acaoSalvarAssuntoCatalogo} portalId={PORTAL_PLATAFORMA} materiaId={materiaId} />
        <table className="tabela" style={{ marginTop: 16 }}>
          <thead><tr><th>Assunto</th><th>Ordem</th><th>Aulas</th><th>Ações</th></tr></thead>
          <tbody>
            {assuntos.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.nome}</strong><br /><span className="suave mono">{s.slug}</span></td>
                <td className="apertado">{s.ordem}</td>
                <td>{s.aulas || <span className="suave">nenhuma</span>}</td>
                <td>
                  <div className="acoes-linha">
                    <EdicaoNaLinha acao={acaoEditarAssuntoLinhaCatalogo} nome={s.nome} ordem={s.ordem} oQue={`o assunto ${s.nome}`}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="materiaId" value={materiaId} />
                    </EdicaoNaLinha>
                    <form action={acaoExcluirAssuntoCatalogo}>
                      <input type="hidden" name="id" value={s.id} />
                      <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" desabilitado={s.aulas > 0} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {assuntos.length === 0 && <tr><td colSpan={4}><div className="vazio">Nenhum assunto ainda.</div></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Aulas</h2>
        <table className="tabela" style={{ marginBottom: 20 }}>
          <thead><tr><th>Aula</th><th>Assunto</th><th>Duração</th><th>Vídeo</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>
            {aulas.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/professor/cursos/aula/${a.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{a.titulo}</Link>
                  {a.amostraGratuita && <span className="chip chip-sm chip-terciaria" style={{ marginLeft: 8 }}>amostra</span>}
                </td>
                <td>{a.assuntoNome}</td>
                <td className="apertado">{formatarDuracao(a.duracaoSegundos)}</td>
                <td>{a.videoId ? <span className="chip chip-sm chip-secundaria">enviado</span> : <span className="suave">sem vídeo</span>}</td>
                <td><span className={`chip chip-sm ${CHIP[a.status]}`}>{a.status.replace('_', ' ')}</span></td>
                <td>
                  <div className="acoes-linha">
                    <LinkIcone href={`/professor/cursos/aula/${a.id}`} icone="movie" rotulo="Abrir a aula" />
                    <form action={acaoStatusAulaCatalogo}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value={a.status === 'publicado' ? 'rascunho' : 'publicado'} />
                      <BotaoIcone icone={a.status === 'publicado' ? 'visibility_off' : 'visibility'}
                                  rotulo={a.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                                  variante={a.status === 'publicado' ? 'contorno' : 'primario'} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {aulas.length === 0 && <tr><td colSpan={6}><div className="vazio">Nenhuma aula ainda.</div></td></tr>}
          </tbody>
        </table>
        {assuntos.length > 0 ? (
          <>
            <h3 className="headline-md" style={{ marginBottom: 12 }}>Nova aula</h3>
            <FormAula acao={acaoCriarAulaCatalogo} assuntos={assuntos} portalId={PORTAL_PLATAFORMA} />
          </>
        ) : (
          <p className="suave">Crie um assunto para cadastrar a primeira aula.</p>
        )}
      </div>
    </>
  );
}
