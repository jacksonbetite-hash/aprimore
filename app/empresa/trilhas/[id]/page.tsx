import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FormMateria from '../../../admin/cursos/FormMateria.tsx';
import FormAssunto from '../../../admin/cursos/FormAssunto.tsx';
import FormAula from '../../../admin/cursos/FormAula.tsx';
import Exercicio from '../../../admin/cursos/Exercicio.tsx';
import FormAvaliacao from './FormAvaliacao.tsx';
import BotaoStatusAula from '../BotaoStatusAula.tsx';
import { BotaoIcone, LinkIcone, EdicaoNaLinha } from '../../../ui.tsx';
import {
  acaoEditarTrilha, acaoSalvarModulo, acaoEditarModuloLinha, acaoExcluirModulo,
  acaoCriarAula, acaoStatusAula, acaoSalvarAvaliacao, acaoSalvarQuestao, acaoExcluirQuestao,
} from '../../acoes.ts';
import {
  buscarMateria, listarAreas, listarAssuntos, listarAulas, questoesDaAvaliacao,
} from '../../../../lib/admin-cursos.ts';
import { avaliacaoDaTrilha } from '../../../../lib/avaliacao.ts';
import { formatarDuracao } from '../../../../lib/catalogo.ts';
import { alunoAtual } from '../../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../../lib/empresa.ts';
import { enderecoDoPortal } from '../../../../lib/portal-consultas.ts';

export const metadata: Metadata = { title: 'Trilha — Painel da empresa' };
export const dynamic = 'force-dynamic';

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria', rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria', aprovado: 'chip-primaria', arquivado: 'chip-neutra',
};

/**
 * Uma trilha: dados, módulos, aulas e a AVALIAÇÃO FINAL (§5.11, etapa 3).
 * A avaliação mora aqui, e não numa tela própria, porque é da trilha —
 * uma por trilha, e é ela que decide o certificado.
 */
