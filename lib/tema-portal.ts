import { corSegura } from './portal.ts';

/**
 * O tema de um portal a partir da cor que ele escolheu — §5.10 e
 * `docs/plano-pagina-da-universidade.md`, §3.8.
 *
 * Até aqui, quatro telas repetiam a mesma linha de `<style>` trocando
 * `--primary` e `--primary-texto` pela cor crua, e o botão principal
 * continuava roxo: `.btn-primario` usa `--grad-cta`, um degradê cravado
 * que ninguém sobrescrevia. Agora o tema sai daqui, inteiro, e com a
 * regra que faltava: **texto branco sobre a cor, e a cor como texto sobre
 * branco, só quando dão 4,5:1** (WCAG AA, §9). Se a cor escolhida é
 * clara demais, a versão que carrega texto é escurecida até passar — a
 * cor crua continua sendo a decorativa (`--primary`), que só responde por
 * 3:1 em borda e ícone.
 *
 * Puro, sem DOM: os testes conferem o contraste com números.
 */

const hex = (h: string): [number, number, number] => {
  const s = h.replace('#', '');
  const cheio = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const n = parseInt(cheio, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) =>
  '#' + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');

const luminancia = (h: string) => {
  const [r, g, b] = hex(h).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Razão de contraste WCAG entre duas cores em hex. */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const misturar = (h: string, alvo: number[], t: number) =>
  toHex(hex(h).map((c, i) => c + (alvo[i] - c) * t));

/**
 * A cor mais próxima da escolhida que ainda dá 4,5:1 com branco: escurece
 * em passos de 4% até passar. Cor que já passa volta como está.
 */
export function corParaTexto(cor: string, fundo = '#ffffff'): string {
  let c = cor;
  for (let i = 0; i < 40 && contraste(c, fundo) < 4.5; i++) c = misturar(cor, [0, 0, 0], 0.04 * (i + 1));
  return c;
}

/** Um tom mais escuro para o hover, sem sair da mesma família. */
const escurecer = (cor: string, t: number) => misturar(cor, [0, 0, 0], t);
/** Um tom mais claro para a ponta do degradê do botão. */
const clarear = (cor: string, t: number) => misturar(cor, [255, 255, 255], t);

/**
 * O `<style>` do portal, ou `null` para quem não escolheu cor (a
 * plataforma, ou um portal que ficou no roxo da casa). Uma cor inválida
 * é tratada como ausente: cor é dado, não código, e nada chega ao CSS
 * sem passar por `corSegura`.
 */
export function temaDoPortal(cor: string | undefined | null): string | null {
  const base = corSegura(cor ?? undefined);
  if (!base) return null;
  const fixo = clarear(base, 0.9);
  // O texto na cor do portal também pousa sobre a pill lavanda (`fixo`),
  // que é um pouco mais escura que o branco: é contra ELA que se mede.
  const texto = corParaTexto(base, fixo);
  return `:root{`
    + `--primary:${base};`
    + `--primary-texto:${texto};`
    + `--primary-container:${texto};`
    + `--on-primary-fixed-variant:${texto};`
    + `--primary-fixed:${fixo};`
    + `--primary-fixed-dim:${clarear(base, 0.82)};`
    + `--contorno-pill:${clarear(base, 0.55)};`
    + `--grad-cta:linear-gradient(90deg,${texto} 0%,${clarear(texto, 0.12)} 100%);`
    + `--grad-cta-hover:linear-gradient(90deg,${escurecer(texto, 0.12)} 0%,${texto} 100%);`
    + `--e-marca:0 10px 40px -10px ${base}55`
    + `}`;
}
