import Link from 'next/link';
import type { Metadata } from 'next';
import Enviar from '../Enviar.tsx';
import { acaoRemoverVideo } from '../acoes.ts';
import { aulasDoPortal, type AulaComVideo } from '../../../lib/video-aula.ts';
import { listarMaterias } from '../../../lib/admin-cursos.ts';
import { urlDeReproducao } from '../../../lib/video.ts';
import { formatarDuracao } from '../../../lib/catalogo.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDoProfessor } from '../../../lib/professor.ts';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Vídeos das aulas — Painel do professor' };

const MB = (bytes: number) => (bytes / 1024 ** 2).toFixed(bytes < 1024 ** 2 ? 2 : 1) + ' MB';

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria', rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria', aprovado: 'chip-primaria', arquivado: 'chip-neutra',
};

/**
 * Onde o professor anexa, confere, troca e tira o vídeo de cada aula
 * (§5.10 — autonomia sobre o próprio acervo).
 *
 * O vídeo continua pertencendo à AULA: é ali que o aluno assiste, e é o
 * que o envio grava. O que esta tela acrescenta é a visão de cima —
 * todas as aulas do portal numa lista, com quem já tem gravação e quem
 * não tem —, porque procurar curso por curso pela aula sem vídeo era
 * exatamente o que fazia o professor não achar "onde anexa o vídeo".
 */
export default async function VideosDoProfessor() {
  const u = (await alunoAtual())!;
  const portal = await portalDoProfessor(u.id);
  if (!portal) redirect('/professor');   // o professor do catálogo não tem esta tela
  const [aulas, materias] = await Promise.all([aulasDoPortal(portal.id), listarMaterias(portal.id)]);

  const comVideo = aulas.filter((a) => a.videoId && !a.arquivoAusente);
  const semVideo = aulas.filter((a) => !a.videoId);
  const ausentes = aulas.filter((a) => a.arquivoAusente);
  const ocupado = comVideo.reduce((t, a) => t + (a.bytes ?? 0), 0);
  const semAula = materias.filter((m) => m.aulas === 0);

  // Uma seção por curso, na ordem em que o portal os mostra.
  const cursos: { id: number; nome: string; status: string; aulas: AulaComVideo[] }[] = [];
  for (const a of aulas) {
    const atual = cursos.at(-1);
    if (atual?.id === a.materiaId) atual.aulas.push(a);
    else cursos.push({ id: a.materiaId, nome: a.materiaNome, status: a.materiaStatus, aulas: [a] });
  }

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Vídeos das aulas</h1>
          <p className="suave">
            {aulas.length} aula(s) · {comVideo.length} com gravação · {semVideo.length} sem ·{' '}
            {MB(ocupado)} no seu armazenamento
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href="/professor/cursos">Cursos e aulas</Link>
        </div>
      </div>

      {/* O texto vai dentro de um <span> porque `.alerta` é flex: solto,
          cada <strong> viraria uma coluna. */}
      <p className="alerta" style={{ background: 'var(--surface-container)' }}>
        <span>
          <strong>O vídeo é de cada aula.</strong> Aqui estão todas as suas aulas: escolha o
          arquivo na linha da aula e ele é enviado e vinculado na hora. <strong>Enviar outro
          substitui</strong> o atual, e o antigo sai do disco (e da sua cota). MP4 (H.264) ou
          WebM, até 2 GB por arquivo. O aluno recebe o vídeo por endereço assinado, com prazo —
          nunca por link público.
        </span>
      </p>

      {ausentes.length > 0 && (
        <p className="alerta alerta-erro">
          <span>
            <strong>
              {ausentes.length === 1
                ? 'Uma aula aponta para um arquivo que não está no armazenamento'
                : `${ausentes.length} aulas apontam para arquivos que não estão no armazenamento`}.
            </strong>{' '}
            O aluno vê a página da aula sem gravação. Envie o arquivo de novo na linha da aula.
          </span>
        </p>
      )}

      {aulas.length === 0 && (
        <div className="cartao">
          <h2 className="headline-md" style={{ marginBottom: 6 }}>Você ainda não tem aulas</h2>
          <p className="suave" style={{ marginBottom: 16 }}>
            O vídeo se anexa a uma aula, então o caminho é este, e é curto:{' '}
            <strong>curso → assunto → aula → vídeo → publicar</strong>.
            {semAula.length > 0 && <> Os seus cursos já criados ainda não têm aula: {semAula.map((m) => m.nome).join(', ')}.</>}
          </p>
          <Link className="btn btn-primario" href="/professor/cursos">Ir para Cursos e aulas</Link>
        </div>
      )}

      {cursos.map((c) => (
        <div className="cartao" key={c.id}>
          <div className="cabecalho-tela" style={{ marginBottom: 16 }}>
            <div>
              <h2 className="headline-md">{c.nome}</h2>
              <p className="caption suave">
                {c.aulas.filter((a) => a.videoId && !a.arquivoAusente).length}/{c.aulas.length} aula(s) com gravação
                {' · '}<span className={`chip chip-sm ${CHIP[c.status] ?? 'chip-neutra'}`}>{c.status.replace('_', ' ')}</span>
              </p>
            </div>
            <div className="acoes">
              <Link className="btn btn-contorno btn-sm" href={`/professor/cursos/${c.id}`}>Abrir o curso</Link>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {c.aulas.map((a) => (
              <div className="cartao-video" key={a.id}>
                <div className="pilha-sm">
                  <div>
                    <Link href={`/professor/cursos/aula/${a.id}`}
                          style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{a.titulo}</Link>
                    <br />
                    <span className="caption suave">
                      {a.assuntoNome} · {formatarDuracao(a.duracaoSegundos)} ·{' '}
                      <span className={`chip chip-sm ${CHIP[a.status] ?? 'chip-neutra'}`}>{a.status.replace('_', ' ')}</span>
                    </span>
                  </div>

                  {a.arquivoAusente ? (
                    <p className="caption" style={{ color: 'var(--error)' }}>
                      Arquivo <code>{a.videoId}</code> não encontrado no armazenamento — envie de novo.
                    </p>
                  ) : a.videoId ? (
                    <>
                      <p className="caption suave">
                        Arquivo: <code>{a.videoId}</code>
                        {a.bytes !== null && <> · {MB(a.bytes)}</>}
                      </p>
                      {/* `preload="none"`: a conferência só baixa bytes se o
                          professor der o play — e banda é insumo da fatura
                          do portal, inclusive a que ele mesmo assiste. */}
                      {a.videoProvedor === 'LOCAL' && (
                        <video controls preload="none" playsInline
                               src={urlDeReproducao({ provedor: 'LOCAL', id: a.videoId }, u.id)} />
                      )}
                    </>
                  ) : (
                    <p className="caption suave">
                      Sem gravação. A página da aula funciona assim mesmo (resumo e exercício),
                      mas a aula em vídeo é o produto.
                    </p>
                  )}
                </div>

                <div className="pilha-sm">
                  <Enviar tipo="video" aulaId={a.id}
                          rotulo={a.videoId ? 'Trocar o vídeo desta aula' : 'Enviar o vídeo desta aula'}
                          aceita="video/mp4,video/webm,.mp4,.m4v,.webm" />
                  {a.videoId && (
                    <form action={acaoRemoverVideo}>
                      <input type="hidden" name="aulaId" value={a.id} />
                      <button className="btn btn-contorno btn-sm" type="submit">
                        Tirar o vídeo desta aula
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
