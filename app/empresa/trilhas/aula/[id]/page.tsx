import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FormAula from '../../../../admin/cursos/FormAula.tsx';
import Exercicio from '../../../../admin/cursos/Exercicio.tsx';
import Enviar from '../../../../professor/Enviar.tsx';
import BotaoStatusAula from '../../BotaoStatusAula.tsx';
import { acaoEditarAula, acaoStatusAula, acaoSalvarQuestao, acaoExcluirQuestao } from '../../../acoes.ts';
import { buscarAula, listarAssuntos, exercicioDaAula } from '../../../../../lib/admin-cursos.ts';
import { alunoAtual } from '../../../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../../../lib/empresa.ts';
import { enderecoDoPortal } from '../../../../../lib/portal-consultas.ts';

export const metadata: Metadata = { title: 'Aula — Painel da empresa' };
export const dynamic = 'force-dynamic';

export default async function AulaDaEmpresa(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> },
) {
  const { id } = await params;
  const { criada } = await searchParams;
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const aulaId = Number(id);
  if (!Number.isInteger(aulaId)) notFound();

  const aula = await buscarAula(portal.id, aulaId);
  if (!aula) notFound();
  const [modulos, questoes] = await Promise.all([
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
          <BotaoStatusAula acao={acaoStatusAula} aulaId={aula.id} publicada={aula.status === 'publicado'} />
          <Link className="btn btn-contorno" href={`/empresa/trilhas/${aula.materiaId}`}>Voltar à trilha</Link>
        </div>
      </div>

      {criada && <p className="alerta alerta-ok" role="status">Aula criada. Envie o vídeo e cadastre o exercício — só então ela pode ser publicada.</p>}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Vídeo da aula</h2>
        <p className="caption suave" style={{ marginBottom: 12 }}>
          {aula.videoProvedor && aula.videoId
            ? <>Vídeo atual: <code>{aula.videoId}</code>. Enviar outro substitui.</>
            : 'Esta aula ainda não tem vídeo. A página funciona sem ele (resumo e exercício), mas a aula em vídeo é o produto.'}
        </p>
        <Enviar tipo="video" aulaId={aula.id} rotulo="Enviar arquivo de vídeo"
                aceita="video/mp4,video/webm,.mp4,.m4v,.webm"
                dica="MP4 (H.264) ou WebM, até 2 GB. O arquivo fica no volume da plataforma e é entregue ao colaborador por endereço assinado, com prazo — nunca por link público." />
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados da aula</h2>
        <FormAula acao={acaoEditarAula} assuntos={modulos} portalId={portal.id} aula={aula} empresa />
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
