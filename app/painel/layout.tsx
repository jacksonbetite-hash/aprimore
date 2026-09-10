import Link from 'next/link';
import { redirect } from 'next/navigation';
import BarraLateral, { type GrupoLateral } from '../BarraLateral.tsx';
import BotaoSair from '../BotaoSair.tsx';
import { Icone } from '../componentes.tsx';
import { sair } from '../acoes-auth.ts';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalAtual } from '../../lib/portal-consultas.ts';
import { corSegura } from '../../lib/portal.ts';

export const dynamic = 'force-dynamic';

/**
 * A casca do painel do colaborador — a barra lateral que NÃO é
 * redesenhada a cada tela.
 *
 * O defeito que este arquivo corrige: o colaborador via dois menus
 * diferentes conforme a página. Em `/painel` a barra vinha de
 * `PainelEmpresa.tsx`; em `/conta`, do menu da PLATAFORMA
 * (`LateralAluno.tsx`), com caderno de erros, vade-mécum e planos de
 * venda — nada disso existe na empresa. Três itens ainda saíam do painel,
 * e ao clicar neles a barra sumia.
 *
 * A correção é de estrutura, não de estilo. O menu passa a morar num
 * LAYOUT, e cada tela é uma rota filha. O Next preserva o layout entre
 * elas — "on navigation, layouts preserve state, remain interactive, and
 * do not rerender" (docs do Next, layouts-and-pages) —, então clicar em
 * "Todas as trilhas" troca só o miolo da direita: o menu não pisca, não
 * remonta, e o submenu aberto continua aberto.
 *
 * Por que rotas, e não abas com estado no cliente: com rota, F5, botão
 * voltar, favorito, link colado no chat e o `destino=` do login continuam
 * funcionando, e `itemAtivo` (lib/navegacao.ts) acende o item certo
 * sozinho. Aba de cliente daria a mesma tela e perderia tudo isso — além
 * de obrigar a carregar biblioteca, catálogo e conta a cada abertura do
 * painel.
 *
 * Fora do portal de uma empresa este layout não desenha nada: a "Minha
 * jornada" da plataforma (`page.tsx`) tem casca própria, com o menu de
 * lá, e as rotas filhas redirecionam para as páginas públicas
 * equivalentes (`exigirColaborador`).
 */
export default async function LayoutDoPainel({ children }: { children: React.ReactNode }) {
  const portal = await portalAtual();
  if (portal.tipo !== 'EMPRESA') return children;

  const aluno = await alunoAtual();
  if (!aluno) redirect('/entrar?destino=/painel');

  /* O menu do colaborador. Nenhum item sai do painel — por isso não há
     grupo "No portal" nem seta de saída: aqui dentro tudo é interno.

     "Minha Jornada" não tem endereço próprio: ela ABRE os dois destinos.
     Era ela que duplicava `/painel` junto com "Minhas trilhas", e é essa
     duplicação que o submenu desfaz.

     Não há item "Catálogo": no portal de uma empresa o catálogo É o
     conjunto das trilhas do portal (a vitrine compartilhada é proibida
     por CHECK no banco, §5.11), e ele já se chama "Todas as trilhas".
     Dois itens para a mesma tela seria o defeito que acabou de sair. */
  const grupos: GrupoLateral[] = [
    {
      itens: [
        {
          icone: 'school',
          texto: 'Minha Jornada',
          filhos: [
            { href: '/painel', icone: 'route', texto: 'Minhas trilhas' },
            { href: '/painel/trilhas', icone: 'grid_view', texto: 'Todas as trilhas' },
          ],
        },
        { href: '/painel/biblioteca', icone: 'menu_book', texto: 'Biblioteca' },
        // "Meu acesso" e não "Planos": o colaborador não contrata nada, e
        // um item chamado Planos prometeria a ele um preço que a empresa
        // já pagou. A rota continua /painel/planos, para o link não morrer.
        { href: '/painel/planos', icone: 'verified_user', texto: 'Meu acesso' },
        { href: '/painel/conta', icone: 'person', texto: 'Minha conta' },
      ],
    },
  ];

  // Só uma cor validada (#rgb/#rrggbb) chega ao CSS: cor é dado, não código.
  const cor = corSegura(portal.personalizacao.corPrimaria);

  return (
    <div className="app">
      {cor && (
        <style>{`:root{--primary:${cor};--primary-texto:${cor};--primary-container:${cor};--on-primary-fixed-variant:${cor}}`}</style>
      )}
      <BarraLateral
        titulo={portal.nomeExibicao}
        subtitulo="Treinamento"
        grupos={grupos}
        rodape={
          <form action={sair}>
            <button className="item-lateral saida" type="submit">
              <Icone nome="logout" /> Sair
            </button>
          </form>
        }
      />

      <div className="conteudo">
        <div className="barra-superior">
          <Link className="marca" href="/">{portal.nomeExibicao}</Link>
          <div className="usuario">
            <span className="avatar">{aluno.nome.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
            <strong className="label-md">{aluno.nome.split(' ')[0]}</strong>
            <BotaoSair />
          </div>
        </div>

        <div className="miolo">{children}</div>
      </div>
    </div>
  );
}
