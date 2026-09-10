import Link from 'next/link';
import type { Metadata } from 'next';
import { Icone, BotaoIcone, LinkIcone } from '../../ui.tsx';
import FormAcervo from './FormAcervo.tsx';
import {
  acaoSalvarItemAcervo, acaoStatusItemAcervo, acaoExcluirItemAcervo,
} from '../acoes.ts';
import { listarAcervo, leiturasPorItem, tamanhoLegivel } from '../../../lib/acervo.ts';
import { listarSetores } from '../../../lib/empresa-equipe.ts';
import { alunoAtual } from '../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../lib/empresa.ts';

export const metadata: Metadata = { title: 'Biblioteca — Painel da empresa' };
export const dynamic = 'force-dynamic';

/**
 * A Biblioteca da empresa, pelo lado do RH.
 *
 * O que ela é, e o que a distingue de "Trilhas e aulas": a trilha é o
 * caminho que a empresa MANDA fazer, com prazo e avaliação; o acervo é o
 * que ela DISPONIBILIZA para quem quiser se aprofundar. Por isso não tem
 * atribuição, prazo nem certificado — tem assunto, autor e setor.
 *
 * Tabela e não vitrine, pela mesma razão da tela de trilhas: aqui o RH
 * confere o que está no ar e publica. A vitrine é a tela do colaborador.
 */
export default async function BibliotecaDaEmpresa() {
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;
  const [itens, setores, leituras] = await Promise.all([
    listarAcervo(portal.id), listarSetores(portal.id), leiturasPorItem(portal.id),
  ]);
  const porItem = new Map(leituras.map((l) => [l.acervoId, l.leitores]));
  const publicados = itens.filter((i) => i.status === 'PUBLICADO').length;

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <h1 className="headline-lg">Biblioteca</h1>
          <p className="suave">
            {itens.length === 0
              ? 'O acervo que a empresa disponibiliza para a equipe: livros, apostilas, artigos e políticas internas.'
              : `${itens.length} ${itens.length === 1 ? 'item' : 'itens'} · ${publicados} no ar para a equipe.`}
          </p>
        </div>
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Acervo</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          Item em <strong>rascunho</strong> não aparece para ninguém — dá para subir o arquivo,
          conferir e publicar depois. Item de <strong>setor</strong> só aparece para quem é dele.
        </p>

        {itens.length === 0 ? (
          <p className="vazio">
            Nada no acervo ainda. Comece pelo formulário abaixo: um PDF ou um link já dá
            uma estante à equipe.
          </p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Item</th><th>Assuntos</th><th>Onde</th><th>Quem vê</th>
                <th>Aberturas</th><th>Situação</th><th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong className="label-md">{i.titulo}</strong>
                    <div className="caption suave">
                      {i.autor || 'sem autor'}
                      {i.ano && ` · ${i.ano}`}
                      {i.editora && ` · ${i.editora}`}
                    </div>
                  </td>
                  <td>
                    {i.assuntos.length === 0
                      ? <span className="caption suave">—</span>
                      : (
                        <span className="acoes-linha">
                          {i.assuntos.map((a) => (
                            <span className="chip chip-sm chip-neutra" key={a}>{a}</span>
                          ))}
                        </span>
                      )}
                  </td>
                  <td>
                    {i.formato === 'PDF' ? (
                      <span className="caption suave">
                        <Icone nome="picture_as_pdf" tamanho={16} /> PDF
                        {tamanhoLegivel(i.bytes) && ` · ${tamanhoLegivel(i.bytes)}`}
                      </span>
                    ) : (
                      <span className="caption suave"><Icone nome="link" tamanho={16} /> link</span>
                    )}
                  </td>
                  <td className="caption suave">{i.setorNome ?? 'toda a empresa'}</td>
                  <td className="caption suave">
                    {/* Zero é informação: material publicado que ninguém
                        abriu é o que o RH precisa ver para agir. */}
                    {i.status === 'PUBLICADO' ? (porItem.get(i.id) ?? 0) : '—'}
                  </td>
                  <td>
                    <span className={`chip ${i.status === 'PUBLICADO' ? 'chip-secundaria' : 'chip-neutra'}`}>
                      {i.status.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <div className="acoes-linha">
                      {/* Abre pela MESMA rota que a equipe usa: se o
                          arquivo não abrir aqui, não abre para ninguém. */}
                      {i.formato === 'PDF' && i.arquivo ? (
                        <LinkIcone href={`/api/documento/${i.arquivo}`} icone="visibility"
                                   rotulo="Conferir o arquivo" externo />
                      ) : i.url ? (
                        <LinkIcone href={i.url} icone="open_in_new" rotulo="Abrir o link" externo />
                      ) : null}
                      <LinkIcone href={`/empresa/biblioteca/${i.id}`} icone="edit" rotulo="Editar" />
                      <form action={acaoStatusItemAcervo}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="status"
                               value={i.status === 'PUBLICADO' ? 'RASCUNHO' : 'PUBLICADO'} />
                        <BotaoIcone
                          icone={i.status === 'PUBLICADO' ? 'visibility_off' : 'public'}
                          rotulo={i.status === 'PUBLICADO' ? 'Tirar do ar' : 'Publicar'}
                        />
                      </form>
                      <form action={acaoExcluirItemAcervo}>
                        <input type="hidden" name="id" value={i.id} />
                        <BotaoIcone icone="delete" rotulo="Excluir" variante="perigo" />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="cartao">
        <h2 className="headline-md" style={{ marginBottom: 6 }}>Novo item</h2>
        <p className="caption suave" style={{ marginBottom: 16 }}>
          O arquivo entra na cota de armazenamento do seu plano, como o vídeo das aulas —
          dá para acompanhar em <Link href="/empresa/financeiro">Financeiro</Link>.
        </p>
        <FormAcervo acao={acaoSalvarItemAcervo} setores={setores} />
      </div>
    </>
  );
}
