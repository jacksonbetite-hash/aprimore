import { redirect } from 'next/navigation';
import BarraLateral, { type GrupoLateral } from '../BarraLateral.tsx';
import { Icone } from '../componentes.tsx';
import { sair } from '../acoes-auth.ts';
import { alunoAtual, exigirAdmin } from '../../lib/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * O menu da retaguarda, em três grupos: o que se opera todo dia
 * (indicadores), o que se publica (§5.5, §5.7.1 e o catálogo) e o que é
 * comercial (§5.9, §5.10). Agrupar não é enfeite — com dez itens numa
 * lista corrida, ninguém acha o que procura.
 *
 * O último grupo sai do painel, e é dito com todas as letras: lá a barra
 * lateral do admin não existe, e o usuário precisa saber disso antes de
 * clicar, não depois.
 */
const GRUPOS: GrupoLateral[] = [
  {
    itens: [
      { href: '/admin', icone: 'dashboard', texto: 'Visão geral' },
      { href: '/admin/perfil', icone: 'person', texto: 'Meu perfil' },
    ],
  },
  {
    titulo: 'Conteúdo',
    itens: [
      { href: '/admin/cursos', icone: 'menu_book', texto: 'Cursos e aulas' },
      { href: '/admin/blog', icone: 'description', texto: 'Blog' },
      { href: '/admin/vagas', icone: 'work', texto: 'Mural de vagas' },
    ],
  },
  {
    titulo: 'Comercial',
    itens: [
      { href: '/admin/precos', icone: 'payments', texto: 'Preços' },
      { href: '/admin/licencas', icone: 'verified_user', texto: 'Licenças' },
      { href: '/admin/alunos', icone: 'group', texto: 'Alunos' },
      { href: '/admin/portais', icone: 'public', texto: 'Portais de professor' },
      { href: '/admin/empresas', icone: 'handshake', texto: 'Empresas & RH' },
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
  const u = await exigirAdmin();
  if (!u) {
    // Distingue os dois casos: quem não está logado precisa entrar; quem
    // está logado sem o papel precisa saber que não tem acesso, e não ser
    // jogado numa tela de login que o devolveria ao painel sem explicação.
    const logado = await alunoAtual();
    redirect(logado ? '/painel?sem-acesso=1' : '/entrar?destino=/admin');
  }

  return (
    <div className="app">
      <BarraLateral
        titulo="Painel Admin"
        subtitulo="Administração da plataforma"
        grupos={GRUPOS}
        rodape={
          <form action={sair}>
            <button className="item-lateral saida" type="submit">
              <Icone nome="logout" /> Sair
            </button>
          </form>
        }
      />
      <div className="conteudo"><div className="miolo">{children}</div></div>
    </div>
  );
}
