import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone } from '../../ui.tsx';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../lib/empresa.ts';
import { listarSetores } from '../../../lib/empresa-equipe.ts';
import { resumoPorTrilha, progressoPorPessoa } from '../../../lib/empresa-relatorio.ts';
import { listarMaterias } from '../../../lib/admin-cursos.ts';

export const metadata: Metadata = { title: 'Acompanhamento — Painel da empresa' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const SITUACAO: Record<string, { chip: string; texto: string }> = {
  concluida: { chip: 'chip-secundaria', texto: 'concluída' },
  atrasada: { chip: 'chip-erro', texto: 'atrasada' },
  em_andamento: { chip: 'chip-terciaria', texto: 'em andamento' },
  nao_iniciada: { chip: 'chip-neutra', texto: 'não iniciada' },
};

/**
 * Acompanhamento — §5.11, etapa 6.
 *
 * Dois níveis, porque o RH pergunta duas coisas diferentes: "como vai
 * cada treinamento?" (por trilha) e "e a fulana?" (por pessoa). Nenhum
 * número é contador guardado: tudo sai da licença, do progresso e da
 * conclusão, que são os mesmos fatos que a tela do colaborador mostra.
 */
export default async function AcompanhamentoDaEmpresa(
  { searchParams }: { searchParams: Promise<{ setor?: string; trilha?: string; q?: string }> },
) {
  const { setor = '', trilha = '', q = '' } = await searchParams;
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const setorId = setor ? Number(setor) : null;
  const materiaId = trilha ? Number(trilha) : null;

  const [porTrilha, linhas, setores, trilhas] = await Promise.all([
    resumoPorTrilha(portal.id),
    progressoPorPessoa(portal.id, { setorId, materiaId, busca: q }),
    listarSetores(portal.id), listarMaterias(portal.id),
  ]);

  const totais = {
    atribuidos: linhas.length,
    concluidos: linhas.filter((l) => l.situacao === 'concluida').length,
    atrasados: linhas.filter((l) => l.situacao === 'atrasada').length,
    naoIniciados: linhas.filter((l) => l.situacao === 'nao_iniciada').length,
  };
  const filtro = new URLSearchParams(
    Object.entries({ setor, trilha, q }).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Acompanhamento</h1>
          <p className="suave">Quem recebeu, quem começou, quem terminou — e quem está atrasado.</p>
        </div>
        <div className="acoes">
          <a className="btn btn-contorno" href={`/empresa/acompanhamento/csv${filtro ? `?${filtro}` : ''}`}>
            <Icone nome="download" tamanho={20} /> Exportar CSV
          </a>
        </div>
      </div>

      <div className="grade-4" style={{ marginBottom: 24 }}>
        {[
          { r: 'ATRIBUÍDAS', v: totais.atribuidos, d: 'pessoa × trilha' },
          { r: 'CONCLUÍDAS', v: totais.concluidos, d: 'com certificado emitido' },
          { r: 'ATRASADAS', v: totais.atrasados, d: 'prazo vencido sem conclusão' },
          { r: 'NÃO INICIADAS', v: totais.naoIniciados, d: 'liberadas e nunca abertas' },
        ].map((c) => (
          <div className="cartao" key={c.r}>
            <span className="label-md suave">{c.r}</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>{c.v}</div>
            <p className="caption suave">{c.d}</p>
          </div>
        ))}
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Por trilha</h2>
        <table className="tabela">
          <thead>
            <tr><th>Trilha</th><th>Aulas no ar</th><th>Avaliação</th><th>Atribuídos</th><th>Iniciaram</th><th>Concluíram</th><th>Atrasados</th></tr>
          </thead>
          <tbody>
            {porTrilha.map((t) => (
              <tr key={t.materiaId}>
                <td>
                  <strong>{t.nome}</strong>
                  {t.status !== 'publicado' && <span className="chip chip-sm chip-neutra" style={{ marginLeft: 8 }}>rascunho</span>}
                </td>
                <td className="apertado">{t.aulasPublicadas}</td>
                <td>{t.temAvaliacao
                  ? <span className="chip chip-sm chip-secundaria">no ar</span>
                  : <span className="suave">sem avaliação</span>}</td>
                <td className="apertado">{t.atribuidos}</td>
                <td className="apertado">{t.iniciados}</td>
                <td className="apertado"><strong>{t.concluidos}</strong></td>
                <td className="apertado">{t.atrasados > 0
                  ? <span className="chip chip-sm chip-erro">{t.atrasados}</span>
                  : <span className="suave">0</span>}</td>
              </tr>
            ))}
            {porTrilha.length === 0 && <tr><td colSpan={7}><div className="vazio">Nenhuma trilha cadastrada.</div></td></tr>}
          </tbody>
        </table>
        <p className="caption suave" style={{ marginTop: 12 }}>
          Trilha sem avaliação publicada não gera conclusão nem certificado — as aulas
          contam progresso, mas a aprovação depende da prova.
        </p>
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Por pessoa</h2>
        <form className="form-linha" method="get" style={{ margin: '12px 0 20px' }}>
          <div className="campos">
            <label>
              Buscar
              <input name="q" defaultValue={q} placeholder="nome ou e-mail" />
            </label>
            <label>
              Setor
              <select name="setor" defaultValue={setor}>
                <option value="">todos</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </label>
            <label>
              Trilha
              <select name="trilha" defaultValue={trilha}>
                <option value="">todas</option>
                {trilhas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </label>
            <button className="btn btn-contorno" type="submit">Filtrar</button>
          </div>
        </form>
        <table className="tabela">
          <thead>
            <tr><th>Pessoa</th><th>Setor</th><th>Trilha</th><th>Progresso</th><th>Nota</th><th>Prazo</th><th>Situação</th><th>Certificado</th></tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={`${l.usuarioId}-${l.materiaId}`}>
                <td>{l.nome}<br /><span className="suave">{l.email}</span></td>
                <td>{l.setorNome ?? <span className="suave">—</span>}</td>
                <td>
                  {l.trilha}
                  {l.obrigatoria && <span className="chip chip-sm chip-primaria" style={{ marginLeft: 6 }}>obrigatória</span>}
                </td>
                <td className="apertado">
                  {l.aulasConcluidas}/{l.aulasTotal} aulas
                  <div className="progresso" style={{ marginTop: 4 }}><i style={{ width: `${l.percentual}%` }} /></div>
                </td>
                <td className="apertado">{l.nota !== null ? `${l.nota}%` : '—'}
                  {l.tentativas > 0 && <><br /><span className="caption suave">{l.tentativas} tentativa(s)</span></>}
                </td>
                <td className="apertado suave">{DATA(l.prazoEm)}</td>
                <td><span className={`chip chip-sm ${SITUACAO[l.situacao].chip}`}>{SITUACAO[l.situacao].texto}</span></td>
                <td className="apertado">
                  {l.codigoCertificado
                    ? <Link href={`/certificado/${l.codigoCertificado}`} className="mono">{l.codigoCertificado}</Link>
                    : <span className="suave">—</span>}
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={8}><div className="vazio">
                Ninguém com esses filtros. Trilha liberada aparece aqui assim que a atribuição é feita.
              </div></td></tr>
            )}
          </tbody>
        </table>
        <p className="caption suave" style={{ marginTop: 12 }}>
          Uma linha por pessoa e trilha. A exportação em CSV respeita os filtros da tela e
          abre direto no Excel.
        </p>
      </div>
    </>
  );
}
