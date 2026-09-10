import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FormMateria from '../FormMateria.tsx';
import FormAssunto from '../FormAssunto.tsx';
import FormAula from '../FormAula.tsx';
import { BotaoIcone, LinkIcone, EdicaoNaLinha } from '../../../ui.tsx';
import {
  acaoEditarMateria, acaoSalvarAssunto, acaoEditarAssuntoLinha, acaoExcluirAssunto,
  acaoCriarAula, acaoStatusAula,
} from '../acoes.ts';
import {
  buscarMateria, listarAreas, listarAssuntos, listarAulas, niveisDoPortal,
} from '../../../../lib/admin-cursos.ts';
import { PORTAL_PLATAFORMA } from '../../../../lib/portal.ts';
import { formatarDuracao } from '../../../../lib/catalogo.ts';

export const metadata: Metadata = { title: 'Curso — Administração' };
export const dynamic = 'force-dynamic';

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria', rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria', aprovado: 'chip-primaria', arquivado: 'chip-neutra',
};

export default async function Curso(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ portal?: string; criada?: string }>;
  },
) {
  const { id } = await params;
  const { portal = '', criada } = await searchParams;
  const portalId = portal !== '' && Number.isInteger(Number(portal))
    ? Number(portal) : PORTAL_PLATAFORMA;
  const materiaId = Number(id);
  if (!Number.isInteger(materiaId)) notFound();

  const [materia, areas, assuntos, aulas, niveis] = await Promise.all([
    buscarMateria(portalId, materiaId), listarAreas(portalId),
    listarAssuntos(portalId, materiaId), listarAulas(portalId, materiaId),
    niveisDoPortal(portalId),
  ]);
  if (!materia) notFound();

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">{materia.nome}</h1>
          <p className="suave">
            {materia.areaNome} · {assuntos.length} assunto(s) ·{' '}
            {materia.aulasPublicadas}/{materia.aulas} aula(s) no ar
          </p>
        </div>
        <div className="acoes">
          {materia.status === 'publicado' && portalId === PORTAL_PLATAFORMA && (
            <Link className="btn btn-contorno" href={`/materia/${materia.slug}`} target="_blank">
              Ver no site
            </Link>
          )}
          <Link className="btn btn-contorno" href={`/admin/cursos?portal=${portalId}`}>Voltar</Link>
        </div>
      </div>

      {criada && (
        <p className="alerta alerta-ok" role="status">
          Curso criado em <code>/materia/{materia.slug}</code>. Agora crie os assuntos e as aulas.
        </p>
      )}

      {/* A prévia do cartão do catálogo (docs/plano-catalogo-streaming.md).
          Não é controle novo: quem a escolhe é o marcador "amostra
          gratuita" da aula. O que a linha faz é dizer QUAL aula ele
          escolheu — sem isso, o vídeo que roda no cartão não tem origem
          visível para quem cuida do acervo. */}
      <p className="alerta" style={{ background: 'var(--surface-container)' }}>
        <strong>Prévia do cartão no catálogo:</strong>{' '}
        {materia.previaAula
          ? <>a aula <strong>{materia.previaAula}</strong> — a primeira amostra gratuita
            publicada com vídeo. Ela roda na capa quando alguém passa o mouse pelo cartão.</>
          : <>nenhuma. Sem aula marcada como <em>amostra gratuita</em> com vídeo, o cartão
            mostra só a capa, parada.</>}
      </p>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados do curso</h2>
        <FormMateria acao={acaoEditarMateria} areas={areas} portalId={portalId}
          materia={materia} ehPlataforma={portalId === PORTAL_PLATAFORMA} niveis={niveis} />
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Assuntos</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          A ordem aqui é a ordem do módulo na página do curso.
        </p>
        <FormAssunto acao={acaoSalvarAssunto} portalId={portalId} materiaId={materiaId} />
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
                    <EdicaoNaLinha acao={acaoEditarAssuntoLinha} nome={s.nome} ordem={s.ordem}
                                   oQue={`o assunto ${s.nome}`}>
                      <input type="hidden" name="portalId" value={portalId} />
                      <input type="hidden" name="materiaId" value={materiaId} />
                      <input type="hidden" name="id" value={s.id} />
                    </EdicaoNaLinha>
                    {s.aulas === 0 && (
                      <form action={acaoExcluirAssunto}>
                        <input type="hidden" name="portalId" value={portalId} />
                        <input type="hidden" name="materiaId" value={materiaId} />
                        <input type="hidden" name="id" value={s.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {assuntos.length === 0 && (
              <tr><td colSpan={4}><div className="vazio">Nenhum assunto — a aula precisa de um.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Aulas</h2>
        <table className="tabela">
          <thead>
            <tr><th>Aula</th><th>Assunto</th><th>Duração</th><th>Exercício</th>
              <th>Situação</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {aulas.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/admin/cursos/aula/${a.id}?portal=${portalId}`}
                    style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                    {a.titulo}
                  </Link>
                  {a.amostraGratuita && (
                    <span className="chip chip-sm chip-secundaria" style={{ marginLeft: 8 }}>amostra</span>
                  )}
                  {a.noTrial && (
                    <span className="chip chip-sm chip-terciaria" style={{ marginLeft: 8 }}>trial</span>
                  )}
                  <br /><span className="suave">/aula/{a.slug}</span>
                </td>
                <td>{a.assuntoNome}</td>
                <td className="apertado">{formatarDuracao(a.duracaoSegundos)}</td>
                <td>{a.questoes ? `${a.questoes} questão(ões)` : <span className="suave">sem questão</span>}</td>
                <td><span className={`chip chip-sm ${CHIP[a.status]}`}>{a.status.replace('_', ' ')}</span></td>
                <td>
                  <div className="acoes-linha">
                    <LinkIcone href={`/admin/cursos/aula/${a.id}?portal=${portalId}`}
                      icone="movie" rotulo="Abrir a aula (vídeo e exercício)" />
                    <form action={acaoStatusAula}>
                      <input type="hidden" name="portalId" value={portalId} />
                      <input type="hidden" name="materiaId" value={materiaId} />
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status"
                        value={a.status === 'publicado' ? 'rascunho' : 'publicado'} />
                      <BotaoIcone
                        icone={a.status === 'publicado' ? 'visibility_off' : 'visibility'}
                        rotulo={a.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                        variante={a.status === 'publicado' ? 'contorno' : 'primario'} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {aulas.length === 0 && (
              <tr><td colSpan={6}><div className="vazio">Nenhuma aula ainda.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {assuntos.length > 0 && (
        <div className="cartao" style={{ marginBottom: 0 }}>
          <h2 className="headline-md" style={{ marginBottom: 16 }}>Nova aula</h2>
          <FormAula acao={acaoCriarAula} assuntos={assuntos} portalId={portalId}
            assuntoPadrao={assuntos[0]?.id} />
        </div>
      )}
    </>
  );
}
