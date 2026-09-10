'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icone } from './ui.tsx';
import { itemAtivo, enderecosDe } from '../lib/navegacao.ts';

/**
 * A barra lateral do painel — uma só, para admin, aluno e conta.
 *
 * Antes existiam três cópias escritas à mão, cada uma acendendo um item
 * fixo no código. Três defeitos vinham daí:
 *
 * 1. o realce nunca saía de "Dashboard" (o item aceso era literal);
 * 2. sair do admin para o painel do aluno trocava o menu inteiro, sem
 *    caminho de volta visível;
 * 3. "Catálogo", "Biblioteca" e "Planos" levavam a páginas do site
 *    público, onde a barra lateral simplesmente desaparecia.
 *
 * O item aceso passa a vir da rota (`lib/navegacao.ts`). O terceiro
 * problema não se resolve arrastando as páginas públicas para dentro do
 * painel — elas são páginas de venda e de SEO, e vivem com cabeçalho e
 * rodapé por bom motivo. Resolve-se dizendo a verdade ao usuário: os
 * destinos que saem do painel ficam num grupo à parte, marcado, para que
 * o sumiço da barra deixe de ser surpresa e passe a ser esperado.
 *
 * **No portal de uma EMPRESA o argumento acima não vale**, e por isso o
 * colaborador tem outro menu (`app/painel/layout.tsx`): lá não há venda
 * nem busca orgânica — o portal é fechado (§5.11) e a única pessoa que vê
 * aquelas telas já está logada. Ali as páginas entram para DENTRO do
 * painel, e nenhum item leva para fora.
 *
 * Um item pode ter filhos (`ItemPai`), e aí abre submenu. É o "Minha
 * Jornada" do colaborador. O pai não tem endereço: dois caminhos de menu
 * para a mesma tela é justamente o defeito que o submenu veio corrigir.
 *
 * É componente de cliente porque lê `usePathname`. Nada de sessão ou de
 * banco atravessa daqui — quem lê a sessão é o layout, no servidor.
 */

export interface ItemLateral {
  href: string;
  icone: string;
  texto: string;
  /** Destino fora do painel: o menu lateral não existe lá. */
  saiDoPainel?: boolean;
}

/**
 * Item que não leva a lugar nenhum — abre os filhos (§ plano do painel do
 * colaborador, "Minha Jornada" ▸ Minhas trilhas · Todas as trilhas).
 *
 * Não tem `href` de propósito. Dar endereço ao pai foi o que produziu o
 * defeito relatado: "Minha Jornada" e "Minhas trilhas" apontavam ambos
 * para `/painel`, e o menu passava a ter dois caminhos para a mesma tela.
 */
export interface ItemPai {
  icone: string;
  texto: string;
  filhos: ItemLateral[];
}

export type EntradaLateral = ItemLateral | ItemPai;

const ehPai = (i: EntradaLateral): i is ItemPai => 'filhos' in i;

export interface GrupoLateral {
  /** Rótulo do grupo. Vazio no primeiro, que não precisa de título. */
  titulo?: string;
  itens: EntradaLateral[];
}

export default function BarraLateral({
  titulo, subtitulo, grupos, rodape,
}: {
  titulo: string;
  subtitulo: string;
  grupos: GrupoLateral[];
  /** O formulário de sair, montado por quem tem a ação de servidor. */
  rodape?: React.ReactNode;
}) {
  const caminho = usePathname() ?? '/';
  const aceso = itemAtivo(caminho, enderecosDe(grupos));

  return (
    <aside className="lateral">
      <div className="lateral-marca">
        <span className="nome">{titulo}</span>
        <span className="sub">{subtitulo}</span>
      </div>

      {grupos.map((grupo, indice) => (
        <div className="lateral-grupo" key={grupo.titulo ?? indice}>
          {grupo.titulo && <span className="lateral-grupo-titulo">{grupo.titulo}</span>}
          {grupo.itens.map((item) => (
            ehPai(item)
              ? <Submenu key={item.texto} pai={item} aceso={aceso} />
              : <ItemDoMenu key={item.href} item={item} aceso={aceso} />
          ))}
        </div>
      ))}

      {rodape && <div className="lateral-rodape">{rodape}</div>}
    </aside>
  );
}

function ItemDoMenu(
  { item, aceso, filho }: { item: ItemLateral; aceso: string | null; filho?: boolean },
) {
  const ativo = item.href === aceso;
  return (
    <Link
      className={`item-lateral${filho ? ' filho' : ''}${ativo ? ' ativo' : ''}`}
      href={item.href}
      aria-current={ativo ? 'page' : undefined}
    >
      <Icone nome={item.icone} /> {item.texto}
      {item.saiDoPainel && (
        <Icone nome="arrow_forward" tamanho={16} className="ico-sai" />
      )}
    </Link>
  );
}

/**
 * O item com submenu. Abre no CLIQUE, nunca no passar do ponteiro — a
 * mesma regra do menu "Ferramentas" do topo (`app/MenuFerramentas.tsx`):
 * menu que abre sozinho no hover é intocável em tela sensível ao toque e
 * dispara sem querer quando o ponteiro só está de passagem.
 *
 * O estado inicial é "aberto quando um filho está aceso": quem chega em
 * `/painel/trilhas` por link direto, favorito ou F5 precisa ver onde
 * está. Depois disso quem manda é a pessoa — daí o `useState` guardar a
 * decisão dela, e não recalcular a cada rota.
 *
 * Ele sobrevive à navegação entre os filhos porque a barra vive no
 * LAYOUT: o Next não remonta layout ao trocar de página filha, então o
 * submenu não pisca nem se fecha sozinho no meio do caminho.
 */
function Submenu({ pai, aceso }: { pai: ItemPai; aceso: string | null }) {
  const temFilhoAceso = pai.filhos.some((f) => f.href === aceso);
  const [aberto, setAberto] = useState(temFilhoAceso);
  const id = `submenu-${pai.texto.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <>
      <button
        type="button"
        className={`item-lateral pai${temFilhoAceso && !aberto ? ' ativo' : ''}`}
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((a) => !a)}
      >
        <Icone nome={pai.icone} /> {pai.texto}
        <Icone nome="expand_more" tamanho={20} className={`ico-abre${aberto ? ' virado' : ''}`} />
      </button>
      <div className="lateral-filhos" id={id} hidden={!aberto}>
        {pai.filhos.map((f) => <ItemDoMenu key={f.href} item={f} aceso={aceso} filho />)}
      </div>
    </>
  );
}
