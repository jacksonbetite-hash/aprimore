'use client';

import { useEffect, useRef, useState } from 'react';
import { Icone } from '../ui.tsx';

/**
 * A prévia do cartão: passar o mouse sobre a capa roda um trecho da aula
 * ali mesmo, sem sair da página (docs/plano-catalogo-streaming.md).
 *
 * O que ela é, e o que ela não é: é a AMOSTRA GRATUITA do curso, a mesma
 * aula que §6.1 abre a quem não assinou — quem escolhe qual é o professor,
 * no marcador da aula. Nunca é aula paga; o endereço vem assinado do
 * servidor (lib/catalogo-cartoes.ts), e sem amostra o componente nem
 * chega a ser renderizado.
 *
 * Três decisões que sustentam o resto:
 *
 *   **O vídeo só é baixado no primeiro hover.** `preload="none"` e o
 *   `src` entrando por estado: uma prateleira de doze cursos não pode
 *   começar doze downloads porque a página abriu. O tráfego de vídeo é
 *   cota faturada do portal (§5.10) — carregar o que ninguém pediu sairia
 *   caro para o professor.
 *
 *   **Vinte segundos e para.** É prévia, não sessão de estudo: passado o
 *   trecho, o vídeo volta ao começo e a capa reaparece. Sem isso, um
 *   ponteiro esquecido sobre o cartão reproduziria a aula inteira.
 *
 *   **`prefers-reduced-motion` desliga a reprodução automática.** Quem
 *   pediu menos movimento não recebe vídeo começando sozinho debaixo do
 *   ponteiro; fica o botão de play, e o cartão continua levando ao curso.
 *   É também o que mantém as capturas de tela do roteiro de demonstração
 *   estáveis, que rodam com essa preferência ligada.
 *
 * Os ouvintes ficam no ANCESTRAL (o cartão inteiro), e não neste div: o
 * cartão é um `<a>`, e é ele que recebe o foco pelo teclado. Sem isso a
 * prévia existiria só para quem usa mouse.
 */
export default function PreviaCapa({ src }: { src: string }) {
  const eu = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  /* `sobre` é o ponteiro (ou o foco) em cima do cartão; `montado` só vira
     true no primeiro hover e nunca volta — é ele que impede o vídeo de
     ser baixado antes de alguém pedir, e também que ele seja baixado de
     novo a cada passada do mouse. */
  const [sobre, setSobre] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const alvo = eu.current?.closest('.cartao-curso') ?? eu.current?.parentElement;
    if (!alvo) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const entrar = () => { setMontado(true); setSobre(true); };
    const sair = () => setSobre(false);

    alvo.addEventListener('mouseenter', entrar);
    alvo.addEventListener('mouseleave', sair);
    alvo.addEventListener('focusin', entrar);
    alvo.addEventListener('focusout', sair);
    return () => {
      alvo.removeEventListener('mouseenter', entrar);
      alvo.removeEventListener('mouseleave', sair);
      alvo.removeEventListener('focusin', entrar);
      alvo.removeEventListener('focusout', sair);
    };
  }, []);

  // Um lugar só decide tocar ou parar, e ele reage ao estado — não ao
  // evento. Ligado ao evento, o `play()` do primeiro hover acontecia
  // antes de o <video> existir, e o `pause()` da saída disputava com o
  // play que ainda não tinha resolvido.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (sobre) {
      void v.play().catch(() => {});     // navegador que recusa autoplay: fica a capa
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [sobre, montado]);

  return (
    <div className={sobre ? 'capa-previa tocando' : 'capa-previa'} ref={eu} aria-hidden="true">
      {montado && (
        <video
          ref={video}
          src={src}
          muted
          playsInline
          preload="none"
          // Prévia é trecho: passados os 20s o vídeo volta ao começo e a
          // capa reaparece por baixo.
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.currentTime >= 20) { v.pause(); v.currentTime = 0; setSobre(false); }
          }}
          onEnded={() => setSobre(false)}
        />
      )}
      <span className="previa-play">
        <Icone nome="play_arrow" tamanho={28} />
      </span>
      <span className="previa-selo">
        <Icone nome="volume_off" tamanho={14} /> Prévia sem som
      </span>
    </div>
  );
}
