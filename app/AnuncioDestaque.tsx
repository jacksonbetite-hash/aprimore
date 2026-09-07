'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icone } from './ui.tsx';

/**
 * O anúncio em destaque: um gatilho fixo no canto e a peça em janela.
 *
 * É publicidade, e a página diz isso antes de o visitante clicar — o
 * gatilho leva a etiqueta "Ad" e a janela abre com "Espaço patrocinado".
 * Sem isso, publicidade disfarçada de conteúdo editorial é prática
 * enganosa (CDC, art. 36: a publicidade tem de ser identificada como tal).
 *
 * O conteúdo anunciado ainda é fictício, escrito para avaliação — daí o
 * selo de ilustrativo dentro da janela. Ver o comentário de topo de
 * page.tsx.
 *
 * Três coisas que o modal precisa fazer e um <div> cru não faz:
 *
 *  1. Fechar no Esc. Janela que só fecha no X prende quem navega por
 *     teclado.
 *  2. Devolver o foco ao gatilho quando fecha, senão o foco cai no início
 *     do documento e a leitura recomeça do topo.
 *  3. Não travar a página: o clique fora fecha, como em qualquer janela.
 */
export default function AnuncioDestaque() {
  const [aberto, setAberto] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);

  /* Fechar é sempre a mesma coisa, venha do X, do clique fora ou do Esc:
     esconder a janela E devolver o foco ao gatilho. Quando o Esc fazia só
     a primeira metade, o foco caía no início do documento e quem navega
     por teclado recomeçava a página do topo. */
  const encerrar = useCallback(() => {
    setAberto(false);
    gatilho.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    fechar.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') encerrar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, encerrar]);

  return (
    <>
      <button
        ref={gatilho} type="button" className="anuncio-gatilho"
        onClick={() => setAberto(true)} aria-haspopup="dialog"
      >
        <span className="ponto" aria-hidden="true" />
        Ver anúncio em destaque
        <span className="etiqueta">Ad</span>
      </button>

      {aberto && (
        <div className="anuncio-fundo" onClick={encerrar}>
          <div
            className="anuncio-janela" role="dialog" aria-modal="true"
            aria-labelledby="anuncio-titulo"
            /* O clique dentro da peça não pode fechá-la: só o de fora. */
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={fechar} type="button" className="anuncio-fechar"
              onClick={encerrar} aria-label="Fechar o anúncio"
            >
              <Icone nome="close" tamanho={18} />
            </button>

            <header className="anuncio-topo">
              <span className="anuncio-rotulo claro">
                <span className="ponto" aria-hidden="true" /> Espaço patrocinado
              </span>
              <h2 id="anuncio-titulo">Curso de extensão e pós-graduação 2026</h2>
              <p>Certificação acadêmica em Direito Digital e Gestão Corporativa.</p>
            </header>

            <div className="anuncio-corpo">
              <div className="anuncio-selo">
                <span className="selo"><Icone nome="schedule" tamanho={20} /></span>
                <div>
                  <strong>Vagas limitadas com 35% de desconto</strong>
                  <small>Condição exclusiva para a comunidade Aprimore o Saber.</small>
                </div>
              </div>
              <p className="anuncio-texto">
                Aulas 100% online, com corpo docente formado por magistrados, procuradores e
                consultores em atuação.
              </p>
              <a className="btn btn-primario btn-bloco" href="/planos#legal">
                Aproveitar a condição especial
              </a>
              <p className="centro" style={{ margin: 0 }}>
                <span className="selo-ilustrativo" style={{ marginTop: 4 }}>
                  <Icone nome="info" tamanho={16} />
                  Anúncio ilustrativo — nenhum anunciante contratado ainda
                </span>
              </p>
              <a className="anuncio-venda" href="/planos#legal">
                Quer anunciar a sua marca aqui? Fale com a equipe comercial
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