export default async function TrilhaDaEmpresa(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> },
) {
  const { id } = await params;
  const { criada } = await searchParams;
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const materiaId = Number(id);
  if (!Number.isInteger(materiaId)) notFound();

  const [materia, areas, modulos, aulas, avaliacao] = await Promise.all([
    buscarMateria(portal.id, materiaId), listarAreas(portal.id),
    listarAssuntos(portal.id, materiaId), listarAulas(portal.id, materiaId),
    avaliacaoDaTrilha(portal.id, materiaId),
  ]);
  if (!materia) notFound();
  const questoes = avaliacao ? await questoesDaAvaliacao(portal.id, avaliacao.id) : [];
  const endereco = await enderecoDoPortal(portal.mascara);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">{materia.nome}</h1>
          <p className="suave">{materia.areaNome} · {modulos.length} módulo(s) · {materia.aulasPublicadas}/{materia.aulas} aula(s) no ar</p>
        </div>
        <div className="acoes">
          {materia.status === 'publicado' && (
            <a className="btn btn-contorno" href={`${endereco}/materia/${materia.slug}`} target="_blank" rel="noreferrer">Ver no portal</a>
          )}
          <Link className="btn btn-contorno" href="/empresa/trilhas">Voltar</Link>
        </div>
      </div>

      {criada && (
        <p className="alerta alerta-ok" role="status">Trilha criada. Agora crie os módulos e as aulas.</p>
      )}

      {materia.status === 'publicado' && materia.aulasPublicadas === 0 && (
        <p className="alerta alerta-erro">
          <strong>Esta trilha está publicada, mas ainda não aparece para a equipe.</strong> O
          portal só mostra trilha com pelo menos uma <em>aula publicada</em>.
        </p>
      )}
      <p className="alerta" style={{ background: 'var(--surface-container)' }}>
        <strong>O caminho até o colaborador:</strong> módulo → aula → vídeo → publicar a aula →
        avaliação final → <Link href="/empresa/atribuicoes">liberar a trilha</Link> para uma
        pessoa ou um setor. O <strong>vídeo é de cada aula</strong>: abra a aula (ícone de
        claquete) e o envio do arquivo é o primeiro bloco da tela.
      </p>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados da trilha</h2>
        <FormMateria acao={acaoEditarTrilha} areas={areas} portalId={portal.id} materia={materia} ehPlataforma={false} empresa />
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Módulos</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>A ordem aqui é a ordem em que o colaborador vê os módulos.</p>
        <FormAssunto acao={acaoSalvarModulo} portalId={portal.id} materiaId={materiaId} empresa />
        <table className="tabela" style={{ marginTop: 16 }}>
          <thead><tr><th>Módulo</th><th>Ordem</th><th>Aulas</th><th>Ações</th></tr></thead>
          <tbody>
            {modulos.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.nome}</strong></td>
                <td className="apertado">{s.ordem}</td>
                <td>{s.aulas || <span className="suave">nenhuma</span>}</td>
                <td>
                  <div className="acoes-linha">
                    <EdicaoNaLinha acao={acaoEditarModuloLinha} nome={s.nome} ordem={s.ordem}
                                   oQue={`o módulo ${s.nome}`}>
                      <input type="hidden" name="materiaId" value={materiaId} />
                      <input type="hidden" name="id" value={s.id} />
                    </EdicaoNaLinha>
                    {s.aulas === 0 && (
                      <form action={acaoExcluirModulo}>
                        <input type="hidden" name="id" value={s.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {modulos.length === 0 && <tr><td colSpan={4}><div className="vazio">Nenhum módulo — a aula precisa de um.</div></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Aulas</h2>
        <table className="tabela">
          <thead><tr><th>Aula</th><th>Módulo</th><th>Duração</th><th>Vídeo</th><th>Exercício</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>
            {aulas.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/empresa/trilhas/aula/${a.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{a.titulo}</Link>
                </td>
                <td>{a.assuntoNome}</td>
                <td className="apertado">{formatarDuracao(a.duracaoSegundos)}</td>
                <td>{a.videoId
                  ? <span className="chip chip-sm chip-secundaria">enviado</span>
                  : <span className="suave">sem vídeo</span>}</td>
                <td>{a.questoes ? `${a.questoes} questão(ões)` : <span className="chip chip-sm chip-erro">sem questão</span>}</td>
                <td><span className={`chip chip-sm ${CHIP[a.status]}`}>{a.status.replace('_', ' ')}</span></td>
                <td>
                  <div className="acoes-linha">
                    <LinkIcone href={`/empresa/trilhas/aula/${a.id}`} icone="movie" rotulo="Abrir a aula (vídeo e exercício)" />
                    <BotaoStatusAula acao={acaoStatusAula} aulaId={a.id} publicada={a.status === 'publicado'} compacto />
                  </div>
                </td>
              </tr>
            ))}
            {aulas.length === 0 && <tr><td colSpan={7}><div className="vazio">Nenhuma aula ainda.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {modulos.length > 0 && (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 16 }}>Nova aula</h2>
          <FormAula acao={acaoCriarAula} assuntos={modulos} portalId={portal.id} assuntoPadrao={modulos[0]?.id} empresa />
        </div>
      )}

      <div className="cartao" style={{ marginBottom: 0 }} id="avaliacao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Avaliação final</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          A prova que fecha a trilha. Quem atinge a nota mínima conclui e recebe o
          certificado com a chancela da empresa; sem avaliação publicada, a trilha não gera
          conclusão. As questões seguem a regra das aulas: comentário em toda alternativa.
        </p>
        <FormAvaliacao acao={acaoSalvarAvaliacao} materiaId={materiaId} avaliacao={avaliacao} />
        {avaliacao && (
          <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
            <h3 className="headline-md">Questões da avaliação ({questoes.length})</h3>
            <Exercicio questoes={questoes} portalId={portal.id} aulaId={0} avaliacaoId={avaliacao.id}
              salvar={acaoSalvarQuestao} excluir={acaoExcluirQuestao} />
          </div>
        )}
      </div>
    </>
  );
}
