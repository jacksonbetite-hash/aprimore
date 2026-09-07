import Link from 'next/link';
import type { Metadata } from 'next';
import FormCategoria from './FormCategoria.tsx';
import { BotaoIcone, EdicaoNaLinha } from '../../../ui.tsx';
import { acaoSalvarCategoria, acaoEditarCategoriaLinha, acaoExcluirCategoria } from '../acoes.ts';
import { listarCategorias } from '../../../../lib/admin-blog.ts';

export const metadata: Metadata = { title: 'Categorias do blog — Administração' };
export const dynamic = 'force-dynamic';

export default async function Categorias() {
  const categorias = await listarCategorias();

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Categorias do blog</h1>
          <p className="suave">
            A fileira de filtros da vitrine. Categoria sem artigo publicado não aparece lá —
            filtro que leva ao vazio é pior que filtro a menos.
          </p>
        </div>
        <div className="acoes">
          <Link className="btn btn-contorno" href="/admin/blog">Voltar ao blog</Link>
        </div>
      </div>

      <div className="cartao">
        <h2 className="headline-md">Nova categoria</h2>
        <FormCategoria acao={acaoSalvarCategoria} />
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <h2 className="headline-md">Categorias</h2>
        <table className="tabela">
          <thead>
            <tr><th>Nome</th><th>Endereço</th><th>Ordem</th><th>Artigos</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.nome}</strong></td>
                <td className="suave mono">?categoria={c.slug}</td>
                <td className="apertado">{c.ordem}</td>
                <td>{c.posts === 0 ? <span className="suave">nenhum</span> : c.posts}</td>
                <td>
                  <div className="acoes-linha">
                    <EdicaoNaLinha acao={acaoEditarCategoriaLinha} nome={c.nome} ordem={c.ordem}
                                   oQue={`a categoria ${c.nome}`}>
                      <input type="hidden" name="id" value={c.id} />
                    </EdicaoNaLinha>
                    {c.posts === 0 && (
                      <form action={acaoExcluirCategoria}>
                        <input type="hidden" name="id" value={c.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {categorias.length === 0 && (
              <tr><td colSpan={5}><div className="vazio">Nenhuma categoria ainda.</div></td></tr>
            )}
          </tbody>
        </table>
        <p className="dica" style={{ marginTop: '.8rem' }}>
          Só some categoria vazia: com artigo dentro, excluir deixaria o texto órfão de uma
          referência obrigatória. Mova os artigos primeiro.
        </p>
      </div>
    </>
  );
}
