import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone, BotaoIcone, LinkIcone, EdicaoNaLinha } from '../../ui.tsx';
import SeletorPortal from './SeletorPortal.tsx';
import FormArea from './FormArea.tsx';
import {
  acaoSalvarArea, acaoEditarAreaLinha, acaoExcluirArea, acaoStatusMateria,
} from './acoes.ts';
import { listarAreas, listarMaterias } from '../../../lib/admin-cursos.ts';
import { portaisParaEscolha } from '../../../lib/admin-portais.ts';
import { PORTAL_PLATAFORMA } from '../../../lib/portal.ts';

export const metadata: Metadata = { title: 'Cursos e aulas — Administração' };
export const dynamic = 'force-dynamic';

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria',
  rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria',
  aprovado: 'chip-primaria',
  arquivado: 'chip-neutra',
};

export default async function Cursos(
  { searchParams }: { searchParams: Promise<{ portal?: string; q?: string }> },
) {
  const { portal = '', q = '' } = await searchParams;
  const portalId = Number.isInteger(Number(portal)) && portal !== ''
    ? Number(portal) : PORTAL_PLATAFORMA;
  const ehPlataforma = portalId === PORTAL_PLATAFORMA;

  const [portais, areas, materias] = await Promise.all([
    portaisParaEscolha(), listarAreas(portalId), listarMaterias(portalId, q),
  ]);
  const nomePortal = portais.find((p) => p.id === portalId)?.nome ?? 'Plataforma';

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Cursos e aulas</h1>
          <p className="suave">
            Área → curso → assunto → aula, como no §4. Acervo de <strong>{nomePortal}</strong>:
            {' '}{materias.length} curso(s), {areas.length} área(s).
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-primario" href={`/admin/cursos/nova?portal=${portalId}`}>
            <Icone nome="edit" tamanho={18} /> Novo curso
          </Link>
        </div>
      </div>

      <SeletorPortal portais={portais} atual={portalId} base="/admin/cursos" />

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Áreas</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Agrupam os cursos no catálogo. Cada portal tem as suas.
        </p>
        <FormArea acao={acaoSalvarArea} portalId={portalId} />
        <table className="tabela" style={{ marginTop: 16 }}>
          <thead><tr><th>Área</th><th>Endereço</th><th>Ordem</th><th>Cursos</th><th>Ações</th></tr></thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.nome}</strong></td>
                <td className="suave mono">{a.slug}</td>
                <td className="apertado">{a.ordem}</td>
                <td>{a.materias || <span className="suave">nenhum</span>}</td>
                <td>
                  <div className="acoes-linha">
                    <EdicaoNaLinha acao={acaoEditarAreaLinha} nome={a.nome} ordem={a.ordem}
                                   oQue={`a área ${a.nome}`}>
                      <input type="hidden" name="portalId" value={portalId} />
                      <input type="hidden" name="id" value={a.id} />
                    </EdicaoNaLinha>
                    {a.materias === 0 && (
                      <form action={acaoExcluirArea}>
                        <input type="hidden" name="portalId" value={portalId} />
                        <input type="hidden" name="id" value={a.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {areas.length === 0 && (
              <tr><td colSpan={5}><div className="vazio">Nenhuma área ainda — comece por uma.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md" style={{ marginBottom: 16 }}>Cursos</h2>
        <form className="busca-vade" style={{ maxWidth: '520px', marginBottom: 16 }}>
          <Icone nome="search" tamanho={22} />
          <input name="q" defaultValue={q} placeholder="Buscar curso" aria-label="Buscar curso" />
          <input type="hidden" name="portal" value={portalId} />
        </form>
        <table className="tabela">
          <thead>
            <tr>
              <th>Curso</th><th>Área</th><th>Conteúdo</th><th>Situação</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {materias.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/admin/cursos/${m.id}?portal=${portalId}`}
                    style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                    {m.nome}
                  </Link>
                  {m.naVitrinePlataforma && !ehPlataforma && (
                    <span className="chip chip-sm chip-terciaria" style={{ marginLeft: 8 }}>
                      na nossa vitrine
                    </span>
                  )}
                  <br /><span className="suave">/materia/{m.slug}</span>
                </td>
                <td>{m.areaNome}</td>
                <td className="apertado">
                  {m.assuntos} assunto(s) · {m.aulasPublicadas}/{m.aulas} aula(s) no ar
                </td>
                <td><span className={`chip chip-sm ${CHIP[m.status]}`}>{m.status.replace('_', ' ')}</span></td>
                <td>
                  <div className="acoes-linha">
                    <LinkIcone href={`/admin/cursos/${m.id}?portal=${portalId}`}
                      icone="menu_book" rotulo="Assuntos e aulas" />
                    <form action={acaoStatusMateria}>
                      <input type="hidden" name="portalId" value={portalId} />
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="status"
                        value={m.status === 'publicado' ? 'rascunho' : 'publicado'} />
                      <BotaoIcone
                        icone={m.status === 'publicado' ? 'visibility_off' : 'visibility'}
                        rotulo={m.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                        variante={m.status === 'publicado' ? 'contorno' : 'primario'} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {materias.length === 0 && (
              <tr><td colSpan={5}><div className="vazio">Nenhum curso neste acervo.</div></td></tr>
            )}
          </tbody>
        </table>
        <p className="dica" style={{ marginTop: '.8rem' }}>
          A licença é vendida por curso, nunca por assunto (§6). Publicar um curso sem aula
          publicada deixa a página no ar com a ementa e nenhum vídeo — o catálogo mostra a
          contagem acima justamente para isso não passar batido.
        </p>
      </div>
    </>
  );
}
