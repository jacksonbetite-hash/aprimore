import { daEquipe } from './permissoes.ts';

/**
 * Qual item do menu está aceso — parte pura, sem React e sem banco.
 *
 * Vivia escrito à mão em três lugares (`app/admin/layout.tsx`,
 * `app/painel/page.tsx` e `app/conta/page.tsx`), cada um fixando a classe
 * `ativo` num item escolhido no código. O efeito era o defeito relatado:
 * em `/admin/precos` o realce continuava em "Dashboard", e o menu parecia
 * não responder ao clique. A regra passa a ser derivada da rota, e como
 * ela é pura, é testável sem navegador (`navegacao.test.ts`).
 *
 * A regra: vence o item cujo endereço é o prefixo MAIS LONGO do caminho
 * atual. É o que faz `/admin` perder para `/admin/blog` quando se está em
 * `/admin/blog/novo` — sem isso, o item raiz do painel roubaria o realce
 * de todos os outros para sempre.
 */

/** Tira barra final, âncora e query: só o caminho interessa à comparação. */
function normalizar(endereco: string): string {
  const caminho = endereco.split('#')[0].split('?')[0];
  if (caminho.length > 1 && caminho.endsWith('/')) return caminho.slice(0, -1);
  return caminho || '/';
}

/**
 * O endereço do item aceso, tal como veio na lista, ou `null` quando
 * nenhum item cobre o caminho atual.
 *
 * Devolve o valor original (e não o normalizado) para que quem chamou
 * possa comparar por igualdade com o que tem em mãos.
 */
export function itemAtivo(caminho: string, enderecos: readonly string[]): string | null {
  const atual = normalizar(caminho);
  let vencedor: string | null = null;
  let tamanho = -1;

  for (const endereco of enderecos) {
    const alvo = normalizar(endereco);
    // `startsWith(alvo + '/')` e não `startsWith(alvo)`: sem a barra,
    // `/admin/precos` acenderia o item `/admin/preco`.
    const casa = atual === alvo || (alvo !== '/' && atual.startsWith(alvo + '/'));
    if (casa && alvo.length > tamanho) {
      vencedor = endereco;
      tamanho = alvo.length;
    }
  }
  return vencedor;
}

/**
 * Uma entrada do menu lateral, na forma mínima que o cálculo do realce
 * precisa: ou ela tem endereço, ou ela tem filhos.
 *
 * O tipo é ESTRUTURAL de propósito — não importa `ItemLateral` de
 * `app/BarraLateral.tsx`, que é componente de cliente. Este módulo é
 * puro e roda no executor de testes do Node, sem React e sem Next.
 */
export interface EntradaMenu {
  href?: string;
  filhos?: readonly EntradaMenu[];
}

/**
 * Todos os endereços de um menu, achatando os submenus — é o que
 * `itemAtivo` recebe.
 *
 * Nasceu com o submenu do colaborador ("Minha Jornada" ▸ Minhas trilhas
 * · Todas as trilhas): sem achatar, o item pai não tem endereço nenhum e
 * o realce simplesmente não acenderia nos filhos. A ordem preserva a do
 * menu, mas `itemAtivo` não depende dela — quem vence é o prefixo mais
 * longo, não o primeiro da lista.
 *
 * Um nível de submenu é o que a barra desenha, mas a recursão é livre:
 * limitar aqui só criaria um caso especial para quando o menu crescer.
 */
export function enderecosDe(
  grupos: readonly { itens: readonly EntradaMenu[] }[],
): string[] {
  const achatar = (itens: readonly EntradaMenu[]): string[] =>
    itens.flatMap((i) => [
      ...(i.href ? [i.href] : []),
      ...(i.filhos ? achatar(i.filhos) : []),
    ]);
  return grupos.flatMap((g) => achatar(g.itens));
}

/**
 * Para onde vai quem acabou de entrar — parte pura, testável.
 *
 * Mandar todo mundo para `/painel` fazia o administrador cair na área do
 * aluno ("Minha jornada") e ter de procurar o atalho da retaguarda no
 * menu, a cada login. Quem tem papel de operação vai direto ao painel do
 * papel; o aluno continua na jornada dele.
 *
 * Duas guardas:
 *
 *  - `destino` só é aceito se for caminho interno (começa com uma barra e
 *    não com duas). Sem isso, `/entrar?destino=https://outro.site` viraria
 *    redirecionamento aberto — o clássico do phishing.
 *  - fora da plataforma (portal de professor), papel de operação não
 *    significa nada: lá a base de usuários é a do portal, e `/admin` e
 *    `/professor` sequer respondem. Todo mundo vai para `/painel`.
 */
export function paginaInicial(
  papel: string, portalId: number, destino?: string | null,
): string {
  if (destino && destino.startsWith('/') && !destino.startsWith('//')) return destino;
  if (portalId !== 0) return '/painel';
  // A equipe da plataforma inteira (admin, financeiro, suporte) trabalha
  // em /admin; o que cada um vê lá dentro é a tabela de lib/permissoes.ts.
  if (daEquipe(papel)) return '/admin';
  if (papel === 'professor') return '/professor';
  // §5.11 — o gestor opera o portal da empresa de fora dele, na
  // plataforma, como o professor.
  if (papel === 'gestor') return '/empresa';
  return '/painel';
}
