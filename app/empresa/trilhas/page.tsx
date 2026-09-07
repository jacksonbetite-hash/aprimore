import Link from 'next/link';
import type { Metadata } from 'next';
import FormArea from '../../admin/cursos/FormArea.tsx';
import FormMateria from '../../admin/cursos/FormMateria.tsx';
import { BotaoIcone, LinkIcone, EdicaoNaLinha } from '../../ui.tsx';
import {
  acaoSalvarArea, acaoEditarAreaLinha, acaoExcluirArea, acaoCriarTrilha, acaoStatusTrilha,
} from '../acoes.ts';
import { listarAreas, listarMaterias } from '../../../lib/admin-cursos.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../lib/empresa.ts';

export const metadata: Metadata = { title: 'Trilhas e aulas — Painel da empresa' };
export const dynamic = 'force-dynamic';

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria', rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria', aprovado: 'chip-primaria', arquivado: 'chip-neutra',
};

/**
 * As trilhas da empresa — §5.11, etapa 3. É o acervo do professor com
 * outros nomes na tela (trilha → módulo → aula) e sem a vitrine: o
 * mesmo formulário, o mesmo banco, o mesmo isolamento por portal.
 */
export default async function TrilhasDaEmpresa() {
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const [areas, trilhas] = await Promise.all([listarAreas(portal.id), listarMaterias(portal.id)]);
  const invisiveis = trilhas.filter((m) => m.status === 'publicado' && m.aulasPublicadas === 0);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Trilhas e aulas</h1>
          <p className="suave">
            {areas.length} área(s) · {trilhas.length} trilha(s). Publicar é direto; liberar
            para a equipe é outro passo, em <Link href="/empresa/atribuicoes">Liberar trilhas</Link>.
          </p>
        </div>
      </div>

      {invisiveis.length > 0 && (
        <p className="alerta alerta-erro">
          <strong>
            {invisiveis.length === 1
              ? 'Uma trilha publicada ainda não aparece para a equipe'
              : `${invisiveis.length} trilhas publicadas ainda não aparecem para a equipe`}:{' '}
            {invisiveis.map((m) => m.nome).join(', ')}.
          </strong>{' '}
          O portal só mostra trilha que já tem <em>aula publicada</em>. Abra a trilha, crie
          um <strong>módulo</strong>, crie a <strong>aula</strong> (é dentro dela que se envia
          o vídeo) e publique a aula.
        </p>
      )}

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Áreas</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Como as trilhas se agrupam para o colaborador: Integração, Conformidade, Liderança…
          Para trocar o nome ou a ordem, use o lápis na coluna Ações.
        </p>
        <FormArea acao={acaoSalvarArea} portalId={portal.id} />
        <table className="tabela" style={{ marginTop: 16 }}>
          <thead><tr><th>Área</th><th>Ordem</th><th>Trilhas</th><th>Ações</th></tr></thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.nome}</strong></td>
                <td className="apertado">{a.ordem}</td>
                <td>{a.materias || <span className="suave">nenhuma</span>}</td>
                <td>
                  <div className="acoes-linha">
                    <EdicaoNaLinha acao={acaoEditarAreaLinha} nome={a.nome} ordem={a.ordem}
                                   oQue={`a área ${a.nome}`}>
                      <input type="hidden" name="id" value={a.id} />
                    </EdicaoNaLinha>
                    {a.materias === 0 && (
                      <form action={acaoExcluirArea}>
                        <input type="hidden" name="id" value={a.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {areas.length === 0 && <tr><td colSpan={4}><div className="vazio">Crie a primeira área — a trilha precisa de uma.</div></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Trilhas</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          O vídeo não fica aqui: ele é <strong>de cada aula</strong>. Abra a trilha → crie o
          módulo → crie a aula → dentro da aula está o envio do arquivo de vídeo.
        </p>
        <table className="tabela">
          <thead><tr><th>Trilha</th><th>Área</th><th>Aulas no ar</th><th>Avaliação</th><th>Situação</th><th>Para a equipe</th><th>Ações</th></tr></thead>
          <tbody>
            {trilhas.map((m) => {
              const noAr = m.status === 'publicado' && m.aulasPublicadas > 0;
              return (
                <tr key={m.id}>
                  <td>
                    <Link href={`/empresa/trilhas/${m.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>{m.nome}</Link>
                  </td>
                  <td>{m.areaNome}</td>
                  <td className="apertado">{m.aulasPublicadas}/{m.aulas}</td>
                  <td>{m.avaliacaoPublicada
                    ? <span className="chip chip-sm chip-secundaria">no ar</span>
                    : <span className="suave">sem avaliação</span>}</td>
                  <td><span className={`chip chip-sm ${CHIP[m.status]}`}>{m.status.replace('_', ' ')}</span></td>
                  <td>
                    {noAr
                      ? <span className="chip chip-sm chip-secundaria">visível</span>
                      : m.status !== 'publicado'
                        ? <span className="suave">não — trilha {m.status.replace('_', ' ')}</span>
                        : <span className="chip chip-sm chip-erro">sem aula publicada</span>}
                  </td>
                  <td>
                    <div className="acoes-linha">
                      <LinkIcone href={`/empresa/trilhas/${m.id}`} icone="menu_book" rotulo="Módulos, aulas e avaliação" />
                      <form action={acaoStatusTrilha}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="status" value={m.status === 'publicado' ? 'rascunho' : 'publicado'} />
                        <BotaoIcone
                          icone={m.status === 'publicado' ? 'visibility_off' : 'visibility'}
                          rotulo={m.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                          variante={m.status === 'publicado' ? 'contorno' : 'primario'} />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {trilhas.length === 0 && <tr><td colSpan={7}><div className="vazio">Nenhuma trilha ainda.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {areas.length > 0 && (
        <div className="cartao" style={{ marginBottom: 0 }}>
          <h2 className="headline-md" style={{ marginBottom: 16 }}>Nova trilha</h2>
          <FormMateria acao={acaoCriarTrilha} areas={areas} portalId={portal.id} ehPlataforma={false} empresa />
        </div>
      )}
    </>
  );
}
