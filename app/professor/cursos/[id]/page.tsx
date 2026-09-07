import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FormMateria from '../../../admin/cursos/FormMateria.tsx';
import FormAssunto from '../../../admin/cursos/FormAssunto.tsx';
import FormAula from '../../../admin/cursos/FormAula.tsx';
import { BotaoIcone, LinkIcone, EdicaoNaLinha } from '../../../ui.tsx';
import {
  acaoEditarMateria, acaoSalvarAssunto, acaoEditarAssuntoLinha, acaoExcluirAssunto,
  acaoCriarAula, acaoStatusAula,
} from '../../acoes.ts';
import { buscarMateria, listarAreas, listarAssuntos, listarAulas } from '../../../../lib/admin-cursos.ts';
import { formatarDuracao } from '../../../../lib/catalogo.ts';
import { alunoAtual } from '../../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../../lib/professor.ts';
import { enderecoDoPortal } from '../../../../lib/portal-consultas.ts';

export const metadata: Metadata = { title: 'Curso — Painel do professor' };

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria', rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria', aprovado: 'chip-primaria', arquivado: 'chip-neutra',
};

export default async function CursoDoProfessor(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> },
) {
  const { id } = await params;
  const { criada } = await searchParams;
  const u = (await alunoAtual())!;
  const portal = (await portalDoProfessor(u.id))!;
  const materiaId = Number(id);
  if (!Number.isInteger(materiaId)) notFound();

  // `buscarMateria(portal.id, …)` só acha curso DESTE portal: id de curso
  // alheio na URL simplesmente não encontra a linha.
  const [materia, areas, assuntos, aulas] = await Promise.all([
    buscarMateria(portal.id, materiaId), listarAreas(portal.id),
    listarAssuntos(portal.id, materiaId), listarAulas(portal.id, materiaId),
  ]);
  if (!materia) notFound();
  const endereco = await enderecoDoPortal(portal.mascara);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">{materia.nome}</h1>
          <p className="suave">{materia.areaNome} · {assuntos.length} assunto(s) · {materia.aulasPublicadas}/{materia.aulas} aula(s) no ar</p>
        </div>
        <div className="acoes">
          {materia.status === 'publicado' && (
            <a className="btn btn-contorno" href={`${endereco}/materia/${materia.slug}`} target="_blank" rel="noreferrer">Ver no portal</a>
          )}
          <Link className="btn btn-contorno" href="/professor/cursos">Voltar</Link>
        </div>
      </div>

      {criada && (
        <p className="alerta alerta-ok" role="status">Curso criado. Agora crie os assuntos e as aulas.</p>
      )}

      {/* Onde fica o vídeo é a dúvida número um de quem cadastra o primeiro
          curso: ele não é do curso, é de cada aula. E publicar o curso não
          o coloca no portal — o portal lista curso com aula publicada. */}
      {materia.status === 'publicado' && materia.aulasPublicadas === 0 && (
        <p className="alerta alerta-erro">
          <strong>Este curso está publicado, mas ainda não aparece no seu portal.</strong> A
          página do portal só mostra curso com pelo menos uma <em>aula publicada</em>.
        </p>
      )}
      <p className="alerta" style={{ background: 'var(--surface-container)' }}>
        <strong>O caminho até o portal:</strong> assunto → aula → vídeo → publicar a aula.
        O <strong>vídeo é de cada aula</strong>: abra a aula (na tabela “Aulas”, o ícone de
        claquete) e o envio do arquivo é o primeiro bloco da tela. Aqui no curso ficam só a
        ementa e a organização.
      </p>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados do curso</h2>
        <FormMateria acao={acaoEditarMateria} areas={areas} portalId={portal.id} materia={materia} ehPlataforma={false} />
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Assuntos</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>A ordem aqui é a ordem do módulo na página do curso.</p>
        <FormAssunto acao={acaoSalvarAssunto} portalId={portal.id} materiaId={materiaId} />
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
                      <input type="hidden" name="materiaId" value={materiaId} />
                      <input type="hidden" name="id" value={s.id} />
                    </EdicaoNaLinha>
                    {s.aulas === 0 && (
                      <form action={acaoExcluirAssunto}>
                        <input type="hidden" name="id" value={s.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {assuntos.length === 0 && <tr><td colSpan={4}><div className="vazio">Nenhum assunto — a aula precisa de um.</div></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Aulas</h2>
        <table className="tabela">
          <thead><tr><th>Aula</th><th>Assunto</th><th>Duração</th><th>Vídeo</th><th>Exercício</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>
            {aulas.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/professor/cursos/aula/${a.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{a.titulo}</Link>
                  {a.amostraGratuita && <span className="chip chip-sm chip-secundaria" style={{ marginLeft: 8 }}>amostra</span>}
                  <br /><span className="suave">/aula/{a.slug}</span>
                </td>
                <td>{a.assuntoNome}</td>
                <td className="apertado">{formatarDuracao(a.duracaoSegundos)}</td>
                <td>{a.videoId
                  ? <span className="chip chip-sm chip-secundaria">enviado</span>
                  : <span className="suave">sem vídeo</span>}</td>
                <td>{a.questoes ? `${a.questoes} questão(ões)` : <span className="suave">sem questão</span>}</td>
                <td><span className={`chip chip-sm ${CHIP[a.status]}`}>{a.status.replace('_', ' ')}</span></td>
                <td>
                  <div className="acoes-linha">
                    <LinkIcone href={`/professor/cursos/aula/${a.id}`} icone="movie"
                               rotulo="Abrir a aula (vídeo e exercício)" />
                    <form action={acaoStatusAula}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value={a.status === 'publicado' ? 'rascunho' : 'publicado'} />
                      <BotaoIcone
                        icone={a.status === 'publicado' ? 'visibility_off' : 'visibility'}
                        rotulo={a.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                        variante={a.status === 'publicado' ? 'contorno' : 'primario'} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {aulas.length === 0 && <tr><td colSpan={7}><div className="vazio">Nenhuma aula ainda.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {assuntos.length > 0 && (
        <div className="cartao" style={{ marginBottom: 0 }}>
          <h2 className="headline-md" style={{ marginBottom: 16 }}>Nova aula</h2>
          <FormAula acao={acaoCriarAula} assuntos={assuntos} portalId={portal.id} assuntoPadrao={assuntos[0]?.id} />
        </div>
      )}
    </>
  );
}
