import { redirect } from 'next/navigation';
import BarraLateral, { type GrupoLateral, type ItemLateral } from '../BarraLateral.tsx';
import BotaoSair from '../BotaoSair.tsx';
import { Icone } from '../componentes.tsx';
import { sair } from '../acoes-auth.ts';
import { alunoAtual, exigirEquipe } from '../../lib/sessao.ts';
import { pode, ROTULO_PAPEL, type Permissao } from '../../lib/permissoes.ts';

export const dynamic = 'force-dynamic';

/**
 * Um item do menu com a permissão que o abre. Sem permissão declarada, o
 * item é de todo mundo da equipe (visão geral, perfil, saídas).
 */
type ItemDaRetaguarda = ItemLateral & { permissao?: Permissao };

/**
 * O menu da retaguarda, em grupos: o que se opera todo dia, o que se
 * publica, quem existe (cadastros) e o dinheiro (financeiro). Agrupar não
 * é enfeite — com quinze itens numa lista corrida, ninguém acha o que
 * procura.
 *
 * Cada item carrega a permissão que o abre e o layout FILTRA a lista pelo
 * papel de quem está logado (lib/permissoes.ts): o financeiro não vê
 * "Cursos e aulas", o suporte não vê "Financeiro". Filtrar aqui é
 * conforto; a trava de verdade é a guarda de cada tela e de cada ação.
 *
 * O último grupo sai do painel, e é dito com todas as letras: lá a barra
 * lateral do admin não existe, e o usuário precisa saber disso antes de
 * clicar, não depois.
 */
const GRUPOS: { titulo?: string; itens: ItemDaRetaguarda[] }[] = [
  {
    itens: [
      { href: '/admin', icone: 'dashboard', texto: 'Visão geral' },
      { href: '/admin/perfil', icone: 'person', texto: 'Meu perfil' },
    ],
  },
  {
    titulo: 'Conteúdo',
    itens: [
      { href: '/admin/cursos', icone: 'menu_book', texto: 'Cursos e aulas', permissao: 'conteudo.agir' },
      { href: '/admin/blog', icone: 'description', texto: 'Blog', permissao: 'conteudo.agir' },
      { href: '/admin/vagas', icone: 'work', texto: 'Mural de vagas', permissao: 'conteudo.agir' },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { href: '/admin/usuarios', icone: 'badge', texto: 'Usuários', permissao: 'cadastros.ver' },
      { href: '/admin/alunos', icone: 'group', texto: 'Alunos', permissao: 'cadastros.ver' },
      { href: '/admin/portais', icone: 'public', texto: 'Portais de professor', permissao: 'cadastros.ver' },
      { href: '/admin/empresas', icone: 'handshake', texto: 'Empresas & RH', permissao: 'cadastros.ver' },
      { href: '/admin/portais/pagina-da-universidade', icone: 'web', texto: 'Página das universidades', permissao: 'conteudo.agir' },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { href: '/admin/financeiro', icone: 'account_balance', texto: 'Financeiro', permissao: 'financeiro.ver' },
      { href: '/admin/precos', icone: 'payments', texto: 'Preços', permissao: 'financeiro.ver' },
      { href: '/admin/licencas', icone: 'verified_user', texto: 'Licenças', permissao: 'cadastros.ver' },
    ],
  },
  {
    titulo: 'Sai da administração',
    itens: [
      { href: '/painel', icone: 'school', texto: 'Área do aluno', saiDoPainel: true },
      { href: '/', icone: 'arrow_forward', texto: 'Ver o site', saiDoPainel: true },
    ],
  },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  // Guarda única do painel: qualquer rota sob /admin passa por aqui.
  // Entra quem tem papel de operação; o que cada um pode fazer lá dentro
  // é decidido tela a tela e ação a ação.
  const u = await exigirEquipe();
  if (!u) {
    // Distingue os dois casos: quem não está logado precisa entrar; quem
    // está logado sem o papel precisa saber que não tem acesso, e não ser
    // jogado numa tela de login que o devolveria ao painel sem explicação.
    const logado = await alunoAtual();
    redirect(logado ? '/painel?sem-acesso=1' : '/entrar?destino=/admin');
  }

  const grupos: GrupoLateral[] = GRUPOS
    .map((g) => ({
      titulo: g.titulo,
      itens: g.itens
        .filter((i) => !i.permissao || pode(u.papel, i.permissao))
        .map(({ permissao: _permissao, ...item }) => item),
    }))
    .filter((g) => g.itens.length > 0);

  return (
    <div className="app">
      <BarraLateral
        titulo="Painel Admin"
        subtitulo={ROTULO_PAPEL[u.papel] ?? 'Administração da plataforma'}
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
        <BotaoSair className="sair-topo" />
        <div className="miolo">{children}</div>
      </div>
    </div>
  );
}
