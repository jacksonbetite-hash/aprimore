'use client';

import { useEffect, useState } from 'react';
import { Icone } from '../ui.tsx';

const ABAS = [
  { id: 'alunos', rotulo: 'Para alunos', icone: 'school' },
  { id: 'professores', rotulo: 'Para professores', icone: 'history_edu' },
  { id: 'empresas', rotulo: 'Para empresas & RH', icone: 'handshake', novo: true },
] as const;

/**
 * As abas de público da página de planos. São âncoras, não painéis: as
 * três seções ficam sempre na página (quem chega por link direto ou por
 * busca precisa ver tudo), e a aba só rola até a seção e acende conforme
 * a leitura avança. Sem JavaScript o link continua funcionando.
 */
export default function AbasPublico() {
  const [ativa, setAtiva] = useState<string>(ABAS[0].id);

  useEffect(() => {
    const secoes = ABAS
      .map((a) => document.getElementById(a.id))
      .filter((s): s is HTMLElement => Boolean(s));
    if (secoes.length === 0 || !('IntersectionObserver' in window)) return;

    // Uma faixa estreita a um terço da tela: a seção que a cruza é a que
    // está sendo lida. Estreita para que só uma cruze por vez.
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) setAtiva(e.target.id);
    }, { rootMargin: '-35% 0px -60% 0px', threshold: 0 });
    secoes.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="abas-publico" aria-label="Escolha o público">
      {ABAS.map((a) => (
        <a key={a.id} href={`#${a.id}`}
           className={ativa === a.id ? 'ativa' : undefined}
           aria-current={ativa === a.id ? 'true' : undefined}
           onClick={() => setAtiva(a.id)}>
          <Icone nome={a.icone} tamanho={16} /> {a.rotulo}
          {'novo' in a && a.novo && <span className="novo">Novo</span>}
        </a>
      ))}
    </nav>
  );
}
