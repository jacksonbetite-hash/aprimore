import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FormMateria from '../../../admin/cursos/FormMateria.tsx';
import FormAssunto from '../../../admin/cursos/FormAssunto.tsx';
import FormAula from '../../../admin/cursos/FormAula.tsx';
import { BotaoIcone, LinkIcone, EdicaoNaLinha } from '../../../ui.tsx';
import Enviar from '../../Enviar.tsx';
import {
  acaoEditarMateria, acaoSalvarAssunto, acaoEditarAssuntoLinha, acaoExcluirAssunto,
  acaoCriarAula, acaoStatusAula,
} from '../../acoes.ts';
import {
  buscarMateria, listarAreas, listarAssuntos, listarAulas, niveisDoPortal,
} from '../../../../lib/admin-cursos.ts';
import { formatarDuracao } from '../../../../lib/catalogo.ts';
import { alunoAtual } from '../../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../../lib/professor.ts';
import { enderecoDoPortal } from '../../../../lib/portal-consultas.ts';
import CursoCatalogo from '../../catalogo/Curso.tsx';

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
  const materiaId = Number(id);
  if (!Number.isInteger(materiaId)) notFound();
  const portal = await portalDoProfessor(u.id);
  if (!portal) return <CursoCatalogo u={u} materiaId={materiaId} criada={criada} />;

  // `buscarMateria(portal.id, …)` só acha curso DESTE portal: id de curso
  // alheio na URL simplesmente não encontra a linha.
  const [materia, areas, assuntos, aulas, niveis] = await Promise.all([
    buscarMateria(portal.id, materiaId), listarAreas(portal.id),
    listarAssuntos(portal.id, materiaId), listarAulas(portal.id, materiaId),
    niveisDoPortal(portal.id),
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

      {/* A capa do curso (docs/plano-vitrine-do-professor.md, fase 3a).
          Até aqui ela só saía de um quadro do vídeo, e não havia como
          corrigir: o quadro acerta na média e erra feio no caso ruim —
          slide preto, rosto no meio de uma palavra, transição. Agora o
          quadro é a RESERVA, e o que o professor enviar manda nela. */}
      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Capa do curso</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          A imagem do cartão deste curso na sua página e no catálogo. Sem capa enviada, ela
          sai sozinha de um quadro do vídeo da primeira aula; sem vídeo, entra o desenho da
          área. O que você enviar aqui passa na frente das duas.
        </p>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {materia.capa ? (
            <img src={materia.capa} alt="Capa atual do curso" width={240} height={135}
                 style={{ borderRadius: 'var(--r-md)', objectFit: 'cover', border: '1px solid var(--surface-variant)' }} />
          ) : (
            <div style={{
              width: 240, height: 135, borderRadius: 'var(--r-md)', display: 'grid',
              placeItems: 'center', background: 'var(--surface-container)',
              color: 'var(--on-surface-variant)', fontSize: 13, textAlign: 'center', padding: 8,
            }}>
              sem capa — o cartão está usando o desenho da área
            </div>
          )}
          <div style={{ flex: 1, minWidth: 260 }}>
            {/* `materiaId` daqui, e não `materia.id`: o id é BIGINT e chega
                como texto na projeção; o da URL já veio por Number(). */}
            <Enviar tipo="imagem" materiaId={materiaId} rotulo="Enviar capa"
                    aceita="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    dica="JPG, PNG ou WebP, até 5 MB. Proporção 16:9 — o cartão mostra cerca de 320 × 180 px, então use pelo menos 640 × 360 px; 1280 × 720 px é o ideal. Enviar outra substitui a atual." />
          </div>
        </div>
      </div>

      {/* A prévia do cartão (docs/plano-catalogo-streaming.md). O controle
          dela não é novo — é o marcador "amostra gratuita" da aula, que
          já existia. O que faltava era dizer, aqui, QUAL aula ele
          escolheu: sem esta linha o professor vê um vídeo rodando no
          cartão do catálogo e não tem como saber de onde ele sai. */}
      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Prévia do cartão</h2>
        <p className="caption suave" style={{ marginBottom: 12 }}>
          No catálogo, quem passa o mouse sobre a capa deste curso vê um trecho rodando ali
          mesmo, sem sair da página. O trecho é sempre a <strong>primeira aula marcada como
          amostra gratuita</strong> que tenha vídeo — a única que pode ser vista por quem não
          assinou. Para trocar, abra a aula e mova o marcador “amostra gratuita”.
        </p>
        {materia.previaAula ? (
          <p className="alerta alerta-ok" role="status" style={{ marginBottom: 0 }}>
            Rodando no cartão: <strong>{materia.previaAula}</strong>
          </p>
        ) : (
          <p className="alerta" style={{ background: 'var(--surface-container)', marginBottom: 0 }}>
            Nenhuma aula deste curso é amostra gratuita com vídeo — o cartão mostra só a capa,
            parada. Marque uma aula como amostra para ela virar a prévia.
          </p>
        )}
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Dados do curso</h2>
        <FormMateria acao={acaoEditarMateria} areas={areas} portalId={portal.id} materia={materia}
                     ehPlataforma={false} niveis={niveis} />
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
