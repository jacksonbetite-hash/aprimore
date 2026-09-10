import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Icone } from '../../../ui.tsx';
import FormAcervo from '../FormAcervo.tsx';
import { acaoSalvarItemAcervo } from '../../acoes.ts';
import { lerItem } from '../../../../lib/acervo.ts';
import { listarSetores } from '../../../../lib/empresa-equipe.ts';
import { alunoAtual } from '../../../../lib/sessao.ts';
import { portalDaEmpresa } from '../../../../lib/empresa.ts';

export const metadata: Metadata = { title: 'Editar item — Biblioteca' };
export const dynamic = 'force-dynamic';

/** A ficha de um item já criado. O mesmo formulário do cadastro. */
export default async function EditarItemDoAcervo(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const u = (await alunoAtual())!;
  const portal = (await portalDaEmpresa(u.id))!;

  /* `lerItem` filtra por portal: id de item de OUTRA empresa não
     encontra linha e cai aqui como 404, sem confirmar que existe. */
  const item = Number.isInteger(Number(id)) ? await lerItem(portal.id, Number(id)) : null;
  if (!item) notFound();

  const setores = await listarSetores(portal.id);

  return (
    <>
      <div className="cabecalho-tela">
        <div>
          <div className="trilha-topo">
            <Link href="/empresa/biblioteca">Biblioteca</Link>
            <Icone nome="chevron_right" tamanho={16} />
            <span>{item.titulo}</span>
          </div>
          <h1 className="headline-lg">{item.titulo}</h1>
          <p className="suave">
            {item.status === 'PUBLICADO'
              ? 'No ar para a equipe. O que você salvar aqui muda o que ela vê.'
              : 'Em rascunho: ninguém vê ainda. Publique na lista quando estiver pronto.'}
          </p>
        </div>
      </div>

      <div className="cartao">
        <FormAcervo acao={acaoSalvarItemAcervo} setores={setores} item={item} />
      </div>
    </>
  );
}
