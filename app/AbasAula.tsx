'use client';

import { useEffect, useState } from 'react';

export interface Aba {
  id: string;
  rotulo: string;
  /** Estado curto ao lado do rótulo — "5/6" no exercício, contagem nos materiais. */
  contador?: string;
  conteudo: React.ReactNode;
}

/**
 * As abas da aula. Estado de cliente, com uma concessão ao endereço: a
 * âncora (`#exercicio`) abre a aba de mesmo id, no carregamento e quando
 * muda. Sem isso, o botão "Fazer o exercício" no fim do resumo, o link
 * do caderno de erros e os roteiros de demonstração cairiam numa aba
 * escondida — `display: none` não rola até lugar nenhum.
 */
export default function AbasAula({ abas }: { abas: Aba[] }) {
  const [ativa, setAtiva] = useState(abas[0]?.id);

  useEffect(() => {
    const pelaAncora = () => {
      const id = window.location.hash.slice(1);
      if (id && abas.some((a) => a.id === id)) setAtiva(id);
    };
    pelaAncora();
    window.addEventListener('hashchange', pelaAncora);
    return () => window.removeEventListener('hashchange', pelaAncora);
  }, [abas]);

  return (
    <>
      <div className="abas" role="tablist">
        {abas.map((a) => (
          <button
            key={a.id} role="tab" aria-selected={ativa === a.id}
            aria-controls={`aba-${a.id}`}
            className={ativa === a.id ? 'ativa' : ''}
            onClick={() => setAtiva(a.id)}
          >
            {a.rotulo}
            {a.contador && <span className="aba-contador">{a.contador}</span>}
          </button>
        ))}
      </div>
      {abas.map((a) => (
        <div className={`painel-aba${ativa === a.id ? ' ativa' : ''}`} id={`aba-${a.id}`}
             role="tabpanel" key={a.id}>
          {a.conteudo}
        </div>
      ))}
    </>
  );
}
