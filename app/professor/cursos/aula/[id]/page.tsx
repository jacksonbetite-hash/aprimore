import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FormAula from '../../../../admin/cursos/FormAula.tsx';
import Exercicio from '../../../../admin/cursos/Exercicio.tsx';
import Enviar from '../../../Enviar.tsx';
import {
  acaoEditarAula, acaoStatusAula, acaoSalvarQuestao, acaoExcluirQuestao, acaoRemoverVideo,
} from '../../../acoes.ts';
import { buscarAula, listarAssuntos, exercicioDaAula } from '../../../../../lib/admin-cursos.ts';
import { alunoAtual } from '../../../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../../../lib/professor.ts';
import { enderecoDoPortal } from '../../../../../lib/portal-consultas.ts';
import AulaCatalogo from '../../../catalogo/Aula.tsx';

export const metadata: Metadata = { title: 'Aula — Painel do professor' };

export default async function AulaDoProfessor(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> },
) {
  const { id } = await params;
  const { criada } = await searchParams;
  const u = (await alunoAtual())!;
  const aulaId = Number(id);
  if (!Number.isInteger(aulaId)) notFound();
  const portal = await portalDoProfessor(u.id);
  if (!portal) return <AulaCatalogo u={u} aulaId={aulaId} criada={criada} />;

  const aula = await buscarAula(portal.id, aulaId);
  if (!aula) notFound();
  const [assuntos, questoes] = await Promise.all([
    listarAssuntos(portal.id, aula.materiaId), exercicioDaAula(portal.id, aulaId),
  ]);
  const endereco = await enderecoDoPortal(portal.mascara);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">{aula.titulo}</h1>
          <p className="suave">{aula.materiaNome} · {aula.assuntoNome} · {questoes.length} questão(ões)</p>
        </div>
        <div className="acoes">
          {aula.status === 'publicado' && (
            <a className="btn btn-contorno" href={`${endereco}/aula/${aula.slug}`} target="_blank" rel="noreferrer">Ver no portal</a>
          )}
          <form action={acaoStatusAula}>
            <input type="hidden" name="id" value={aula.id} />
            <input type="hidden" name="status" value={aula.status === 'publicado' ? 'rascunho' : 'publicado'} />
            <button className={`btn ${aula.status === 'publicado' ? 'btn-contorno' : 'btn-primario'}`} type="submit">
              {aula.status === 'publicado' ? 'Despublicar' : 'Publicar'}
            </button>
          </form>
          <Link className="btn btn-contorno" href={`/professor/cursos/${aula.materiaId}`}>Voltar ao curso</Link>
        </div>
      </div>

      {criada && <p className="alerta alerta-ok" role="status">Aula criada. Falta o exercício, logo abaixo.</p>}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Vídeo da aula</h2>
        <p className="caption suave" style={{ marginBottom: 12 }}>
          {aula.videoProvedor && aula.videoId
            ? <>Vídeo atual: <code>{aula.videoId}</code> ({aula.videoProvedor}). Enviar outro substitui.</>
            : 'Esta aula ainda não tem vídeo. A página funciona sem ele (resumo e exercício), mas a aula em vídeo é o produto.'}
        </p>
        <Enviar tipo="video" aulaId={aula.id}
                rotulo={aula.videoId ? 'Trocar o arquivo de vídeo' : 'Enviar arquivo de vídeo'}
                aceita="video/mp4,video/webm,.mp4,.m4v,.webm"
                dica="MP4 (H.264) ou WebM, até 2 GB. O arquivo fica no nosso volume e é entregue ao aluno por endereço assinado, com prazo — nunca por link público." />
        {/* Trocar já dava para fazer (enviar outro substitui); tirar, não.
            O par completo é o que o §5.10 chama de autonomia sobre o
            próprio acervo. */}
        {aula.videoId && (
          <form action={acaoRemoverVideo} style={{ marginTop: 12 }}>
            <input type="hidden" name="aulaId" value={aula.id} />
            <button className="btn btn-contorno btn-sm" type="submit">Tirar o vídeo desta aula</button>
          </form>
        )}
        <p className="caption suave" style={{ marginTop: 12 }}>
          Todas as suas aulas, com quem já tem gravação e quem não tem, ficam em{' '}
          <Link href="/professor/videos">Vídeos das aulas</Link>.
        </p>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados da aula</h2>
        <FormAula acao={acaoEditarAula} assuntos={assuntos} portalId={portal.id} aula={aula} />
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Exercício</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Toda aula termina em exercício comentado — inclusive nas alternativas erradas. Sem
          pelo menos uma questão, a aula não vai ao ar.
        </p>
        <div style={{ display: 'grid', gap: 16 }}>
          <Exercicio questoes={questoes} portalId={portal.id} aulaId={aulaId}
            salvar={acaoSalvarQuestao} excluir={acaoExcluirQuestao} />
        </div>
      </div>
    </>
  );
}
