'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icone } from './ui.tsx';
import type { Ferramenta } from '../lib/ferramentas.ts';

/**
 * "Ferramentas" do topo: o único item de navegação que abre submenu.
 *
 * É componente de cliente porque precisa de estado de abertura, de foco e
 * de escuta de teclado — o resto do cabeçalho continua no servidor, lendo
 * a sessão. Abre no clique, e não no passar do ponteiro: menu que abre
 * sozinho no hover é intocável em tela sensível ao toque e dispara sem
 * querer quando o ponteiro só está de passagem para o botão ao lado.
 *
 * Quem monta a lista é o cabeçalho: no portal do professor, ela é a que
 * ELE escolheu em "Minha página" (lib/ferramentas.ts). No site principal
 * o menu não existe mais.
 */

export default function MenuFerramentas(
  { itens, ativo }: { itens: Ferramenta[]; ativo?: string },
) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);

  /* O gatilho só acende quando a página atual mora exclusivamente aqui
     dentro — o mural de vagas e o blog. Para vade-mécum e caderno de
     erros, quem acende é o item de primeiro nível: dois marcadores ao
     mesmo tempo diriam que são dois lugares. */
  const daqui = itens.find((i) => i.chave === ativo);
  const gatilhoAtivo = Boolean(daqui && !daqui.naBarra);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    }
    function tecla(e: KeyboardEvent) {
      // Esc fecha e devolve o foco a quem abriu — senão o foco fica solto
      // no fim da página para quem navega só pelo teclado.
      if (e.key !== 'Escape') return;
      setAberto(false);
      gatilho.current?.focus();
    }
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  return (
    <div className="menu-ferramentas" ref={caixa} onBlur={(e) => {
      // O foco saiu do bloco inteiro (tabulou para além do último item).
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setAberto(false);
    }}>
      <button
        type="button"
        ref={gatilho}
        className={gatilhoAtivo ? 'ativo' : undefined}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-current={gatilhoAtivo ? 'page' : undefined}
        onClick={() => setAberto((v) => !v)}
      >
        Ferramentas
        <Icone nome="expand_more" tamanho={18} className={aberto ? 'girado' : undefined} />
      </button>

      {aberto && (
        <div className="menu-caixa" role="menu">
          {itens.map((i) => (
            <Link
              key={i.href}
              role="menuitem"
              href={i.href}
              className={i.chave === ativo ? 'ativo' : undefined}
              onClick={() => setAberto(false)}
            >
              <span className="menu-ico"><Icone nome={i.icone} tamanho={20} /></span>
              <span>
                <strong>{i.nome}</strong>
                <small>{i.descricao}</small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
