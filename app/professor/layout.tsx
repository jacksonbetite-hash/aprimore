import { redirect } from 'next/navigation';
import BarraLateral, { type GrupoLateral } from '../BarraLateral.tsx';
import { Icone } from '../componentes.tsx';
import { sair } from '../acoes-auth.ts';
import { alunoAtual } from '../../lib/sessao.ts';
import { portalDoProfessor } from '../../lib/professor.ts';
import { portalIdAtual, enderecoDoPortal } from '../../lib/portal-consultas.ts';

export const dynamic = 'force-dynamic';

/**
 * O painel do professor — §5.10: autonomia para gerir site, acervo,
 * alunos e faturamento. Vive no site principal (o professor é usuário da
 * plataforma) e só abre para quem tem um portal.
 */
export default async function LayoutProfessor({ children }: { children: React.ReactNode }) {
  if ((await portalIdAtual()) !== 0) redirect('/');
  const u = await alunoAtual();
  if (!u) redirect('/entrar?destino=/professor');
  if (u.papel !== 'professor' && u.papel !== 'admin') redirect('/painel?sem-acesso=1');
  const portal = await portalDoProfessor(u.id);
  if (!portal) redirect('/para-professores');

  const endereco = await enderecoDoPortal(portal.mascara);
  const GRUPOS: GrupoLateral[] = [
    {
      itens: [
        { href: '/professor', icone: 'dashboard', texto: 'Visão geral' },
        { href: '/professor/perfil', icone: 'person', texto: 'Meu perfil' },
      ],
    },
    {
      titulo: 'Meu portal',
      itens: [
        { href: '/professor/site', icone: 'web', texto: 'Minha página' },
        { href: '/professor/cursos', icone: 'menu_book', texto: 'Cursos e aulas' },
        { href: '/professor/alunos', icone: 'group', texto: 'Alunos' },
        { href: '/professor/financeiro', icone: 'payments', texto: 'Financeiro' },
      ],
    },
    {
      titulo: 'Sai do painel',
      itens: [
        { href: endereco, icone: 'public', texto: 'Ver meu portal', saiDoPainel: true },
        { href: '/', icone: 'arrow_forward', texto: 'Site principal', saiDoPainel: true },
      ],
    },
  ];

  return (
    <div className="app">
      <BarraLateral
        titulo={portal.nomeExibicao}
        subtitulo="Painel do professor"
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
