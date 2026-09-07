import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone, BotaoIcone, LinkIcone } from '../../ui.tsx';
import { acaoStatusPost } from './acoes.ts';
import { listarPosts, listarCategorias } from '../../../lib/admin-blog.ts';

export const metadata: Metadata = { title: 'Blog — Administração' };
export const dynamic = 'force-dynamic';

const DATA = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const SITUACOES = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'rascunho', rotulo: 'Rascunhos' },
  { valor: 'em_revisao', rotulo: 'Em revisão' },
  { valor: 'aprovado', rotulo: 'Aprovados' },
  { valor: 'publicado', rotulo: 'No ar' },
  { valor: 'arquivado', rotulo: 'Arquivados' },
];

const CHIP: Record<string, string> = {
  publicado: 'chip-secundaria',
  rascunho: 'chip-neutra',
  em_revisao: 'chip-terciaria',
  aprovado: 'chip-primaria',
  arquivado: 'chip-neutra',
};

export default async function BlogAdmin(
  { searchParams }: { searchParams: Promise<{ status?: string; q?: string }> },
) {
  const { status = '', q = '' } = await searchParams;
  const [posts, categorias] = await Promise.all([listarPosts(status, q), listarCategorias()]);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Blog</h1>
          <p className="suave">
            {posts.length} {posts.length === 1 ? 'artigo' : 'artigos'}
            {status && ` em “${SITUACOES.find((s) => s.valor === status)?.rotulo.toLowerCase()}”`}
            {q && ` para “${q}”`}.
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href="/admin/blog/categorias">
            <Icone nome="library_books" tamanho={18} /> Categorias
          </Link>
          <Link className="btn btn-primario" href="/admin/blog/novo">
            <Icone nome="edit" tamanho={18} /> Novo artigo
          </Link>
        </div>
      </div>

      <div className="filtros">
        {SITUACOES.map((s) => (
          <Link key={s.valor || 'todos'}
            className={`chip chip-sm ${s.valor === status ? 'chip-primaria' : 'chip-contorno'}`}
            href={s.valor ? `/admin/blog?status=${s.valor}` : '/admin/blog'}>
            {s.rotulo}
          </Link>
        ))}
      </div>

      <form className="busca-vade" style={{ maxWidth: '520px' }}>
        <Icone nome="search" tamanho={22} />
        <input name="q" defaultValue={q} placeholder="Buscar por título ou resumo"
          aria-label="Buscar artigo" />
        {status && <input type="hidden" name="status" value={status} />}
      </form>

      <div className="cartao">
        <table className="tabela">
          <thead>
            <tr>
              <th>Artigo</th><th>Categoria</th><th>Situação</th>
              <th>Publicado</th><th>Editado</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/blog/${p.id}`} style={{ color: 'var(--primary-texto)', fontWeight: 700 }}>
                    {p.titulo}
                  </Link>
                  {p.destaque && <span className="chip chip-sm chip-terciaria" style={{ marginLeft: 8 }}>destaque</span>}
                  <br />
                  <span className="suave">/blog/{p.slug} · {p.autorNome}</span>
                </td>
                <td>{p.categoriaNome}</td>
                <td><span className={`chip chip-sm ${CHIP[p.status] ?? 'chip-neutra'}`}>{p.status.replace('_', ' ')}</span></td>
                <td className="suave apertado">{DATA(p.publicadoEm)}</td>
                <td className="suave apertado">{DATA(p.atualizadoEm)}</td>
                <td>
                  <div className="acoes-linha">
                    <LinkIcone href={`/admin/blog/${p.id}`} icone="edit" rotulo="Editar" />
                    {p.status === 'publicado' && (
                      <LinkIcone href={`/blog/${p.slug}`} icone="open_in_new"
                                 rotulo="Ver no site" externo />
                    )}
                    <form action={acaoStatusPost}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="slug" value={p.slug} />
                      <input type="hidden" name="status"
                        value={p.status === 'publicado' ? 'rascunho' : 'publicado'} />
                      <BotaoIcone
                        icone={p.status === 'publicado' ? 'visibility_off' : 'visibility'}
                        rotulo={p.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                        variante={p.status === 'publicado' ? 'contorno' : 'primario'} />
                    </form>
                    {p.status !== 'arquivado' && (
                      <form action={acaoStatusPost}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="slug" value={p.slug} />
                        <input type="hidden" name="status" value="arquivado" />
                        <BotaoIcone icone="inventory_2" rotulo="Arquivar" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={6}><div className="vazio">Nenhum artigo neste recorte.</div></td></tr>
            )}
          </tbody>
        </table>
        <p className="dica" style={{ marginTop: '.8rem' }}>
          Artigo não se apaga: arquiva. Um texto publicado tem link de fora e aparece em busca —
          sumir com a linha transforma isso em 404 sem rastro. Arquivado sai da vitrine e
          continua auditável. Categorias em uso: {categorias.filter((c) => c.posts > 0).length}.
        </p>
      </div>
    </>
  );
}
