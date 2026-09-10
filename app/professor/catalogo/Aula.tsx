import Link from 'next/link';
import { notFound } from 'next/navigation';
import FormAula from '../../admin/cursos/FormAula.tsx';
import Exercicio from '../../admin/cursos/Exercicio.tsx';
import Enviar from '../Enviar.tsx';
import {
  acaoEditarAulaCatalogo, acaoStatusAulaCatalogo, acaoSalvarQuestaoCatalogo,
  acaoExcluirQuestaoCatalogo, acaoRemoverVideoCatalogo,
} from '../acoes-catalogo.ts';
import { buscarAula, listarAssuntos, exercicioDaAula } from '../../../lib/admin-cursos.ts';
import { PORTAL_PLATAFORMA } from '../../../lib/portal.ts';
import { queryOne } from '../../../lib/db.ts';
import type { Aluno } from '../../../lib/sessao.ts';

/** Uma aula do professor do catálogo (etapa 5): posse conferida antes de mostrar. */
export default async function AulaCatalogo({ u, aulaId, criada }: { u: Aluno; aulaId: number; criada?: string }) {
  const dono = await queryOne(
    `SELECT 1 FROM aula au JOIN assunto s ON s.id = au.assunto_id JOIN materia m ON m.id = s.materia_id
      WHERE au.id = $1 AND m.portal_id = 0 AND m.professor_id = $2`, [aulaId, u.id]);
  if (!dono) notFound();
  const aula = await buscarAula(PORTAL_PLATAFORMA, aulaId);
  if (!aula) notFound();
  const [assuntos, questoes] = await Promise.all([
    listarAssuntos(PORTAL_PLATAFORMA, aula.materiaId), exercicioDaAula(PORTAL_PLATAFORMA, aulaId),
  ]);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">{aula.titulo}</h1>
          <p className="suave">{aula.materiaNome} · {aula.assuntoNome} · {questoes.length} questão(ões)</p>
        </div>
        <div className="acoes">
          <form action={acaoStatusAulaCatalogo}>
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
            ? <>Vídeo atual: <code>{aula.videoId}</code>. Enviar outro substitui.</>
            : 'Esta aula ainda não tem vídeo. A página funciona sem ele (resumo e exercício), mas a aula em vídeo é o produto.'}
        </p>
        <Enviar tipo="video" aulaId={aula.id}
                rotulo={aula.videoId ? 'Trocar o arquivo de vídeo' : 'Enviar arquivo de vídeo'}
                aceita="video/mp4,video/webm,.mp4,.m4v,.webm"
                dica="MP4 (H.264) ou WebM, até 2 GB. Fica no nosso volume e é entregue por endereço assinado, com prazo." />
        {aula.videoId && (
          <form action={acaoRemoverVideoCatalogo} style={{ marginTop: 12 }}>
            <input type="hidden" name="aulaId" value={aula.id} />
            <button className="btn btn-contorno btn-sm" type="submit">Tirar o vídeo desta aula</button>
          </form>
        )}
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados da aula</h2>
        <FormAula acao={acaoEditarAulaCatalogo} assuntos={assuntos} portalId={PORTAL_PLATAFORMA} aula={aula} />
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Exercício</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Toda aula termina em exercício comentado — inclusive nas alternativas erradas. Sem
          pelo menos uma questão, a aula não vai ao ar.
        </p>
        <div style={{ display: 'grid', gap: 16 }}>
          <Exercicio questoes={questoes} portalId={PORTAL_PLATAFORMA} aulaId={aulaId}
                     salvar={acaoSalvarQuestaoCatalogo} excluir={acaoExcluirQuestaoCatalogo} />
        </div>
      </div>
    </>
  );
}
